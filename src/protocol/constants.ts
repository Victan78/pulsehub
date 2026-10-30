/**
 * Constantes du protocole PulseHub v1 (imposé par le sujet).
 * Toutes les valeurs multi-octets sont en big-endian.
 */

/** Octets 0x50 0x48 (« PH ») lus comme un uint16 big-endian. */
export const MAGIC = 0x5048;
export const PROTOCOL_VERSION = 1;

export const MAX_FRAME_SIZE = 512;
export const HEADER_SIZE = 15;
export const MEASUREMENT_SIZE = 3;
export const CHECKSUM_SIZE = 1;
export const MIN_FRAME_SIZE = HEADER_SIZE + CHECKSUM_SIZE;
/** (512 - 16) / 3 = 165 mesures au maximum dans une trame. */
export const MAX_MEASUREMENTS = Math.floor((MAX_FRAME_SIZE - MIN_FRAME_SIZE) / MEASUREMENT_SIZE);

export const MIN_DEVICE_ID = 1;
export const MAX_DEVICE_ID = 0xffff;

/** Position de chaque champ dans la trame. */
export const Offset = {
  MAGIC: 0,
  VERSION: 2,
  TYPE: 3,
  DEVICE_ID: 4,
  SEQ: 6,
  UPTIME_MS: 10,
  COUNT: 14,
  MEASUREMENTS: 15,
} as const;

export const FrameType = {
  TELEMETRY: 0x01,
  HEARTBEAT: 0x02,
} as const;
export type FrameType = (typeof FrameType)[keyof typeof FrameType];

export const MetricId = {
  TEMPERATURE: 1, // centièmes de °C
  VOLTAGE: 2, // millivolts
  CURRENT: 3, // milliampères
} as const;
export type MetricId = (typeof MetricId)[keyof typeof MetricId];

/** Taille totale d'une trame contenant `count` mesures. */
export function frameLength(count: number): number {
  return MIN_FRAME_SIZE + count * MEASUREMENT_SIZE;
}

export function isFrameType(value: number): value is FrameType {
  return value === FrameType.TELEMETRY || value === FrameType.HEARTBEAT;
}
