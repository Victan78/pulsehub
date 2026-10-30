import { MetricId } from '../../protocol/constants';
import type { Measurement } from '../../protocol/types';

export type MetricName = 'temperature' | 'voltage' | 'current';
/** Dernières valeurs connues, en unités lisibles (°C, V, A). */
export type Readings = Partial<Record<MetricName, number>>;

export const METRIC_NAMES: readonly MetricName[] = ['temperature', 'voltage', 'current'];

/** Correspondance metricId du protocole → grandeur et facteur de conversion. */
const METRICS: Record<number, { name: MetricName; divisor: number }> = {
  [MetricId.TEMPERATURE]: { name: 'temperature', divisor: 100 }, // centièmes de °C → °C
  [MetricId.VOLTAGE]: { name: 'voltage', divisor: 1000 }, // mV → V
  [MetricId.CURRENT]: { name: 'current', divisor: 1000 }, // mA → A
};

/** Convertit les mesures brutes ; un metricId inconnu est ignoré (compatibilité ascendante). */
export function toReadings(measurements: Measurement[]): Readings {
  const readings: Readings = {};
  for (const { metricId, value } of measurements) {
    const metric = METRICS[metricId];
    if (metric) readings[metric.name] = value / metric.divisor;
  }
  return readings;
}
