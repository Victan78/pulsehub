import { describe, expect, it } from 'vitest';
import { Hub } from '../../src/hub/hub';
import { Sequencer } from '../../src/hub/sequencer';
import { AlertEngine } from '../../src/hub/synthesis/alert-engine';
import { EventLog } from '../../src/hub/synthesis/event-log';
import { Fleet } from '../../src/hub/synthesis/fleet';
import { ReceptionStats } from '../../src/hub/synthesis/reception-stats';
import { ThroughputMeter } from '../../src/hub/synthesis/throughput';
import { FrameType } from '../../src/protocol/constants';
import { encodeFrame } from '../../src/protocol/encoder';

function createHub() {
  let now = 0;
  const events = new EventLog(10);
  const hub = new Hub({
    sequencer: new Sequencer({ restartToleranceMs: 5000 }),
    reception: new ReceptionStats(),
    fleet: new Fleet({ offlineAfterMs: 2000 }, new AlertEngine([]), events),
    events,
    throughput: new ThroughputMeter(2000),
    now: () => now,
  });
  return { hub, advance: (ms: number) => (now += ms) };
}

const heartbeat = (deviceId: number, seq: number) =>
  encodeFrame({ type: FrameType.HEARTBEAT, deviceId, seq, uptimeMs: 10_000 + seq * 50, measurements: [] });

describe('Hub', () => {
  it('affiche des valeurs à zéro partout au démarrage', () => {
    const { hub } = createHub();
    const snapshot = hub.snapshot();

    expect(snapshot.reception).toMatchObject({ datagrams: 0, invalid: 0, lost: 0, framesPerSec: 0 });
    expect(snapshot.fleet.total).toBe(0);
    expect(snapshot.devices).toEqual([]);
    expect(snapshot.events).toEqual([]);
  });

  it('enchaîne décodage, séquencement et synthèse', () => {
    const { hub } = createHub();
    [heartbeat(1, 1), heartbeat(1, 2), heartbeat(1, 2), heartbeat(1, 4), heartbeat(2, 1), Buffer.from('bruit')].forEach(
      (d) => hub.handleDatagram(d),
    );

    const { reception, fleet } = hub.snapshot();
    expect(reception).toMatchObject({ datagrams: 6, valid: 5, invalid: 1, accepted: 4, duplicates: 1, lost: 1 });
    expect(reception.invalidByReason).toEqual({ TOO_SHORT: 1 });
    expect(fleet.byStatus.ok).toBe(2);
  });

  it('mesure le débit de réception', () => {
    const { hub, advance } = createHub();
    hub.snapshot();
    for (let seq = 1; seq <= 1000; seq++) hub.handleDatagram(heartbeat(1, seq));
    advance(1000);

    expect(hub.snapshot().reception.framesPerSec).toBe(1000);
  });
});
