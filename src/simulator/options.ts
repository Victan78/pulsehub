import { parseArgs } from 'node:util';
import { MAX_DEVICE_ID } from '../protocol/constants';
import { DEFAULT_UDP_PORT, PORT_RULE, RATE_RULE, parseNumber } from '../shared/config';
import { NO_FAULTS, type FaultRates } from './faults';

export interface SimulatorOptions {
  host: string;
  port: number;
  devices: number;
  hz: number;
  firstDeviceId: number;
  heartbeatEvery: number;
  faults: FaultRates;
  /** Nombre d'appareils qui se mettent à surchauffer, et quand. */
  hot: number;
  hotAfterSec: number;
  /** Nombre d'appareils qui cessent d'émettre, et quand. */
  stop: number;
  stopAfterSec: number;
  /** Durée totale de la simulation (0 = illimitée). */
  durationSec: number;
  seed: number | undefined;
}

/** Préréglage `--chaos` : tous les défauts à la fois, à des taux visibles sur le tableau de bord. */
const CHAOS = {
  faults: { badChecksum: 0.01, duplicate: 0.01, reorder: 0.01, drop: 0.005, anomaly: 0.0005 },
  hot: 2,
  stop: 2,
};

export const USAGE = `Usage : npm run sim -- [options]

Réseau et flotte
  --host <ip>              adresse du hub                     (défaut 127.0.0.1)
  --port <n>               port UDP du hub                    (défaut $PULSEHUB_UDP_PORT ou ${DEFAULT_UDP_PORT})
  --devices <n>            nombre d'appareils                 (défaut 50)
  --hz <n>                 trames par seconde et par appareil (défaut 20)
  --first-id <n>           deviceId du premier appareil       (défaut 1)
  --heartbeat-every <n>    une trame sur n est un HEARTBEAT   (défaut 20, 0 = jamais)
  --duration <s>           arrêt automatique après s secondes (défaut 0 = jamais)
  --seed <n>               graine pour rejouer un scénario identique

Défauts (taux entre 0 et 1, appliqués à chaque trame)
  --bad-checksum <taux>    checksum faux
  --duplicate <taux>       trame envoyée deux fois
  --reorder <taux>         trame retardée derrière la suivante
  --drop <taux>            trame perdue (trou de séquence)
  --anomaly <taux>         valeur aberrante (120 °C, 0 V, surintensité…)
  --hot <n>                n premiers appareils qui surchauffent (après --hot-after s, défaut 5)
  --stop <n>               n derniers appareils qui s'arrêtent  (après --stop-after s, défaut 10)
  --chaos                  active tous les défauts à des taux de démonstration
  --help                   affiche cette aide
`;

/** Transforme argv (+ env) en options validées. Lève une Error lisible si une option est invalide. */
export function parseSimulatorOptions(argv: string[], env: NodeJS.ProcessEnv = {}): SimulatorOptions | 'help' {
  const { values } = parseArgs({
    args: argv,
    strict: true,
    options: {
      host: { type: 'string', default: '127.0.0.1' },
      port: { type: 'string' },
      devices: { type: 'string' },
      hz: { type: 'string' },
      'first-id': { type: 'string' },
      'heartbeat-every': { type: 'string' },
      duration: { type: 'string' },
      seed: { type: 'string' },
      'bad-checksum': { type: 'string' },
      duplicate: { type: 'string' },
      reorder: { type: 'string' },
      drop: { type: 'string' },
      anomaly: { type: 'string' },
      hot: { type: 'string' },
      'hot-after': { type: 'string' },
      stop: { type: 'string' },
      'stop-after': { type: 'string' },
      chaos: { type: 'boolean', default: false },
      help: { type: 'boolean', default: false },
    },
  });
  if (values.help) return 'help';

  const preset = values.chaos ? CHAOS : { faults: NO_FAULTS, hot: 0, stop: 0 };
  const devices = parseNumber('--devices', values.devices, 50, { min: 1, integer: true });
  const firstDeviceId = parseNumber('--first-id', values['first-id'], 1, {
    min: 1,
    max: MAX_DEVICE_ID - devices + 1,
    integer: true,
  });
  const fleetRule = { min: 0, max: devices, integer: true };

  return {
    host: values.host,
    port: parseNumber('--port', values.port ?? env.PULSEHUB_UDP_PORT, DEFAULT_UDP_PORT, PORT_RULE),
    devices,
    hz: parseNumber('--hz', values.hz, 20, { min: 0.1, max: 1000 }),
    firstDeviceId,
    heartbeatEvery: parseNumber('--heartbeat-every', values['heartbeat-every'], 20, { min: 0, integer: true }),
    durationSec: parseNumber('--duration', values.duration, 0, { min: 0 }),
    seed: values.seed === undefined ? undefined : parseNumber('--seed', values.seed, 0, { integer: true }),
    faults: {
      badChecksum: parseNumber('--bad-checksum', values['bad-checksum'], preset.faults.badChecksum, RATE_RULE),
      duplicate: parseNumber('--duplicate', values.duplicate, preset.faults.duplicate, RATE_RULE),
      reorder: parseNumber('--reorder', values.reorder, preset.faults.reorder, RATE_RULE),
      drop: parseNumber('--drop', values.drop, preset.faults.drop, RATE_RULE),
      anomaly: parseNumber('--anomaly', values.anomaly, preset.faults.anomaly, RATE_RULE),
    },
    hot: parseNumber('--hot', values.hot, Math.min(preset.hot, devices), fleetRule),
    hotAfterSec: parseNumber('--hot-after', values['hot-after'], 5, { min: 0 }),
    stop: parseNumber('--stop', values.stop, Math.min(preset.stop, devices), fleetRule),
    stopAfterSec: parseNumber('--stop-after', values['stop-after'], 10, { min: 0 }),
  };
}
