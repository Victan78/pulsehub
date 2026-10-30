import { describe, expect, it } from 'vitest';
import type { AlertView, DeviceView } from '../../src/hub/synthesis/snapshot';
import { OFFLINE_ADVICE, byUrgency, listProblems } from '../../web/src/problems';

function device(deviceId: number, status: DeviceView['status'], alerts: AlertView[] = [], lastSeenAt = 0): DeviceView {
  return { deviceId, status, alerts, lastSeenAt } as DeviceView;
}

function alert(deviceId: number, ruleId: string, severity: AlertView['severity'], breachSince: number): AlertView {
  return {
    deviceId,
    ruleId,
    label: ruleId,
    severity,
    metric: 'temperature',
    value: 80,
    threshold: 70,
    breachSince,
    advice: `consigne ${ruleId}`,
  };
}

describe('listProblems', () => {
  it('ignore les appareils OK', () => {
    expect(listProblems([device(1, 'ok'), device(2, 'ok')])).toEqual([]);
  });

  it('ne garde qu’une ligne par appareil, avec l’alerte la plus grave et sa consigne', () => {
    const [problem] = listProblems([
      device(1, 'critical', [alert(1, 'hot', 'warning', 0), alert(1, 'overheat', 'critical', 3000)]),
    ]);

    expect(problem).toMatchObject({ deviceId: 1, title: 'overheat', otherAlerts: 1, advice: 'consigne overheat' });
  });

  it('inclut les appareils muets avec une consigne', () => {
    expect(listProblems([device(49, 'offline', [], 1234)])).toEqual([
      expect.objectContaining({ deviceId: 49, title: 'Ne répond plus', advice: OFFLINE_ADVICE, since: 1234 }),
    ]);
  });

  it('classe danger, puis muet, puis à surveiller', () => {
    const problems = listProblems([
      device(1, 'warning', [alert(1, 'hot', 'warning', 0)]),
      device(2, 'offline'),
      device(3, 'critical', [alert(3, 'overheat', 'critical', 0)]),
    ]);

    expect(problems.map((p) => p.deviceId)).toEqual([3, 2, 1]);
  });
});

describe('byUrgency', () => {
  it('fait remonter les appareils en difficulté puis garde l’ordre des numéros', () => {
    const sorted = [device(1, 'ok'), device(2, 'warning'), device(3, 'offline'), device(4, 'ok'), device(5, 'critical')].sort(
      byUrgency,
    );

    expect(sorted.map((d) => d.deviceId)).toEqual([5, 3, 2, 1, 4]);
  });
});
