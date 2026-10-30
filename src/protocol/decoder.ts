import { xorChecksum } from './checksum';
import {
  FrameType,
  MAGIC,
  MAX_FRAME_SIZE,
  MEASUREMENT_SIZE,
  MIN_DEVICE_ID,
  MIN_FRAME_SIZE,
  Offset,
  PROTOCOL_VERSION,
  frameLength,
  isFrameType,
} from './constants';
import type { Frame, Measurement } from './types';

export const DecodeError = {
  TOO_SHORT: 'TOO_SHORT',
  TOO_LONG: 'TOO_LONG',
  BAD_MAGIC: 'BAD_MAGIC',
  BAD_VERSION: 'BAD_VERSION',
  LENGTH_MISMATCH: 'LENGTH_MISMATCH',
  BAD_CHECKSUM: 'BAD_CHECKSUM',
  UNKNOWN_TYPE: 'UNKNOWN_TYPE',
  BAD_DEVICE_ID: 'BAD_DEVICE_ID',
  HEARTBEAT_WITH_MEASUREMENTS: 'HEARTBEAT_WITH_MEASUREMENTS',
} as const;
export type DecodeError = (typeof DecodeError)[keyof typeof DecodeError];

/**
 * Résultat du décodage : une trame invalide n'est pas une exception mais
 * un cas normal sur UDP, d'où un type somme plutôt qu'un throw.
 */
export type DecodeResult = { ok: true; frame: Frame } | { ok: false; error: DecodeError };

const fail = (error: DecodeError): DecodeResult => ({ ok: false, error });

/**
 * Décode et valide un datagramme PulseHub v1.
 * Ordre des contrôles : taille → magic → version → longueur annoncée → checksum
 * → cohérence des champs. On vérifie l'intégrité avant d'interpréter le contenu.
 */
export function decodeFrame(buf: Buffer): DecodeResult {
  if (buf.length < MIN_FRAME_SIZE) return fail(DecodeError.TOO_SHORT);
  if (buf.length > MAX_FRAME_SIZE) return fail(DecodeError.TOO_LONG);
  if (buf.readUInt16BE(Offset.MAGIC) !== MAGIC) return fail(DecodeError.BAD_MAGIC);
  if (buf.readUInt8(Offset.VERSION) !== PROTOCOL_VERSION) return fail(DecodeError.BAD_VERSION);

  const count = buf.readUInt8(Offset.COUNT);
  if (buf.length !== frameLength(count)) return fail(DecodeError.LENGTH_MISMATCH);

  const checksumOffset = buf.length - 1;
  if (xorChecksum(buf.subarray(0, checksumOffset)) !== buf.readUInt8(checksumOffset)) {
    return fail(DecodeError.BAD_CHECKSUM);
  }

  const type = buf.readUInt8(Offset.TYPE);
  if (!isFrameType(type)) return fail(DecodeError.UNKNOWN_TYPE);
  if (type === FrameType.HEARTBEAT && count !== 0) {
    return fail(DecodeError.HEARTBEAT_WITH_MEASUREMENTS);
  }

  const deviceId = buf.readUInt16BE(Offset.DEVICE_ID);
  if (deviceId < MIN_DEVICE_ID) return fail(DecodeError.BAD_DEVICE_ID);

  return {
    ok: true,
    frame: {
      type,
      deviceId,
      seq: buf.readUInt32BE(Offset.SEQ),
      uptimeMs: buf.readUInt32BE(Offset.UPTIME_MS),
      measurements: readMeasurements(buf, count),
    },
  };
}

function readMeasurements(buf: Buffer, count: number): Measurement[] {
  const measurements: Measurement[] = [];
  for (let i = 0; i < count; i++) {
    const offset = Offset.MEASUREMENTS + i * MEASUREMENT_SIZE;
    measurements.push({
      metricId: buf.readUInt8(offset),
      value: buf.readInt16BE(offset + 1),
    });
  }
  return measurements;
}
