import type { Frame } from '../protocol/types';

const UINT32_RANGE = 2 ** 32;
const HALF_RANGE = 2 ** 31;

/**
 * Décision du séquenceur pour une trame valide :
 * - `first`     : premier contact avec l'appareil ;
 * - `next`      : trame plus récente que la dernière acceptée (`lost` trames sautées) ;
 * - `duplicate` : même seq que la dernière acceptée ;
 * - `late`      : seq déjà dépassé (arrivée en retard) ;
 * - `restart`   : l'appareil a redémarré (uptime revenu en arrière), on repart de zéro.
 */
export type SequenceVerdict =
  | { kind: 'first' }
  | { kind: 'next'; lost: number }
  | { kind: 'duplicate' }
  | { kind: 'late' }
  | { kind: 'restart' };

export function isAccepted(verdict: SequenceVerdict): boolean {
  return verdict.kind !== 'duplicate' && verdict.kind !== 'late';
}

export interface SequencerOptions {
  /**
   * Recul d'uptime toléré avant de conclure à un redémarrage. Une trame en retard a un
   * uptime légèrement inférieur (quelques périodes d'émission) ; un redémarrage le ramène près de 0.
   */
  restartToleranceMs: number;
}

interface LastAccepted {
  seq: number;
  uptimeMs: number;
}

/**
 * Séquencement par appareil. La comparaison des seq utilise l'arithmétique des numéros
 * de série (RFC 1982) : l'écart est calculé modulo 2^32, ce qui gère le retour à zéro du compteur.
 * Un écart dans la moitié « avant » de l'espace est une avance, dans la moitié « arrière » un retard.
 */
export class Sequencer {
  private readonly options: SequencerOptions;
  private readonly lastAccepted = new Map<number, LastAccepted>();

  constructor(options: SequencerOptions) {
    this.options = options;
  }

  check(frame: Pick<Frame, 'deviceId' | 'seq' | 'uptimeMs'>): SequenceVerdict {
    const previous = this.lastAccepted.get(frame.deviceId);
    if (!previous) {
      this.accept(frame);
      return { kind: 'first' };
    }

    if (frame.uptimeMs + this.options.restartToleranceMs < previous.uptimeMs) {
      this.accept(frame);
      return { kind: 'restart' };
    }

    const distance = (frame.seq - previous.seq + UINT32_RANGE) % UINT32_RANGE;
    if (distance === 0) return { kind: 'duplicate' };
    if (distance >= HALF_RANGE) return { kind: 'late' };

    this.accept(frame);
    return { kind: 'next', lost: distance - 1 };
  }

  private accept(frame: Pick<Frame, 'deviceId' | 'seq' | 'uptimeMs'>): void {
    this.lastAccepted.set(frame.deviceId, { seq: frame.seq, uptimeMs: frame.uptimeMs });
  }
}
