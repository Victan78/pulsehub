import { useEffect, useState } from 'react';
import type { HubSnapshot } from '../../src/hub/synthesis/snapshot';

export type ConnectionState = 'connecting' | 'open' | 'closed';

const RECONNECT_DELAY_MS = 1000;

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

/** S'abonne à la synthèse publiée par le hub et se reconnecte tout seul si le hub redémarre. */
export function useHubSnapshot(): { snapshot: HubSnapshot; connection: ConnectionState } {
  const [snapshot, setSnapshot] = useState<HubSnapshot>(EMPTY_SNAPSHOT);
  const [connection, setConnection] = useState<ConnectionState>('connecting');

  useEffect(() => {
    let socket: WebSocket | undefined;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let disposed = false;

    const connect = () => {
      const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
      socket = new WebSocket(`${protocol}://${location.host}/ws`);
      setConnection('connecting');

      socket.onopen = () => setConnection('open');
      socket.onmessage = (event) => setSnapshot(JSON.parse(event.data as string) as HubSnapshot);
      socket.onclose = () => {
        if (disposed) return;
        setConnection('closed');
        retry = setTimeout(connect, RECONNECT_DELAY_MS);
      };
    };

    connect();
    return () => {
      disposed = true;
      clearTimeout(retry);
      socket?.close();
    };
  }, []);

  return { snapshot, connection };
}
