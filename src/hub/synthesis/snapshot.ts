/**
 * Contrat de la synthèse publiée au tableau de bord (sérialisée en JSON sur WebSocket).
 * Fichier de types uniquement, sans dépendance à Node : le front l'importe aussi,
 * back et front partagent donc la même définition.
 */
import type { MetricName } from './metrics';

export type Severity = 'warning' | 'critical';

export type DeviceStatus = 'ok' | 'warning' | 'critical' | 'offline';
export type EventLevel = 'info' | Severity;

export interface ReceptionView {
  /** Datagrammes reçus sur le socket, valides ou non. */
  datagrams: number;
  valid: number;
  invalid: number;
  /** Clés : codes DecodeError (TOO_SHORT, BAD_CHECKSUM…). */
  invalidByReason: Record<string, number>;
  /** Trames valides retenues par le séquenceur. */
  accepted: number;
  duplicates: number;
  late: number;
  /** Trous de séquence : trames jamais acceptées. */
  lost: number;
  restarts: number;
  /** lost / (accepted + lost), entre 0 et 1. */
  lossRate: number;
  framesPerSec: number;
}

export interface AlertView {
  deviceId: number;
  ruleId: string;
  label: string;
  severity: Severity;
  metric: MetricName;
  value: number;
  threshold: number;
  breachSince: number;
}

export interface DeviceView {
  deviceId: number;
  status: DeviceStatus;
  lastSeenAt: number;
  seq: number;
  uptimeMs: number;
  temperature: number | null;
  voltage: number | null;
  current: number | null;
  accepted: number;
  lost: number;
  duplicates: number;
  late: number;
  restarts: number;
  alerts: AlertView[];
}

export interface FleetView {
  total: number;
  byStatus: Record<DeviceStatus, number>;
  maxTemperature: { deviceId: number; value: number } | null;
  averageTemperature: number | null;
}

export interface HubEvent {
  at: number;
  level: EventLevel;
  deviceId: number;
  message: string;
}

export interface HubSnapshot {
  generatedAt: number;
  hubStartedAt: number;
  reception: ReceptionView;
  fleet: FleetView;
  devices: DeviceView[];
  alerts: AlertView[];
  events: HubEvent[];
}
