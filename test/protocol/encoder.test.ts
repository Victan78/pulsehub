import { describe, expect, it } from 'vitest';
import { FrameType, MAX_MEASUREMENTS, MetricId } from '../../src/protocol/constants';
import { decodeFrame } from '../../src/protocol/decoder';
import { encodeFrame } from '../../src/protocol/encoder';
import type { Frame } from '../../src/protocol/types';

describe('encodeFrame', () => {
  it("produit exactement la trame d'exemple du sujet", () => {
    const buf = encodeFrame({
      type: FrameType.HEARTBEAT,
      deviceId: 7,
      seq: 1,
      uptimeMs: 1000,
      measurements: [],
    });

    expect(buf.toString('hex')).toBe('50480102000700000001000003e800f6');
  });

  it('est l’inverse du décodeur (aller-retour)', () => {
    const frame: Frame = {
      type: FrameType.TELEMETRY,
      deviceId: 65535,
      seq: 0xffffffff,
      uptimeMs: 123456,
      measurements: [
        { metricId: MetricId.TEMPERATURE, value: -2000 },
        { metricId: MetricId.VOLTAGE, value: 32767 },
        { metricId: MetricId.CURRENT, value: -32768 },
      ],
    };

    expect(decodeFrame(encodeFrame(frame))).toEqual({ ok: true, frame });
  });

  it('refuse plus de 165 mesures (trame > 512 octets)', () => {
    const measurements = Array.from({ length: MAX_MEASUREMENTS + 1 }, () => ({
      metricId: MetricId.TEMPERATURE,
      value: 0,
    }));

    expect(() =>
      encodeFrame({ type: FrameType.TELEMETRY, deviceId: 1, seq: 1, uptimeMs: 0, measurements }),
    ).toThrow(RangeError);
  });

  it('refuse une valeur hors de la plage int16', () => {
    expect(() =>
      encodeFrame({
        type: FrameType.TELEMETRY,
        deviceId: 1,
        seq: 1,
        uptimeMs: 0,
        measurements: [{ metricId: MetricId.VOLTAGE, value: 230000 }],
      }),
    ).toThrow(RangeError);
  });
});
