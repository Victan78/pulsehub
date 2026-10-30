import { describe, expect, it } from 'vitest';
import { Sequencer, isAccepted } from '../../src/hub/sequencer';

const PERIOD_MS = 50;

function sequencer() {
  const s = new Sequencer({ restartToleranceMs: 5000 });
  // uptime cohérent avec seq : un appareil à 20 Hz démarré depuis longtemps
  const check = (seq: number, deviceId = 1, uptimeMs = 60_000 + seq * PERIOD_MS) =>
    s.check({ deviceId, seq, uptimeMs }).kind;
  return { s, check };
}

describe('Sequencer', () => {
  it('rejoue le scénario du sujet : 1, 2, 3, 3, 5, 4', () => {
    const s = new Sequencer({ restartToleranceMs: 5000 });
    const verdicts = [1, 2, 3, 3, 5, 4].map((seq) => s.check({ deviceId: 1, seq, uptimeMs: 60_000 + seq * 50 }));

    expect(verdicts).toEqual([
      { kind: 'first' },
      { kind: 'next', lost: 0 },
      { kind: 'next', lost: 0 },
      { kind: 'duplicate' },
      { kind: 'next', lost: 1 },
      { kind: 'late' },
    ]);
    expect(verdicts.map(isAccepted)).toEqual([true, true, true, false, true, false]);
  });

  it('suit chaque appareil indépendamment', () => {
    const { check } = sequencer();
    expect([check(10, 1), check(10, 2), check(11, 1), check(10, 2)]).toEqual(['first', 'first', 'next', 'duplicate']);
  });

  it('compte toutes les trames sautées dans un trou', () => {
    const { s } = sequencer();
    s.check({ deviceId: 1, seq: 100, uptimeMs: 10_000 });
    expect(s.check({ deviceId: 1, seq: 110, uptimeMs: 10_500 })).toEqual({ kind: 'next', lost: 9 });
  });

  it('gère le retour à zéro de seq (uint32)', () => {
    const { s } = sequencer();
    s.check({ deviceId: 1, seq: 0xfffffffe, uptimeMs: 10_000 });
    expect(s.check({ deviceId: 1, seq: 0xffffffff, uptimeMs: 10_050 })).toEqual({ kind: 'next', lost: 0 });
    expect(s.check({ deviceId: 1, seq: 0, uptimeMs: 10_100 })).toEqual({ kind: 'next', lost: 0 });
    expect(s.check({ deviceId: 1, seq: 2, uptimeMs: 10_200 })).toEqual({ kind: 'next', lost: 1 });
    // une trame d'avant le passage par zéro est bien en retard, pas en avance
    expect(s.check({ deviceId: 1, seq: 0xffffffff, uptimeMs: 10_050 })).toEqual({ kind: 'late' });
  });

  it('détecte un redémarrage (uptime revenu à 0) et repart de la nouvelle séquence', () => {
    const { s } = sequencer();
    s.check({ deviceId: 1, seq: 5000, uptimeMs: 250_000 });

    expect(s.check({ deviceId: 1, seq: 1, uptimeMs: 0 })).toEqual({ kind: 'restart' });
    expect(s.check({ deviceId: 1, seq: 2, uptimeMs: 50 })).toEqual({ kind: 'next', lost: 0 });
  });

  it("ne confond pas une trame en retard avec un redémarrage", () => {
    const { s } = sequencer();
    s.check({ deviceId: 1, seq: 10, uptimeMs: 20_000 });
    expect(s.check({ deviceId: 1, seq: 9, uptimeMs: 19_950 })).toEqual({ kind: 'late' });
  });
});
