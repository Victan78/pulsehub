import { describe, expect, it } from 'vitest';
import { ReceptionStats } from '../../src/hub/reception-stats';

describe('ReceptionStats', () => {
  it('démarre à zéro partout', () => {
    expect(new ReceptionStats().snapshot()).toEqual({ datagrams: 0, valid: 0, invalid: 0, invalidByReason: {} });
  });

  it('compte les trames valides et les invalides par motif', () => {
    const stats = new ReceptionStats();
    stats.recordValid();
    stats.recordValid();
    stats.recordInvalid('BAD_CHECKSUM');
    stats.recordInvalid('BAD_CHECKSUM');
    stats.recordInvalid('TOO_SHORT');

    expect(stats.snapshot()).toEqual({
      datagrams: 5,
      valid: 2,
      invalid: 3,
      invalidByReason: { BAD_CHECKSUM: 2, TOO_SHORT: 1 },
    });
  });
});
