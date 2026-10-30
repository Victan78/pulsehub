import { describe, expect, it } from 'vitest';
import { FrameType, MetricId } from '../../src/protocol/constants';
import { decodeFrame } from '../../src/protocol/decoder';
import type { Frame } from '../../src/protocol/types';
import { SimulatedDevice } from '../../src/simulator/device';
import { NO_FAULTS } from '../../src/simulator/faults';
import { parseSimulatorOptions, type SimulatorOptions } from '../../src/simulator/options';
import { Simulator } from '../../src/simulator/simulator';
import { seededRandom } from '../../src/shared/random';

describe('SimulatedDevice', () => {
  const device = () =>
    new SimulatedDevice({ deviceId: 3, heartbeatEvery: 4, random: seededRandom(1), bootAt: 1000 });

  it('incrémente seq à chaque trame et calcule uptime depuis le démarrage', () => {
    const d = device();
    const frames = [d.nextFrame(1000), d.nextFrame(1050), d.nextFrame(1100)];

    expect(frames.map((f) => f.seq)).toEqual([1, 2, 3]);
    expect(frames.map((f) => f.uptimeMs)).toEqual([0, 50, 100]);
  });

  it('émet un HEARTBEAT toutes les N trames, une télémétrie complète sinon', () => {
    const d = device();
    const types = Array.from({ length: 8 }, () => d.nextFrame(1000).type);

    expect(types.filter((t) => t === FrameType.HEARTBEAT)).toHaveLength(2);
    expect(types[3]).toBe(FrameType.HEARTBEAT);
    expect(d.nextFrame(1000).measurements.map((m) => m.metricId)).toEqual([
      MetricId.TEMPERATURE,
      MetricId.VOLTAGE,
      MetricId.CURRENT,
    ]);
  });

  it('un appareil en surchauffe dépasse 70 °C en quelques secondes à 20 Hz', () => {
    const d = new SimulatedDevice({ deviceId: 1, heartbeatEvery: 0, random: seededRandom(2), bootAt: 0 });
    d.startOverheating();
    let last: Frame = d.nextFrame(0);
    for (let i = 0; i < 20 * 10; i++) last = d.nextFrame(i * 50);

    expect(last.measurements[0]!.value).toBeGreaterThan(7000);
  });
});

describe('Simulator', () => {
  function setup(overrides: Partial<SimulatorOptions> = {}) {
    const options = { ...(parseSimulatorOptions([]) as SimulatorOptions), devices: 5, ...overrides };
    const sent: Buffer[] = [];
    let now = 0;
    const simulator = new Simulator(options, {
      send: (d) => sent.push(d),
      random: seededRandom(42),
      now: () => now,
    });
    return { simulator, sent, advance: (ms: number) => (now += ms) };
  }

  it('chaque tick émet une trame valide par appareil', () => {
    const { simulator, sent } = setup({ faults: NO_FAULTS });
    simulator.tick();

    const ids = sent.map((d) => decodeFrame(d)).map((r) => (r.ok ? r.frame.deviceId : -1));
    expect(ids).toEqual([1, 2, 3, 4, 5]);
  });

  it('arrête les N derniers appareils après le délai configuré', () => {
    const { simulator, sent, advance } = setup({ stop: 2, stopAfterSec: 1 });
    simulator.tick();
    advance(1000);
    sent.length = 0;
    simulator.tick();

    expect(sent).toHaveLength(3);
    expect(simulator.stats().runningDevices).toBe(3);
  });
});

describe('parseSimulatorOptions', () => {
  it('a pour défauts 50 appareils à 20 Hz vers le port 9000', () => {
    expect(parseSimulatorOptions([])).toMatchObject({ devices: 50, hz: 20, port: 9000 });
  });

  it('prend le port dans PULSEHUB_UDP_PORT si l’option est absente', () => {
    expect(parseSimulatorOptions([], { PULSEHUB_UDP_PORT: '9100' })).toMatchObject({ port: 9100 });
  });

  it('--chaos active tous les défauts, une option explicite reste prioritaire', () => {
    const options = parseSimulatorOptions(['--chaos', '--duplicate', '0.5']) as SimulatorOptions;
    expect(options.faults.duplicate).toBe(0.5);
    expect(options.faults.badChecksum).toBeGreaterThan(0);
    expect(options.stop).toBeGreaterThan(0);
  });

  it('refuse un taux hors de [0, 1] et une flotte qui dépasse 65535', () => {
    expect(() => parseSimulatorOptions(['--drop', '2'])).toThrow(/--drop/);
    expect(() => parseSimulatorOptions(['--devices', '10', '--first-id', '65530'])).toThrow(/--first-id/);
  });
});
