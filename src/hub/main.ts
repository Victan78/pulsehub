import { decodeFrame } from '../protocol/decoder';
import { loadDotEnv } from '../shared/config';
import { loadHubConfig } from './config';
import { ReceptionStats } from './reception-stats';
import { UdpReceiver } from './udp-receiver';

loadDotEnv();
const config = loadHubConfig(process.env);
const stats = new ReceptionStats();

const receiver = new UdpReceiver({ host: config.udpHost, port: config.udpPort }, (datagram) => {
  const result = decodeFrame(datagram);
  if (result.ok) stats.recordValid();
  else stats.recordInvalid(result.error);
});

const address = await receiver.start();
console.log(`PulseHub à l'écoute en UDP sur ${address.address}:${address.port}`);

// Affichage provisoire en attendant la synthèse et la visualisation.
const statusTimer = setInterval(() => {
  const s = stats.snapshot();
  process.stdout.write(
    `\rreçues ${s.datagrams} · valides ${s.valid} · invalides ${s.invalid} ${JSON.stringify(s.invalidByReason)}   `,
  );
}, 1000);

async function shutdown(): Promise<void> {
  clearInterval(statusTimer);
  await receiver.stop();
  process.stdout.write('\nHub arrêté.\n');
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
