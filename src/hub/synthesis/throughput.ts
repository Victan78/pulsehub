/**
 * Débit glissant : on échantillonne un compteur cumulé et on divise la progression
 * par le temps écoulé sur la fenêtre. Pas de calcul par trame, donc aucun coût sur le chemin chaud.
 */
export class ThroughputMeter {
  private readonly windowMs: number;
  private readonly samples: Array<{ at: number; total: number }> = [];

  constructor(windowMs: number) {
    this.windowMs = windowMs;
  }

  /** Enregistre la valeur du compteur à l'instant `now` et renvoie le débit par seconde. */
  sample(now: number, total: number): number {
    this.samples.push({ at: now, total });
    while (this.samples.length > 2 && now - this.samples[0]!.at > this.windowMs) this.samples.shift();

    const oldest = this.samples[0]!;
    const elapsedMs = now - oldest.at;
    return elapsedMs > 0 ? ((total - oldest.total) * 1000) / elapsedMs : 0;
  }
}
