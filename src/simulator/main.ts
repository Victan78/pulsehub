import dgram from 'node:dgram';
import { seededRandom } from '../shared/random';
import { USAGE, parseSimulatorOptions, type SimulatorOptions } from './options';
import { Simulator } from './simulator';

function loadOptions(): SimulatorOptions {
  try {
    const options = parseSimulatorOptions(process.argv.slice(2), process.env);
    if (options === 'help') {
      console.log(USAGE);
      process.exit(0);
    }
    return options;
  } catch (error) {
    console.error(`Option invalide : ${(error as Error).message}\n\n${USAGE}`);
    process.exit(1);
  }
}

const options = loadOptions();
const socket = dgram.createSocket('udp4');
socket.on('error', (error) => console.error(`Erreur UDP : ${error.message}`));

const simulator = new Simulator(options, {
  send: (datagram) => socket.send(datagram, options.port, options.host),
  random: options.seed === undefined ? Math.random : seededRandom(options.seed),
  now: Date.now,
});

const f = options.faults;
console.log(
  `PulseHub simulator → ${options.host}:${options.port} · ${options.devices} appareils × ${options.hz} Hz` +
    ` = ${options.devices * options.hz} trames/s\n` +
    `Défauts : checksum ${f.badChecksum} · doublon ${f.duplicate} · désordre ${f.reorder}` +
    ` · perte ${f.drop} · anomalie ${f.anomaly} · surchauffe ${options.hot} · arrêt ${options.stop}`,
);

const tickTimer = setInterval(() => simulator.tick(), 1000 / options.hz);

const statusTimer = setInterval(() => {
  const s = simulator.stats();
  process.stdout.write(
    `\r${s.elapsedSec.toFixed(0)} s · ${s.framesGenerated} trames générées · ${s.datagramsSent} datagrammes envoyés` +
      ` · ${s.runningDevices} actifs · ${s.hotDevices} en surchauffe   `,
  );
  if (options.durationSec > 0 && s.elapsedSec >= options.durationSec) shutdown();
}, 1000);

function shutdown(): void {
  clearInterval(tickTimer);
  clearInterval(statusTimer);
  socket.close();
  process.stdout.write('\nSimulateur arrêté.\n');
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
