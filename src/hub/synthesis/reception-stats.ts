import type { DecodeError } from '../../protocol/decoder';
import type { SequenceVerdict } from '../sequencer';
import type { ReceptionView } from './snapshot';

/** Compteurs de santé de la réception : décodage puis séquencement. */
export class ReceptionStats {
  private datagrams = 0;
  private valid = 0;
  private readonly invalidByReason = new Map<DecodeError, number>();
  private accepted = 0;
  private duplicates = 0;
  private late = 0;
  private lost = 0;
  private restarts = 0;

  recordInvalid(reason: DecodeError): void {
    this.datagrams++;
    this.invalidByReason.set(reason, (this.invalidByReason.get(reason) ?? 0) + 1);
  }

  recordValid(verdict: SequenceVerdict): void {
    this.datagrams++;
    this.valid++;
    switch (verdict.kind) {
      case 'duplicate':
        this.duplicates++;
        return;
      case 'late':
        this.late++;
        return;
      case 'next':
        this.lost += verdict.lost;
        break;
      case 'restart':
        this.restarts++;
        break;
      case 'first':
        break;
    }
    this.accepted++;
  }

  datagramCount(): number {
    return this.datagrams;
  }

  view(framesPerSec: number): ReceptionView {
    const expected = this.accepted + this.lost;
    return {
      datagrams: this.datagrams,
      valid: this.valid,
      invalid: this.datagrams - this.valid,
      invalidByReason: Object.fromEntries(this.invalidByReason),
      accepted: this.accepted,
      duplicates: this.duplicates,
      late: this.late,
      lost: this.lost,
      restarts: this.restarts,
      lossRate: expected === 0 ? 0 : this.lost / expected,
      framesPerSec,
    };
  }
}
