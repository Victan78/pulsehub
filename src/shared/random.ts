/** Source d'aléa injectable : renvoie un nombre dans [0, 1[ comme Math.random. */
export type Random = () => number;

/**
 * Générateur pseudo-aléatoire déterministe (mulberry32) : avec une même graine,
 * le simulateur rejoue exactement le même scénario de défauts.
 */
export function seededRandom(seed: number): Random {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Tire `true` avec la probabilité `rate` (0 = jamais, 1 = toujours). */
export function chance(random: Random, rate: number): boolean {
  return rate > 0 && random() < rate;
}
