import { describe, expect, it } from 'vitest';
import { FrameType, MetricId } from '../../src/protocol/constants';
import { decodeFrame } from '../../src/protocol/decoder';
import { encodeFrame } from '../../src/protocol/encoder';
import type { Frame } from '../../src/protocol/types';
import { FaultInjector, NO_FAULTS, type FaultRates } from '../../src/simulator/faults';

const always = () => 0; // chance(rate > 0) est toujours vraie
const never = () => 0.999999;

function frame(seq: number): Frame {
  return {
    type: FrameType.TELEMETRY,
    deviceId: 1,
    seq,
    uptimeMs: seq * 50,
    measurements: [
      { metricId: MetricId.TEMPERATURE, value: 4000 },
      { metricId: MetricId.VOLTAGE, value: 24000 },
    ],
  };
}

function injector(rates: Partial<FaultRates>, random = always): FaultInjector {
  return new FaultInjector({ ...NO_FAULTS, ...rates }, random);
}

const seqOf = (buf: Buffer) => buf.readUInt32BE(6);

describe('FaultInjector', () => {
  it('sans défaut, émet la trame telle quelle', () => {
    const encoded = encodeFrame(frame(1));
    expect(injector({}).transmit(1, encoded)).toEqual([encoded]);
  });

  it('checksum faux : la trame émise est rejetée par le décodeur', () => {
    const [datagram] = injector({ badChecksum: 1 }).transmit(1, encodeFrame(frame(1)));
    expect(decodeFrame(datagram!)).toEqual({ ok: false, error: 'BAD_CHECKSUM' });
  });

  it('doublon : la même trame part deux fois', () => {
    const out = injector({ duplicate: 1 }).transmit(1, encodeFrame(frame(1)));
    expect(out.map(seqOf)).toEqual([1, 1]);
  });

  it('perte : rien ne part', () => {
    expect(injector({ drop: 1 }).transmit(1, encodeFrame(frame(1)))).toEqual([]);
  });

  it('désordre : la trame retenue part après la suivante', () => {
    const faults = injector({ reorder: 1 });
    expect(faults.transmit(1, encodeFrame(frame(1)))).toEqual([]);
    expect(faults.transmit(1, encodeFrame(frame(2))).map(seqOf)).toEqual([2, 1]);
  });

  it('désordre : la trame retenue est libérée quand l’appareil s’arrête', () => {
    const faults = injector({ reorder: 1 });
    faults.transmit(1, encodeFrame(frame(1)));
    expect(faults.flush(1).map(seqOf)).toEqual([1]);
    expect(faults.flush(1)).toEqual([]);
  });

  it('anomalie : remplace une mesure par une valeur aberrante sans casser la trame', () => {
    const corrupted = injector({ anomaly: 1 }).corruptValues(frame(1));

    expect(corrupted.measurements).not.toEqual(frame(1).measurements);
    expect(decodeFrame(encodeFrame(corrupted)).ok).toBe(true);
  });

  it('anomalie : ne touche pas aux HEARTBEAT', () => {
    const heartbeat: Frame = { ...frame(1), type: FrameType.HEARTBEAT, measurements: [] };
    expect(injector({ anomaly: 1 }).corruptValues(heartbeat)).toBe(heartbeat);
  });

  it('taux nuls : aucun défaut quel que soit l’aléa', () => {
    const encoded = encodeFrame(frame(1));
    expect(injector({}, never).transmit(1, encoded)).toEqual([encoded]);
    expect(injector({}, always).transmit(1, encoded)).toEqual([encoded]);
  });
});
