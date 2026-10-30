import { useEffect, useState } from 'react';
import type { HubSnapshot } from '../../src/hub/synthesis/snapshot';
import { EMPTY_SNAPSHOT, type ConnectionState } from './hub-state';

const RECONNECT_DELAY_MS = 1000;

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
