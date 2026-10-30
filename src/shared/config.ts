import { existsSync } from 'node:fs';

/** Valeurs par défaut partagées entre le hub et le simulateur (surchargées par env ou CLI). */
export const DEFAULT_UDP_PORT = 9000;

export interface NumberRule {
  min?: number;
  max?: number;
  integer?: boolean;
}

/**
 * Convertit une valeur textuelle (variable d'environnement, option CLI) en nombre validé.
 * Une configuration invalide doit arrêter le programme au démarrage, avec un message clair,
 * plutôt que de produire un comportement surprenant plus tard.
 */
export function parseNumber(name: string, raw: string | undefined, fallback: number, rule: NumberRule = {}): number {
  if (raw === undefined || raw.trim() === '') return fallback;

  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(`${name} : « ${raw} » n'est pas un nombre`);
  if (rule.integer && !Number.isInteger(value)) throw new Error(`${name} : ${raw} doit être un entier`);
  if (rule.min !== undefined && value < rule.min) throw new Error(`${name} : ${raw} < ${rule.min}`);
  if (rule.max !== undefined && value > rule.max) throw new Error(`${name} : ${raw} > ${rule.max}`);
  return value;
}

export const PORT_RULE: NumberRule = { min: 1, max: 65535, integer: true };
export const RATE_RULE: NumberRule = { min: 0, max: 1 };

/** Charge un éventuel fichier .env local (jamais versionné) sans écraser l'environnement. */
export function loadDotEnv(path = '.env'): void {
  if (existsSync(path)) process.loadEnvFile(path);
}
