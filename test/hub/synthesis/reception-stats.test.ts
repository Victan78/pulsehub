import { describe, expect, it } from 'vitest';
import { ReceptionStats } from '../../../src/hub/synthesis/reception-stats';

describe('ReceptionStats', () => {
  it('démarre à zéro partout', () => {
    expect(new ReceptionStats().view(0)).toEqual({
      datagrams: 0,
      valid: 0,
      invalid: 0,
      invalidByReason: {},
      accepted: 0,
      duplicates: 0,
      late: 0,
      lost: 0,
      restarts: 0,
      lossRate: 0,
      framesPerSec: 0,
    });
  });

  it('compte les invalides par motif', () => {
    const stats = new ReceptionStats();
    stats.recordInvalid('BAD_CHECKSUM');
    stats.recordInvalid('BAD_CHECKSUM');
    stats.recordInvalid('TOO_SHORT');

    expect(stats.view(0)).toMatchObject({
      datagrams: 3,
      invalid: 3,
      invalidByReason: { BAD_CHECKSUM: 2, TOO_SHORT: 1 },
    });
  });

  it('ventile les trames valides selon la décision du séquenceur', () => {
    const stats = new ReceptionStats();
    stats.recordValid({ kind: 'first' });
    stats.recordValid({ kind: 'next', lost: 0 });
    stats.recordValid({ kind: 'duplicate' });
    stats.recordValid({ kind: 'next', lost: 2 });
    stats.recordValid({ kind: 'late' });
    stats.recordValid({ kind: 'restart' });

    expect(stats.view(0)).toMatchObject({
      datagrams: 6,
      valid: 6,
      accepted: 4,
      duplicates: 1,
      late: 1,
      lost: 2,
      restarts: 1,
      lossRate: 2 / 6,
    });
  });
});
