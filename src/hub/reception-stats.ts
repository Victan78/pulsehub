import type { DecodeError } from '../protocol/decoder';

export interface ReceptionSnapshot {
  datagrams: number;
  valid: number;
  invalid: number;
  invalidByReason: Partial<Record<DecodeError, number>>;
}

/** Compteurs de santé de la réception, alimentés après le décodage. */
export class ReceptionStats {
  private datagrams = 0;
  private valid = 0;
  private readonly invalidByReason = new Map<DecodeError, number>();

  recordValid(): void {
    this.datagrams++;
    this.valid++;
  }

  recordInvalid(reason: DecodeError): void {
    this.datagrams++;
    this.invalidByReason.set(reason, (this.invalidByReason.get(reason) ?? 0) + 1);
  }

  snapshot(): ReceptionSnapshot {
    return {
      datagrams: this.datagrams,
      valid: this.valid,
      invalid: this.datagrams - this.valid,
      invalidByReason: Object.fromEntries(this.invalidByReason),
    };
  }
}
