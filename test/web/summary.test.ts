import { describe, expect, it } from 'vitest';
import type { HubSnapshot } from '../../src/hub/synthesis/snapshot';
import { EMPTY_SNAPSHOT } from '../../web/src/hub-state';
import { summarize } from '../../web/src/summary';

function withFleet(byStatus: HubSnapshot['fleet']['byStatus'], alerts: HubSnapshot['alerts'] = []): HubSnapshot {
  const total = byStatus.ok + byStatus.warning + byStatus.critical + byStatus.offline;
  return { ...EMPTY_SNAPSHOT, fleet: { ...EMPTY_SNAPSHOT.fleet, total, byStatus }, alerts };
}

describe('summarize', () => {
  it('attend le hub tant que la connexion n’est pas ouverte', () => {
    expect(summarize(EMPTY_SNAPSHOT, 'connecting').tone).toBe('idle');
  });

  it('attend les appareils quand la flotte est vide', () => {
    expect(summarize(EMPTY_SNAPSHOT, 'open').title).toBe('En attente des appareils');
  });

  it('dit « Tout va bien » quand tous les appareils sont OK', () => {
    expect(summarize(withFleet({ ok: 50, warning: 0, critical: 0, offline: 0 }), 'open')).toMatchObject({
      tone: 'ok',
      title: 'Tout va bien',
      image: 'ok',
    });
  });

  it('met le danger en avant et nomme le problème', () => {
    const alert = { deviceId: 1, ruleId: 'overheat', label: 'Surchauffe', severity: 'critical', metric: 'temperature', value: 75, threshold: 70, breachSince: 0, advice: null } as const;
    const summary = summarize(withFleet({ ok: 46, warning: 0, critical: 2, offline: 2 }, [alert]), 'open');

    expect(summary).toMatchObject({ tone: 'critical', title: '2 appareils en danger', image: 'critical' });
    expect(summary.detail).toContain('surchauffe');
  });

  it('signale les appareils muets sans parler de danger', () => {
    expect(summarize(withFleet({ ok: 49, warning: 0, critical: 0, offline: 1 }), 'open')).toMatchObject({
      tone: 'warning',
      title: '1 appareil ne répond plus',
      image: 'offline',
    });
  });
});
