import type { DeviceStatus, HubSnapshot } from '../../src/hub/synthesis/snapshot';
import type { ConnectionState } from './hub-state';

export type Tone = 'idle' | 'ok' | 'warning' | 'critical';

const plural = (count: number, word: string) => `${count} ${word}${count > 1 ? 's' : ''}`;

/** Résume la situation en une phrase : la première chose qu'on lit en arrivant devant l'écran. */
export interface Summary {
  tone: Tone;
  title: string;
  detail: string;
  /** Illustration à afficher : la machine dans l'état qui résume le mieux la situation. */
  image: DeviceStatus;
}

export function summarize(snapshot: HubSnapshot, connection: ConnectionState): Summary {
  if (connection !== 'open') {
    return { tone: 'idle', title: 'Connexion au hub…', detail: 'Le tableau de bord attend le serveur PulseHub.', image: 'offline' };
  }
  const { total, byStatus } = snapshot.fleet;
  if (total === 0) {
    return {
      tone: 'idle',
      title: 'En attente des appareils',
      detail: "Aucun appareil n'a encore envoyé de données.",
      image: 'offline',
    };
  }
  if (byStatus.critical > 0) {
    const labels = [...new Set(snapshot.alerts.filter((a) => a.severity === 'critical').map((a) => a.label.toLowerCase()))];
    return {
      tone: 'critical',
      title: `${plural(byStatus.critical, 'appareil')} en danger`,
      detail: `${labels.join(', ')} : à vérifier tout de suite (liste « Problèmes en cours » à droite).`,
      image: 'critical',
    };
  }
  if (byStatus.offline > 0 || byStatus.warning > 0) {
    const parts = [
      byStatus.offline > 0 ? `${plural(byStatus.offline, 'appareil')} ne ${byStatus.offline > 1 ? 'répondent' : 'répond'} plus` : '',
      byStatus.warning > 0 ? `${plural(byStatus.warning, 'appareil')} à surveiller` : '',
    ].filter(Boolean);
    return {
      tone: 'warning',
      title: parts.join(' · '),
      detail: 'Pas de danger immédiat, mais un coup d’œil s’impose.',
      image: byStatus.warning > 0 ? 'warning' : 'offline',
    };
  }
  return { tone: 'ok', title: 'Tout va bien', detail: `Les ${total} appareils fonctionnent normalement.`, image: 'ok' };
}
