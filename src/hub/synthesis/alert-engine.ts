import type { AlertRule } from './alert-rules';
import type { Readings } from './metrics';

export interface ActiveAlert {
  rule: AlertRule;
  /** Valeur la plus récente ayant maintenu l'alerte. */
  value: number;
  /** Début du dépassement (et non de l'alerte) : utile pour « depuis combien de temps ». */
  breachSince: number;
}

export type AlertTransition = { type: 'raised' | 'cleared'; alert: ActiveAlert };

interface RuleState {
  breachSince: number | null;
  active: boolean;
  value: number;
}

/**
 * Évalue les règles d'alerte pour chaque appareil, avec condition de durée :
 * une alerte ne se déclenche que si la condition reste vraie pendant `forMs`,
 * et retombe dès que la condition redevient fausse.
 */
export class AlertEngine {
  private readonly rules: AlertRule[];
  private readonly states = new Map<number, Map<string, RuleState>>();

  constructor(rules: AlertRule[]) {
    this.rules = rules;
  }

  evaluate(deviceId: number, readings: Readings, now: number): AlertTransition[] {
    const transitions: AlertTransition[] = [];
    const deviceStates = this.deviceStates(deviceId);

    for (const rule of this.rules) {
      const value = readings[rule.metric];
      if (value === undefined) continue; // HEARTBEAT ou mesure absente : rien ne change

      const state = deviceStates.get(rule.id) ?? { breachSince: null, active: false, value };
      deviceStates.set(rule.id, state);
      state.value = value;

      if (isBreached(rule, value)) {
        state.breachSince ??= now;
        if (!state.active && now - state.breachSince >= rule.forMs) {
          state.active = true;
          transitions.push({ type: 'raised', alert: toAlert(rule, state) });
        }
      } else {
        if (state.active) transitions.push({ type: 'cleared', alert: toAlert(rule, state) });
        state.breachSince = null;
        state.active = false;
      }
    }
    return transitions;
  }

  active(deviceId: number): ActiveAlert[] {
    const deviceStates = this.states.get(deviceId);
    if (!deviceStates) return [];
    return this.rules.flatMap((rule) => {
      const state = deviceStates.get(rule.id);
      return state?.active ? [toAlert(rule, state)] : [];
    });
  }

  /** Oublie l'état d'un appareil (redémarrage) : ses dépassements en cours ne comptent plus. */
  reset(deviceId: number): void {
    this.states.delete(deviceId);
  }

  private deviceStates(deviceId: number): Map<string, RuleState> {
    let deviceStates = this.states.get(deviceId);
    if (!deviceStates) {
      deviceStates = new Map();
      this.states.set(deviceId, deviceStates);
    }
    return deviceStates;
  }
}

function isBreached(rule: AlertRule, value: number): boolean {
  return rule.condition === 'above' ? value > rule.threshold : value < rule.threshold;
}

function toAlert(rule: AlertRule, state: RuleState): ActiveAlert {
  return { rule, value: state.value, breachSince: state.breachSince ?? 0 };
}
