import type { AlertRule, Severity } from '../../src/hub/synthesis/snapshot';

/** Échelle minimale de la jauge : 0 à 100 °C, étendue si un appareil dépasse. */
const MIN_SCALE_CELSIUS = 100;

export interface GaugeMark {
  value: number;
  severity: Severity;
  /** Position sur la jauge, en % de la largeur. */
  percent: number;
}

export interface TemperatureGauge {
  max: number;
  /** Remplissage de la jauge, en %. */
  percent: number;
  marks: GaugeMark[];
  /** Phrase courte : marge avant la première limite, ou dépassement. */
  verdict: { text: string; over: boolean } | null;
}

const decimal = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });

/**
 * Prépare la jauge de température d'un appareil à partir des règles publiées par le hub :
 * les limites (« au-dessus de 60 °C », « au-dessus de 70 °C ») deviennent des traits sur la jauge.
 */
export function temperatureGauge(temperature: number | null, rules: AlertRule[]): TemperatureGauge {
  const limits = rules
    .filter((r) => r.metric === 'temperature' && r.condition === 'above')
    .sort((a, b) => a.threshold - b.threshold);
  const highest = Math.max(MIN_SCALE_CELSIUS, temperature ?? 0, ...limits.map((r) => r.threshold));
  const max = Math.ceil(highest / 10) * 10;
  const toPercent = (celsius: number) => Math.min(100, Math.max(0, (celsius / max) * 100));

  return {
    max,
    percent: temperature === null ? 0 : toPercent(temperature),
    marks: limits.map((r) => ({ value: r.threshold, severity: r.severity, percent: toPercent(r.threshold) })),
    verdict: verdictFor(temperature, limits),
  };
}

function verdictFor(temperature: number | null, limits: AlertRule[]): TemperatureGauge['verdict'] {
  if (temperature === null || limits.length === 0) return null;
  const exceeded = limits.filter((r) => temperature > r.threshold).at(-1);
  if (exceeded) {
    return { text: `${decimal.format(temperature - exceeded.threshold)} °C au-dessus de ${exceeded.threshold} °C`, over: true };
  }
  const next = limits[0]!;
  return { text: `marge de ${decimal.format(next.threshold - temperature)} °C avant ${next.threshold} °C`, over: false };
}
