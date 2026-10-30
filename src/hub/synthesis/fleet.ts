import type { Frame } from '../../protocol/types';
import type { SequenceVerdict } from '../sequencer';
import type { ActiveAlert, AlertEngine, AlertTransition } from './alert-engine';
import type { EventLog } from './event-log';
import { toReadings, type Readings } from './metrics';
import type { AlertView, DeviceStatus, DeviceView, FleetView } from './snapshot';

export interface FleetOptions {
  /** Sans trame acceptée depuis ce délai, l'appareil est déclaré hors ligne. */
  offlineAfterMs: number;
}

interface DeviceRecord {
  deviceId: number;
  lastSeenAt: number;
  offline: boolean;
  seq: number;
  uptimeMs: number;
  readings: Readings;
  accepted: number;
  lost: number;
  duplicates: number;
  late: number;
  restarts: number;
}

const UNITS = { temperature: '°C', voltage: 'V', current: 'A' } as const;
const formatNumber = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format;

/**
 * État de la flotte : dernières valeurs, compteurs et statut de chaque appareil.
 * Les alertes sont déléguées à l'AlertEngine, la traçabilité à l'EventLog (injectés).
 */
export class Fleet {
  private readonly options: FleetOptions;
  private readonly alerts: AlertEngine;
  private readonly events: EventLog;
  private readonly devices = new Map<number, DeviceRecord>();
  private anomalies = 0;

  constructor(options: FleetOptions, alerts: AlertEngine, events: EventLog) {
    this.options = options;
    this.alerts = alerts;
    this.events = events;
  }

  /** Enregistre une trame valide et la décision du séquenceur la concernant. */
  record(frame: Frame, verdict: SequenceVerdict, now: number): void {
    const device = this.devices.get(frame.deviceId) ?? this.register(frame.deviceId, now);

    if (verdict.kind === 'duplicate') {
      device.duplicates++;
      return;
    }
    if (verdict.kind === 'late') {
      device.late++;
      return;
    }

    if (verdict.kind === 'next') device.lost += verdict.lost;
    if (verdict.kind === 'restart') {
      device.restarts++;
      this.alerts.reset(frame.deviceId);
      this.log(now, 'info', frame.deviceId, `Appareil ${frame.deviceId} redémarré`);
    }
    if (device.offline) {
      device.offline = false;
      this.log(now, 'info', frame.deviceId, `Appareil ${frame.deviceId} de nouveau en ligne`);
    }

    device.accepted++;
    device.lastSeenAt = now;
    device.seq = frame.seq;
    device.uptimeMs = frame.uptimeMs;

    const readings = toReadings(frame.measurements);
    Object.assign(device.readings, readings);
    this.alerts.evaluate(frame.deviceId, readings, now).forEach((t) => this.logAlert(frame.deviceId, t, now));
  }

  /** Déclare hors ligne les appareils silencieux depuis trop longtemps. */
  detectOffline(now: number): void {
    for (const device of this.devices.values()) {
      if (!device.offline && now - device.lastSeenAt > this.options.offlineAfterMs) {
        device.offline = true;
        this.log(now, 'critical', device.deviceId, `Appareil ${device.deviceId} hors ligne`);
      }
    }
  }

  /**
   * Nombre de valeurs anormales vues depuis le démarrage : alertes levées par une règle sans durée.
   * Un pic d'une seule trame retombe en 50 ms ; ce compteur garde la trace qu'il a eu lieu.
   */
  anomalyCount(): number {
    return this.anomalies;
  }

  deviceViews(): DeviceView[] {
    return [...this.devices.values()]
      .sort((a, b) => a.deviceId - b.deviceId)
      .map((device) => {
        const alerts = this.alerts.active(device.deviceId).map((a) => toAlertView(device.deviceId, a));
        return {
          deviceId: device.deviceId,
          status: statusOf(device, alerts),
          lastSeenAt: device.lastSeenAt,
          seq: device.seq,
          uptimeMs: device.uptimeMs,
          temperature: device.readings.temperature ?? null,
          voltage: device.readings.voltage ?? null,
          current: device.readings.current ?? null,
          accepted: device.accepted,
          lost: device.lost,
          duplicates: device.duplicates,
          late: device.late,
          restarts: device.restarts,
          alerts,
        };
      });
  }

  private register(deviceId: number, now: number): DeviceRecord {
    const device: DeviceRecord = {
      deviceId,
      lastSeenAt: now,
      offline: false,
      seq: 0,
      uptimeMs: 0,
      readings: {},
      accepted: 0,
      lost: 0,
      duplicates: 0,
      late: 0,
      restarts: 0,
    };
    this.devices.set(deviceId, device);
    return device;
  }

  /** Seules les alertes levées vont au journal : l'état courant est visible dans la liste des alertes actives. */
  private logAlert(deviceId: number, transition: AlertTransition, now: number): void {
    if (transition.type !== 'raised') return;
    const { rule, value } = transition.alert;
    if (rule.forMs === 0) this.anomalies++;
    const unit = UNITS[rule.metric];
    const duration = rule.forMs > 0 ? ` depuis ${rule.forMs / 1000} s` : '';
    this.log(
      now,
      rule.severity,
      deviceId,
      `${rule.label} sur l'appareil ${deviceId} : ${formatNumber(value)} ${unit}${duration} (seuil ${formatNumber(rule.threshold)} ${unit})`,
    );
  }

  private log(at: number, level: 'info' | 'warning' | 'critical', deviceId: number, message: string): void {
    this.events.push({ at, level, deviceId, message });
  }
}

/** Synthèse globale à partir des vues appareil (fonction pure, testée isolément). */
export function summarizeFleet(devices: DeviceView[], anomalies: number): FleetView {
  const byStatus: Record<DeviceStatus, number> = { ok: 0, warning: 0, critical: 0, offline: 0 };
  let maxTemperature: FleetView['maxTemperature'] = null;
  let temperatureSum = 0;
  let temperatureCount = 0;

  for (const device of devices) {
    byStatus[device.status]++;
    if (device.status === 'offline' || device.temperature === null) continue;
    temperatureSum += device.temperature;
    temperatureCount++;
    if (!maxTemperature || device.temperature > maxTemperature.value) {
      maxTemperature = { deviceId: device.deviceId, value: device.temperature };
    }
  }

  return {
    total: devices.length,
    byStatus,
    anomalies,
    maxTemperature,
    averageTemperature: temperatureCount === 0 ? null : temperatureSum / temperatureCount,
  };
}

function statusOf(device: DeviceRecord, alerts: AlertView[]): DeviceStatus {
  if (device.offline) return 'offline';
  if (alerts.some((a) => a.severity === 'critical')) return 'critical';
  if (alerts.length > 0) return 'warning';
  return 'ok';
}

function toAlertView(deviceId: number, alert: ActiveAlert): AlertView {
  return {
    deviceId,
    ruleId: alert.rule.id,
    label: alert.rule.label,
    severity: alert.rule.severity,
    metric: alert.rule.metric,
    value: alert.value,
    threshold: alert.rule.threshold,
    breachSince: alert.breachSince,
    advice: alert.rule.advice ?? null,
  };
}
