import { describe, expect, it } from 'vitest';
import { AlertEngine } from '../../../src/hub/synthesis/alert-engine';
import { parseAlertRules, type AlertRule } from '../../../src/hub/synthesis/alert-rules';

const OVERHEAT: AlertRule = {
  id: 'overheat',
  label: 'Surchauffe',
  metric: 'temperature',
  condition: 'above',
  threshold: 70,
  forMs: 3000,
  severity: 'critical',
};

const UNDERVOLTAGE: AlertRule = {
  id: 'undervoltage',
  label: 'Sous-tension',
  metric: 'voltage',
  condition: 'below',
  threshold: 22,
  forMs: 0,
  severity: 'critical',
};

describe('AlertEngine', () => {
  it('ne déclenche « > 70 °C pendant 3 s » qu’après 3 s de dépassement continu', () => {
    const engine = new AlertEngine([OVERHEAT]);

    expect(engine.evaluate(1, { temperature: 71 }, 0)).toEqual([]);
    expect(engine.evaluate(1, { temperature: 72 }, 2999)).toEqual([]);
    expect(engine.evaluate(1, { temperature: 73 }, 3000)).toMatchObject([
      { type: 'raised', alert: { value: 73, breachSince: 0 } },
    ]);
    expect(engine.active(1)).toHaveLength(1);
  });

  it('remet le chronomètre à zéro si la condition s’interrompt', () => {
    const engine = new AlertEngine([OVERHEAT]);
    engine.evaluate(1, { temperature: 75 }, 0);
    engine.evaluate(1, { temperature: 65 }, 2000);
    engine.evaluate(1, { temperature: 75 }, 2500);

    expect(engine.evaluate(1, { temperature: 75 }, 4000)).toEqual([]);
    expect(engine.evaluate(1, { temperature: 75 }, 5500)).toHaveLength(1);
  });

  it('retombe dès que la valeur redevient normale', () => {
    const engine = new AlertEngine([UNDERVOLTAGE]);
    expect(engine.evaluate(1, { voltage: 0 }, 0)).toMatchObject([{ type: 'raised' }]);
    expect(engine.evaluate(1, { voltage: 24 }, 50)).toMatchObject([{ type: 'cleared' }]);
    expect(engine.active(1)).toEqual([]);
  });

  it('un HEARTBEAT (sans mesure) ne fait ni lever ni retomber une alerte', () => {
    const engine = new AlertEngine([UNDERVOLTAGE]);
    engine.evaluate(1, { voltage: 0 }, 0);
    expect(engine.evaluate(1, {}, 50)).toEqual([]);
    expect(engine.active(1)).toHaveLength(1);
  });

  it('isole les appareils entre eux et oublie un appareil réinitialisé', () => {
    const engine = new AlertEngine([UNDERVOLTAGE]);
    engine.evaluate(1, { voltage: 0 }, 0);
    engine.evaluate(2, { voltage: 24 }, 0);
    expect(engine.active(2)).toEqual([]);

    engine.reset(1);
    expect(engine.active(1)).toEqual([]);
  });
});

describe('parseAlertRules', () => {
  it('accepte le fichier livré', () => {
    expect(parseAlertRules({ rules: [OVERHEAT, UNDERVOLTAGE] })).toHaveLength(2);
  });

  it('refuse une règle mal formée avec un message qui dit laquelle', () => {
    expect(() => parseAlertRules({ rules: [{ ...OVERHEAT, metric: 'humidity' }] })).toThrow(/règle n°1.*metric/);
    expect(() => parseAlertRules({ rules: [OVERHEAT, OVERHEAT] })).toThrow(/en double/);
    expect(() => parseAlertRules({})).toThrow(/rules/);
  });
});
