import { readFileSync } from 'node:fs';
import { METRIC_NAMES, type MetricName } from './metrics';
import type { Severity } from './snapshot';

/**
 * Règle d'alerte déclarative : « metric au-dessus / en dessous de threshold pendant forMs ».
 * forMs = 0 : alerte immédiate (valeur anormale ponctuelle).
 */
export interface AlertRule {
  id: string;
  label: string;
  metric: MetricName;
  condition: 'above' | 'below';
  threshold: number;
  forMs: number;
  severity: Severity;
}

/** Lit et valide le fichier de règles. Une règle mal formée arrête le hub au démarrage. */
export function loadAlertRules(path: string): AlertRule[] {
  const raw: unknown = JSON.parse(readFileSync(path, 'utf8'));
  return parseAlertRules(raw, path);
}

export function parseAlertRules(raw: unknown, source = 'règles'): AlertRule[] {
  const rules = (raw as { rules?: unknown })?.rules;
  if (!Array.isArray(rules)) throw new Error(`${source} : un tableau "rules" est attendu`);

  const ids = new Set<string>();
  return rules.map((rule, index) => {
    const where = `${source}, règle n°${index + 1}`;
    const r = rule as Partial<AlertRule>;
    if (typeof r.id !== 'string' || r.id === '') throw new Error(`${where} : "id" manquant`);
    if (ids.has(r.id)) throw new Error(`${where} : id "${r.id}" en double`);
    if (typeof r.label !== 'string') throw new Error(`${where} : "label" manquant`);
    if (!METRIC_NAMES.includes(r.metric as MetricName)) {
      throw new Error(`${where} : "metric" doit valoir ${METRIC_NAMES.join(', ')}`);
    }
    if (r.condition !== 'above' && r.condition !== 'below') {
      throw new Error(`${where} : "condition" doit valoir above ou below`);
    }
    if (typeof r.threshold !== 'number') throw new Error(`${where} : "threshold" doit être un nombre`);
    if (typeof r.forMs !== 'number' || r.forMs < 0) throw new Error(`${where} : "forMs" doit être ≥ 0`);
    if (r.severity !== 'warning' && r.severity !== 'critical') {
      throw new Error(`${where} : "severity" doit valoir warning ou critical`);
    }
    ids.add(r.id);
    return r as AlertRule;
  });
}
