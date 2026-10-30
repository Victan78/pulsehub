import { encodeFrame } from '../protocol/encoder';
import type { Random } from '../shared/random';
import { SimulatedDevice } from './device';
import { FaultInjector } from './faults';
import type { SimulatorOptions } from './options';

/** Envoi d'un datagramme : injecté pour découpler la simulation du réseau. */
export type Send = (datagram: Buffer) => void;

export interface SimulatorDeps {
  send: Send;
  random: Random;
  now: () => number;
}

export interface SimulatorStats {
  elapsedSec: number;
  framesGenerated: number;
  datagramsSent: number;
  runningDevices: number;
  hotDevices: number;
}

/**
 * Orchestre la flotte simulée : à chaque `tick`, chaque appareil actif produit une trame,
 * qui passe par l'injecteur de défauts avant d'être envoyée.
 * Le temps est injecté (`now`) : les scénarios « surchauffe » et « arrêt » se testent sans attendre.
 */
export class Simulator {
  private readonly options: SimulatorOptions;
  private readonly deps: SimulatorDeps;
  private readonly devices: SimulatedDevice[];
  private readonly faults: FaultInjector;
  private readonly startedAt: number;
  private readonly stopped = new Set<number>();
  private hotStarted = false;
  private framesGenerated = 0;
  private datagramsSent = 0;

  constructor(options: SimulatorOptions, deps: SimulatorDeps) {
    this.options = options;
    this.deps = deps;
    this.startedAt = deps.now();
    this.faults = new FaultInjector(options.faults, deps.random);
    this.devices = Array.from(
      { length: options.devices },
      (_, i) =>
        new SimulatedDevice({
          deviceId: options.firstDeviceId + i,
          heartbeatEvery: options.heartbeatEvery,
          random: deps.random,
          bootAt: this.startedAt,
        }),
    );
  }

  tick(): void {
    const now = this.deps.now();
    this.applyScenario(now);

    for (const device of this.devices) {
      if (this.stopped.has(device.deviceId)) continue;
      const frame = this.faults.corruptValues(device.nextFrame(now));
      this.framesGenerated++;
      this.emit(this.faults.transmit(device.deviceId, encodeFrame(frame)));
    }
  }

  stats(): SimulatorStats {
    return {
      elapsedSec: (this.deps.now() - this.startedAt) / 1000,
      framesGenerated: this.framesGenerated,
      datagramsSent: this.datagramsSent,
      runningDevices: this.devices.length - this.stopped.size,
      hotDevices: this.hotStarted ? this.options.hot : 0,
    };
  }

  /** Surchauffe des premiers appareils, arrêt des derniers, selon le temps écoulé. */
  private applyScenario(now: number): void {
    const elapsedSec = (now - this.startedAt) / 1000;

    if (!this.hotStarted && this.options.hot > 0 && elapsedSec >= this.options.hotAfterSec) {
      this.hotStarted = true;
      this.devices.slice(0, this.options.hot).forEach((device) => device.startOverheating());
    }

    if (this.stopped.size === 0 && this.options.stop > 0 && elapsedSec >= this.options.stopAfterSec) {
      for (const device of this.devices.slice(-this.options.stop)) {
        this.stopped.add(device.deviceId);
        this.emit(this.faults.flush(device.deviceId));
      }
    }
  }

  private emit(datagrams: Buffer[]): void {
    for (const datagram of datagrams) {
      this.deps.send(datagram);
      this.datagramsSent++;
    }
  }
}
