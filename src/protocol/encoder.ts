import { xorChecksum } from './checksum';
import {
  MAGIC,
  MAX_MEASUREMENTS,
  MEASUREMENT_SIZE,
  Offset,
  PROTOCOL_VERSION,
  frameLength,
} from './constants';
import type { Frame } from './types';

/**
 * Sérialise une trame au format PulseHub v1 (utilisé par le simulateur et les tests).
 * Lève une RangeError si un champ sort de sa plage : c'est une erreur de programmation
 * côté émetteur, pas une donnée réseau douteuse.
 */
export function encodeFrame(frame: Frame): Buffer {
  const count = frame.measurements.length;
  if (count > MAX_MEASUREMENTS) {
    throw new RangeError(`Trop de mesures : ${count} (maximum ${MAX_MEASUREMENTS})`);
  }

  const buf = Buffer.alloc(frameLength(count));
  buf.writeUInt16BE(MAGIC, Offset.MAGIC);
  buf.writeUInt8(PROTOCOL_VERSION, Offset.VERSION);
  buf.writeUInt8(frame.type, Offset.TYPE);
  buf.writeUInt16BE(frame.deviceId, Offset.DEVICE_ID);
  buf.writeUInt32BE(frame.seq, Offset.SEQ);
  buf.writeUInt32BE(frame.uptimeMs, Offset.UPTIME_MS);
  buf.writeUInt8(count, Offset.COUNT);

  frame.measurements.forEach((measurement, i) => {
    const offset = Offset.MEASUREMENTS + i * MEASUREMENT_SIZE;
    buf.writeUInt8(measurement.metricId, offset);
    buf.writeInt16BE(measurement.value, offset + 1);
  });

  const checksumOffset = buf.length - 1;
  buf.writeUInt8(xorChecksum(buf.subarray(0, checksumOffset)), checksumOffset);
  return buf;
}
