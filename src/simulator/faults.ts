import { MetricId } from '../protocol/constants';
import type { Frame, Measurement } from '../protocol/types';
import { chance, type Random } from '../shared/random';

/** Probabilité (0 à 1) d'appliquer chaque défaut à une trame. */
export interface FaultRates {
  badChecksum: number;
  duplicate: number;
  reorder: number;
  drop: number;
  anomaly: number;
}

export const NO_FAULTS: FaultRates = { badChecksum: 0, duplicate: 0, reorder: 0, drop: 0, anomaly: 0 };

/** Valeurs physiquement aberrantes mais encodables (int16) : la trame reste valide. */
const ANOMALIES: Measurement[] = [
  { metricId: MetricId.TEMPERATURE, value: 12000 }, // 120 °C
  { metricId: MetricId.TEMPERATURE, value: -4000 }, // -40 °C
  { metricId: MetricId.VOLTAGE, value: 0 }, // coupure d'alimentation
  { metricId: MetricId.VOLTAGE, value: 32000 }, // surtension
  { metricId: MetricId.CURRENT, value: 30000 }, // surintensité
];

/**
 * Injecte les défauts demandés. Deux niveaux distincts :
 * - `corruptValues` agit sur le contenu (valeur anormale, trame techniquement valide) ;
 * - `transmit` agit sur le transport (checksum, perte, doublon, désordre).
 * L'aléa est injecté pour rendre les tests déterministes.
 */
export class FaultInjector {
  private readonly rates: FaultRates;
  private readonly random: Random;
  /** Trame retenue par appareil pour être réémise après la suivante (désordre). */
  private readonly held = new Map<number, Buffer>();

  constructor(rates: FaultRates, random: Random) {
    this.rates = rates;
    this.random = random;
  }

  corruptValues(frame: Frame): Frame {
    if (frame.measurements.length === 0 || !chance(this.random, this.rates.anomaly)) return frame;

    const anomaly = ANOMALIES[Math.floor(this.random() * ANOMALIES.length)]!;
    return {
      ...frame,
      measurements: frame.measurements.map((m) => (m.metricId === anomaly.metricId ? { ...anomaly } : m)),
    };
  }

  /** Renvoie les datagrammes à émettre réellement (0, 1, 2 ou 3) pour cette trame. */
  transmit(deviceId: number, encoded: Buffer): Buffer[] {
    const out: Buffer[] = [];
    const previouslyHeld = this.held.get(deviceId);
    this.held.delete(deviceId);

    if (!chance(this.random, this.rates.drop)) {
      const datagram = chance(this.random, this.rates.badChecksum) ? corruptChecksum(encoded) : encoded;
      if (!previouslyHeld && chance(this.random, this.rates.reorder)) {
        this.held.set(deviceId, datagram);
      } else {
        out.push(datagram);
        if (chance(this.random, this.rates.duplicate)) out.push(datagram);
      }
    }

    // La trame retenue part après la plus récente : elle arrive donc en retard.
    if (previouslyHeld) out.push(previouslyHeld);
    return out;
  }

  /** Libère la trame éventuellement retenue (appareil qui s'arrête). */
  flush(deviceId: number): Buffer[] {
    const held = this.held.get(deviceId);
    this.held.delete(deviceId);
    return held ? [held] : [];
  }
}

function corruptChecksum(encoded: Buffer): Buffer {
  const copy = Buffer.from(encoded);
  copy[copy.length - 1] ^= 0xff;
  return copy;
}
