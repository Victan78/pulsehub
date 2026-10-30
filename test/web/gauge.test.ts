import { describe, expect, it } from 'vitest';
import type { AlertRule } from '../../src/hub/synthesis/snapshot';
import { temperatureGauge } from '../../web/src/gauge';

const rule = (id: string, threshold: number, severity: AlertRule['severity'], condition: AlertRule['condition'] = 'above'): AlertRule => ({
  id,
  label: id,
  metric: 'temperature',
  condition,
  threshold,
  forMs: 0,
  severity,
});

const RULES = [rule('overheat', 70, 'critical'), rule('hot', 60, 'warning'), rule('implausible', -10, 'warning', 'below')];

describe('temperatureGauge', () => {
  it('place les limites « au-dessus de » sur une échelle de 0 à 100 °C', () => {
    const gauge = temperatureGauge(50, RULES);

    expect(gauge.max).toBe(100);
    expect(gauge.percent).toBe(50);
    expect(gauge.marks).toEqual([
      { value: 60, severity: 'warning', percent: 60 },
      { value: 70, severity: 'critical', percent: 70 },
    ]);
  });

  it('indique la marge avant la première limite', () => {
    expect(temperatureGauge(46.5, RULES).verdict).toEqual({ text: 'marge de 13,5 °C avant 60 °C', over: false });
  });

  it('indique le dépassement de la limite la plus haute franchie', () => {
    expect(temperatureGauge(84.2, RULES).verdict).toEqual({ text: '14,2 °C au-dessus de 70 °C', over: true });
  });

  it('étend l’échelle quand un appareil dépasse 100 °C', () => {
    const gauge = temperatureGauge(120, RULES);
    expect(gauge.max).toBe(120);
    expect(gauge.percent).toBe(100);
  });

  it('reste vide sans mesure ni règle', () => {
    expect(temperatureGauge(null, [])).toEqual({ max: 100, percent: 0, marks: [], verdict: null });
  });
});
