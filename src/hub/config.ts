import { DEFAULT_UDP_PORT, PORT_RULE, parseNumber } from '../shared/config';

export interface HubConfig {
  udpHost: string;
  udpPort: number;
}

/** Toute la configuration du hub vient de l'environnement : rien n'est écrit en dur ailleurs. */
export function loadHubConfig(env: NodeJS.ProcessEnv): HubConfig {
  return {
    udpHost: env.PULSEHUB_UDP_HOST || '0.0.0.0',
    udpPort: parseNumber('PULSEHUB_UDP_PORT', env.PULSEHUB_UDP_PORT, DEFAULT_UDP_PORT, PORT_RULE),
  };
}
