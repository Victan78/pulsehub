import { loadDotEnv } from '../shared/config';
import { loadHubConfig, type HubConfig } from './config';
import { Hub } from './hub';
import { Sequencer } from './sequencer';
import { AlertEngine } from './synthesis/alert-engine';
import { loadAlertRules } from './synthesis/alert-rules';
import { EventLog } from './synthesis/event-log';
import { Fleet } from './synthesis/fleet';
import { ReceptionStats } from './synthesis/reception-stats';
import type { HubSnapshot } from './synthesis/snapshot';
import { ThroughputMeter } from './synthesis/throughput';
import { UdpReceiver } from './udp-receiver';
import { WsPublisher } from './ws-publisher';

/** Racine de composition : c'est le seul endroit qui instancie et relie les composants. */
function createHub(config: HubConfig): Hub {
  const events = new EventLog(config.eventLogSize);
  const alerts = new AlertEngine(loadAlertRules(config.alertRulesFile));
  return new Hub({
    sequencer: new Sequencer({ restartToleranceMs: config.restartToleranceMs }),
    reception: new ReceptionStats(),
    fleet: new Fleet({ offlineAfterMs: config.offlineAfterMs }, alerts, events),
    events,
    throughput: new ThroughputMeter(config.throughputWindowMs),
    now: Date.now,
  });
}

async function main(): Promise<void> {
  loadDotEnv();
  const config = loadHubConfig(process.env);
  const hub = createHub(config);

  const receiver = new UdpReceiver({ host: config.udpHost, port: config.udpPort }, (datagram) =>
    hub.handleDatagram(datagram),
  );
  const publisher = new WsPublisher<HubSnapshot>(
    { port: config.wsPort, intervalMs: config.publishIntervalMs },
    () => hub.snapshot(),
  );

  const address = await receiver.start();
  await publisher.start();
  console.log(`PulseHub : réception UDP sur ${address.address}:${address.port}`);
  console.log(`PulseHub : synthèse publiée sur ws://localhost:${config.wsPort} toutes les ${config.publishIntervalMs} ms`);

  const shutdown = async () => {
    await Promise.all([receiver.stop(), publisher.stop()]);
    console.log('Hub arrêté.');
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

main().catch((error: Error) => {
  console.error(`Démarrage du hub impossible : ${error.message}`);
  process.exit(1);
});
