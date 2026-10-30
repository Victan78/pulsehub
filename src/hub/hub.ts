import { decodeFrame } from '../protocol/decoder';
import type { AlertRule } from './synthesis/alert-rules';
import type { EventLog } from './synthesis/event-log';
import { summarizeFleet, type Fleet } from './synthesis/fleet';
import type { ReceptionStats } from './synthesis/reception-stats';
import type { HubSnapshot } from './synthesis/snapshot';
import type { ThroughputMeter } from './synthesis/throughput';
import type { Sequencer } from './sequencer';

export interface HubDeps {
  sequencer: Sequencer;
  reception: ReceptionStats;
  fleet: Fleet;
  events: EventLog;
  throughput: ThroughputMeter;
  /** Règles en vigueur, publiées pour que le tableau de bord dessine les limites. */
  rules: AlertRule[];
  now: () => number;
}

/**
 * Chaîne de traitement d'un datagramme : décodage → séquencement → synthèse.
 * Le hub ne connaît ni le socket ni le WebSocket : il reçoit des octets et produit des instantanés.
 */
export class Hub {
  private readonly deps: HubDeps;
  private readonly startedAt: number;

  constructor(deps: HubDeps) {
    this.deps = deps;
    this.startedAt = deps.now();
  }

  handleDatagram(datagram: Buffer): void {
    const result = decodeFrame(datagram);
    if (!result.ok) {
      this.deps.reception.recordInvalid(result.error);
      return;
    }

    const verdict = this.deps.sequencer.check(result.frame);
    this.deps.reception.recordValid(verdict);
    this.deps.fleet.record(result.frame, verdict, this.deps.now());
  }

  snapshot(): HubSnapshot {
    const now = this.deps.now();
    const { fleet, reception, throughput, events } = this.deps;

    fleet.detectOffline(now);
    const devices = fleet.deviceViews();

    return {
      generatedAt: now,
      hubStartedAt: this.startedAt,
      reception: reception.view(throughput.sample(now, reception.datagramCount())),
      fleet: summarizeFleet(devices, fleet.anomalyCount()),
      devices,
      alerts: devices.flatMap((d) => (d.status === 'offline' ? [] : d.alerts)),
      events: events.recent(),
      rules: this.deps.rules,
    };
  }
}
