import { DEFAULT_UDP_PORT, PORT_RULE, parseNumber } from '../shared/config';

export interface HubConfig {
  udpHost: string;
  udpPort: number;
  wsPort: number;
  /** Période de publication de la synthèse vers le tableau de bord. */
  publishIntervalMs: number;
  offlineAfterMs: number;
  restartToleranceMs: number;
  throughputWindowMs: number;
  eventLogSize: number;
  alertRulesFile: string;
}

const DURATION_RULE = { min: 1, integer: true };

/** Toute la configuration du hub vient de l'environnement : rien n'est écrit en dur ailleurs. */
export function loadHubConfig(env: NodeJS.ProcessEnv): HubConfig {
  return {
    udpHost: env.PULSEHUB_UDP_HOST || '0.0.0.0',
    udpPort: parseNumber('PULSEHUB_UDP_PORT', env.PULSEHUB_UDP_PORT, DEFAULT_UDP_PORT, PORT_RULE),
    wsPort: parseNumber('PULSEHUB_WS_PORT', env.PULSEHUB_WS_PORT, 8080, PORT_RULE),
    publishIntervalMs: parseNumber('PULSEHUB_PUBLISH_INTERVAL_MS', env.PULSEHUB_PUBLISH_INTERVAL_MS, 250, DURATION_RULE),
    offlineAfterMs: parseNumber('PULSEHUB_OFFLINE_AFTER_MS', env.PULSEHUB_OFFLINE_AFTER_MS, 2000, DURATION_RULE),
    restartToleranceMs: parseNumber(
      'PULSEHUB_RESTART_TOLERANCE_MS',
      env.PULSEHUB_RESTART_TOLERANCE_MS,
      5000,
      DURATION_RULE,
    ),
    throughputWindowMs: parseNumber(
      'PULSEHUB_THROUGHPUT_WINDOW_MS',
      env.PULSEHUB_THROUGHPUT_WINDOW_MS,
      2000,
      DURATION_RULE,
    ),
    eventLogSize: parseNumber('PULSEHUB_EVENT_LOG_SIZE', env.PULSEHUB_EVENT_LOG_SIZE, 50, { min: 1, integer: true }),
    alertRulesFile: env.PULSEHUB_ALERT_RULES_FILE || 'config/alert-rules.json',
  };
}
