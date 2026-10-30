import { describe, expect, it } from 'vitest';
import { FrameType, MetricId } from '../../../src/protocol/constants';
import type { Frame } from '../../../src/protocol/types';
import { AlertEngine } from '../../../src/hub/synthesis/alert-engine';
import { EventLog } from '../../../src/hub/synthesis/event-log';
import { Fleet, summarizeFleet } from '../../../src/hub/synthesis/fleet';
import type { DeviceView } from '../../../src/hub/synthesis/snapshot';

function telemetry(deviceId: number, seq: number, temperatureCenti: number): Frame {
  return {
    type: FrameType.TELEMETRY,
    deviceId,
    seq,
    uptimeMs: seq * 50,
    measurements: [
      { metricId: MetricId.TEMPERATURE, value: temperatureCenti },
      { metricId: MetricId.VOLTAGE, value: 24000 },
      { metricId: MetricId.CURRENT, value: 3500 },
    ],
  };
}

function setup() {
  const events = new EventLog(10);
  const alerts = new AlertEngine([
    { id: 'overheat', label: 'Surchauffe', metric: 'temperature', condition: 'above', threshold: 70, forMs: 3000, severity: 'critical' },
  ]);
  return { fleet: new Fleet({ offlineAfterMs: 2000 }, alerts, events), events };
}

describe('Fleet', () => {
  it('convertit les mesures en unités lisibles (°C, V, A)', () => {
    const { fleet } = setup();
    fleet.record(telemetry(1, 1, 4250), { kind: 'first' }, 0);

    expect(fleet.deviceViews()[0]).toMatchObject({ deviceId: 1, status: 'ok', temperature: 42.5, voltage: 24, current: 3.5 });
  });

  it('passe en critique après 3 s au-dessus de 70 °C et le journalise', () => {
    const { fleet, events } = setup();
    for (let t = 0; t <= 3000; t += 50) fleet.record(telemetry(1, t / 50 + 1, 7200), { kind: 'next', lost: 0 }, t);

    const [device] = fleet.deviceViews();
    expect(device!.status).toBe('critical');
    expect(device!.alerts).toMatchObject([{ ruleId: 'overheat', value: 72 }]);
    expect(events.recent()[0]).toMatchObject({ level: 'critical', deviceId: 1 });
  });

  it('déclare hors ligne un appareil silencieux, puis de nouveau en ligne', () => {
    const { fleet, events } = setup();
    fleet.record(telemetry(1, 1, 4000), { kind: 'first' }, 0);

    fleet.detectOffline(2000);
    expect(fleet.deviceViews()[0]!.status).toBe('ok');
    fleet.detectOffline(2001);
    expect(fleet.deviceViews()[0]!.status).toBe('offline');

    fleet.record(telemetry(1, 2, 4000), { kind: 'next', lost: 0 }, 3000);
    expect(fleet.deviceViews()[0]!.status).toBe('ok');
    expect(events.recent().map((e) => e.message)).toEqual([
      'Appareil 1 de nouveau en ligne',
      'Appareil 1 hors ligne',
    ]);
  });

  it('compte les valeurs anormales ponctuelles (règle sans durée), même si l’alerte retombe aussitôt', () => {
    const events = new EventLog(10);
    const alerts = new AlertEngine([
      { id: 'undervoltage', label: 'Sous-tension', metric: 'voltage', condition: 'below', threshold: 22, forMs: 0, severity: 'critical' },
      { id: 'overheat', label: 'Surchauffe', metric: 'temperature', condition: 'above', threshold: 70, forMs: 3000, severity: 'critical' },
    ]);
    const fleet = new Fleet({ offlineAfterMs: 2000 }, alerts, events);
    const spike: Frame = { ...telemetry(1, 2, 4000), measurements: [{ metricId: MetricId.VOLTAGE, value: 0 }] };

    fleet.record(telemetry(1, 1, 4000), { kind: 'first' }, 0);
    fleet.record(spike, { kind: 'next', lost: 0 }, 50);
    fleet.record(telemetry(1, 3, 4000), { kind: 'next', lost: 0 }, 100);
    for (let t = 150; t <= 3500; t += 50) fleet.record(telemetry(1, t / 50 + 1, 7500), { kind: 'next', lost: 0 }, t);

    expect(fleet.anomalyCount()).toBe(1);
  });

  it('un doublon ou une trame en retard ne met pas à jour les valeurs', () => {
    const { fleet } = setup();
    fleet.record(telemetry(1, 5, 4000), { kind: 'first' }, 0);
    fleet.record(telemetry(1, 4, 9000), { kind: 'late' }, 50);
    fleet.record(telemetry(1, 5, 9000), { kind: 'duplicate' }, 50);

    expect(fleet.deviceViews()[0]).toMatchObject({ temperature: 40, late: 1, duplicates: 1, accepted: 1 });
  });
});

describe('summarizeFleet', () => {
  const view = (deviceId: number, status: DeviceView['status'], temperature: number | null) =>
    ({ deviceId, status, temperature }) as DeviceView;

  it('est vide au démarrage', () => {
    expect(summarizeFleet([], 0)).toEqual({
      total: 0,
      byStatus: { ok: 0, warning: 0, critical: 0, offline: 0 },
      anomalies: 0,
      maxTemperature: null,
      averageTemperature: null,
    });
  });

  it('compte par statut et ignore la dernière valeur connue des appareils hors ligne', () => {
    const summary = summarizeFleet([view(1, 'ok', 40), view(2, 'critical', 80), view(3, 'offline', 95), view(4, 'ok', 30)], 0);

    expect(summary.byStatus).toEqual({ ok: 2, warning: 0, critical: 1, offline: 1 });
    expect(summary.maxTemperature).toEqual({ deviceId: 2, value: 80 });
    expect(summary.averageTemperature).toBe(50);
  });
});
