import type { FrameType } from './constants';

export interface Measurement {
  /** uint8 : 1 température, 2 tension, 3 courant (cf. MetricId). */
  metricId: number;
  /** int16 dans l'unité du protocole (centièmes de °C, mV, mA). */
  value: number;
}

/** Trame PulseHub décodée et validée. */
export interface Frame {
  type: FrameType;
  deviceId: number;
  seq: number;
  uptimeMs: number;
  measurements: Measurement[];
}
