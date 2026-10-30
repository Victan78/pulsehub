import { describe, expect, it } from 'vitest';
import { FrameType, MetricId } from '../../src/protocol/constants';
import { DecodeError, decodeFrame } from '../../src/protocol/decoder';
import { xorChecksum } from '../../src/protocol/checksum';

/** Trame d'exemple du sujet : HEARTBEAT, appareil 7, seq 1, uptime 1000 ms, checksum F6. */
const SPEC_HEARTBEAT = Buffer.from('504801020007000000010000' + '03e800' + 'f6', 'hex');

/** Recalcule le checksum après modification manuelle d'un octet. */
function withValidChecksum(buf: Buffer): Buffer {
  const copy = Buffer.from(buf);
  copy[copy.length - 1] = xorChecksum(copy.subarray(0, copy.length - 1));
  return copy;
}

function telemetry(): Buffer {
  // appareil 42, seq 0x01020304, uptime 5000 ms, 3 mesures : 42,50 °C, 24 000 mV, -150 mA
  const body = Buffer.from(
    '5048' + '01' + '01' + '002a' + '01020304' + '00001388' + '03' + '01109a' + '025dc0' + '03ff6a',
    'hex',
  );
  return Buffer.concat([body, Buffer.from([xorChecksum(body)])]);
}

describe('decodeFrame', () => {
  it("décode la trame HEARTBEAT d'exemple du sujet", () => {
    expect(SPEC_HEARTBEAT).toHaveLength(16);

    const result = decodeFrame(SPEC_HEARTBEAT);

    expect(result).toEqual({
      ok: true,
      frame: { type: FrameType.HEARTBEAT, deviceId: 7, seq: 1, uptimeMs: 1000, measurements: [] },
    });
  });

  it('décode une trame TELEMETRY avec ses mesures (int16 signés compris)', () => {
    const result = decodeFrame(telemetry());

    expect(result).toEqual({
      ok: true,
      frame: {
        type: FrameType.TELEMETRY,
        deviceId: 42,
        seq: 0x01020304,
        uptimeMs: 5000,
        measurements: [
          { metricId: MetricId.TEMPERATURE, value: 4250 },
          { metricId: MetricId.VOLTAGE, value: 24000 },
          { metricId: MetricId.CURRENT, value: -150 },
        ],
      },
    });
  });

  it('lit seq et uptime comme des uint32 (pas de valeur négative)', () => {
    const buf = Buffer.from(SPEC_HEARTBEAT);
    buf.writeUInt32BE(0xffffffff, 6);
    buf.writeUInt32BE(0xfffffffe, 10);

    const result = decodeFrame(withValidChecksum(buf));

    expect(result.ok && result.frame.seq).toBe(0xffffffff);
    expect(result.ok && result.frame.uptimeMs).toBe(0xfffffffe);
  });

  it.each([
    ['vide', Buffer.alloc(0)],
    ['15 octets', SPEC_HEARTBEAT.subarray(0, 15)],
  ])('rejette une trame trop courte (%s)', (_label, buf) => {
    expect(decodeFrame(buf)).toEqual({ ok: false, error: DecodeError.TOO_SHORT });
  });

  it('rejette une trame de plus de 512 octets', () => {
    expect(decodeFrame(Buffer.alloc(513))).toEqual({ ok: false, error: DecodeError.TOO_LONG });
  });

  it('rejette un magic incorrect', () => {
    const buf = Buffer.from(SPEC_HEARTBEAT);
    buf[1] = 0x49;
    expect(decodeFrame(withValidChecksum(buf))).toEqual({ ok: false, error: DecodeError.BAD_MAGIC });
  });

  it('rejette une version différente de 1', () => {
    const buf = Buffer.from(SPEC_HEARTBEAT);
    buf[2] = 2;
    expect(decodeFrame(withValidChecksum(buf))).toEqual({ ok: false, error: DecodeError.BAD_VERSION });
  });

  it('rejette un checksum faux', () => {
    const buf = Buffer.from(SPEC_HEARTBEAT);
    buf[15] = 0xf7;
    expect(decodeFrame(buf)).toEqual({ ok: false, error: DecodeError.BAD_CHECKSUM });
  });

  it('rejette une trame corrompue en cours de route (un bit inversé dans le corps)', () => {
    const buf = telemetry();
    buf[16] ^= 0x01;
    expect(decodeFrame(buf)).toEqual({ ok: false, error: DecodeError.BAD_CHECKSUM });
  });

  it('rejette une longueur incohérente avec count', () => {
    const truncated = withValidChecksum(telemetry().subarray(0, 20));
    expect(decodeFrame(truncated)).toEqual({ ok: false, error: DecodeError.LENGTH_MISMATCH });
  });

  it('rejette un type inconnu', () => {
    const buf = Buffer.from(SPEC_HEARTBEAT);
    buf[3] = 0x03;
    expect(decodeFrame(withValidChecksum(buf))).toEqual({ ok: false, error: DecodeError.UNKNOWN_TYPE });
  });

  it("rejette l'appareil 0 (plage 1 à 65535)", () => {
    const buf = Buffer.from(SPEC_HEARTBEAT);
    buf.writeUInt16BE(0, 4);
    expect(decodeFrame(withValidChecksum(buf))).toEqual({ ok: false, error: DecodeError.BAD_DEVICE_ID });
  });

  it('rejette un HEARTBEAT qui transporte des mesures', () => {
    const buf = telemetry();
    buf[3] = FrameType.HEARTBEAT;
    expect(decodeFrame(withValidChecksum(buf))).toEqual({
      ok: false,
      error: DecodeError.HEARTBEAT_WITH_MEASUREMENTS,
    });
  });

  it('ne lève jamais d’exception, même sur des octets aléatoires', () => {
    for (let i = 0; i < 1000; i++) {
      const buf = Buffer.alloc(Math.floor(Math.random() * 600));
      for (let j = 0; j < buf.length; j++) buf[j] = Math.floor(Math.random() * 256);
      expect(() => decodeFrame(buf)).not.toThrow();
    }
  });
});
