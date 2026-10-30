import { FrameType, MetricId } from '../protocol/constants';
import type { Frame } from '../protocol/types';
import type { Random } from '../shared/random';

const UINT32_RANGE = 2 ** 32;
const INT16_MIN = -32768;
const INT16_MAX = 32767;

export interface DeviceOptions {
  deviceId: number;
  /** Une trame sur N est un HEARTBEAT (0 = jamais). */
  heartbeatEvery: number;
  random: Random;
  /** Instant de démarrage de l'appareil (ms), sert au calcul de uptimeMs. */
  bootAt: number;
}

/** Valeur de consigne autour de laquelle chaque grandeur oscille. */
interface Setpoints {
  temperature: number; // centièmes de °C
  voltage: number; // mV
  current: number; // mA
}

/** Température cible d'un appareil qui surchauffe (85 °C). */
const OVERHEAT_TARGET = 8500;

/**
 * Un équipement simulé : il produit des trames PulseHub cohérentes
 * (seq croissant, uptime, valeurs qui dérivent doucement autour d'une consigne).
 * Il ne connaît ni le réseau ni les défauts : il se contente de générer des trames.
 */
export class SimulatedDevice {
  readonly deviceId: number;
  private readonly heartbeatEvery: number;
  private readonly random: Random;
  private readonly bootAt: number;
  private readonly setpoints: Setpoints;
  private readonly current: Setpoints;
  private seq = 0;
  private overheating = false;

  constructor(options: DeviceOptions) {
    this.deviceId = options.deviceId;
    this.heartbeatEvery = options.heartbeatEvery;
    this.random = options.random;
    this.bootAt = options.bootAt;
    this.setpoints = {
      temperature: 3500 + Math.round(this.random() * 1500), // 35 à 50 °C
      voltage: 24000,
      current: 2000 + Math.round(this.random() * 4000), // 2 à 6 A
    };
    this.current = { ...this.setpoints };
  }

  /** L'appareil chauffe progressivement jusqu'à ~85 °C. */
  startOverheating(): void {
    this.overheating = true;
  }

  nextFrame(now: number): Frame {
    this.seq = (this.seq + 1) % UINT32_RANGE;
    const base = {
      deviceId: this.deviceId,
      seq: this.seq,
      uptimeMs: Math.max(0, now - this.bootAt) % UINT32_RANGE,
    };

    if (this.heartbeatEvery > 0 && this.seq % this.heartbeatEvery === 0) {
      return { ...base, type: FrameType.HEARTBEAT, measurements: [] };
    }

    this.drift();
    return {
      ...base,
      type: FrameType.TELEMETRY,
      measurements: [
        { metricId: MetricId.TEMPERATURE, value: this.current.temperature },
        { metricId: MetricId.VOLTAGE, value: this.current.voltage },
        { metricId: MetricId.CURRENT, value: this.current.current },
      ],
    };
  }

  /** Marche aléatoire rappelée vers la consigne : des courbes réalistes sans à-coups. */
  private drift(): void {
    const temperatureTarget = this.overheating ? OVERHEAT_TARGET : this.setpoints.temperature;
    const temperaturePull = this.overheating ? 0.01 : 0.05;
    this.current.temperature = this.step(this.current.temperature, temperatureTarget, 15, temperaturePull);
    this.current.voltage = this.step(this.current.voltage, this.setpoints.voltage, 40, 0.1);
    this.current.current = this.step(this.current.current, this.setpoints.current, 50, 0.05);
  }

  private step(value: number, target: number, noise: number, pull: number): number {
    const next = value + (target - value) * pull + (this.random() * 2 - 1) * noise;
    return clampInt16(Math.round(next));
  }
}

export function clampInt16(value: number): number {
  return Math.min(INT16_MAX, Math.max(INT16_MIN, value));
}
