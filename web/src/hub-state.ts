import type { HubSnapshot } from '../../src/hub/synthesis/snapshot';

export type ConnectionState = 'connecting' | 'open' | 'closed';

/** État affiché avant le premier message du hub : des zéros partout (test d'acceptation). */
export const EMPTY_SNAPSHOT: HubSnapshot = {
  generatedAt: 0,
  hubStartedAt: 0,
  reception: {
    datagrams: 0,
    valid: 0,
    invalid: 0,
    invalidByReason: {},
    accepted: 0,
    duplicates: 0,
    late: 0,
    lost: 0,
    restarts: 0,
    lossRate: 0,
    framesPerSec: 0,
  },
  fleet: {
    total: 0,
    byStatus: { ok: 0, warning: 0, critical: 0, offline: 0 },
    anomalies: 0,
    maxTemperature: null,
    averageTemperature: null,
  },
  devices: [],
  alerts: [],
  events: [],
  rules: [],
};
