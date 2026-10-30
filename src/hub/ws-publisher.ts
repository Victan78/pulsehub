import { WebSocketServer, WebSocket } from 'ws';

export interface WsPublisherOptions {
  port: number;
  intervalMs: number;
}

/**
 * Produit un instantané à intervalle fixe et le diffuse à tous les navigateurs connectés.
 * - On publie à cadence fixe plutôt qu'à chaque trame : 1 000 trames/s n'ont pas à faire 1 000 rendus/s.
 * - L'instantané est calculé une seule fois par période, qu'il y ait 0 ou 10 clients : la synthèse
 *   (débit, détection hors ligne) avance au même rythme quel que soit le nombre de spectateurs.
 * - Un nouveau client reçoit tout de suite le dernier instantané, sans attendre la période suivante.
 */
export class WsPublisher<T> {
  private readonly options: WsPublisherOptions;
  private readonly produce: () => T;
  private server: WebSocketServer | undefined;
  private timer: NodeJS.Timeout | undefined;
  private latest: string | undefined;

  constructor(options: WsPublisherOptions, produce: () => T) {
    this.options = options;
    this.produce = produce;
  }

  start(): Promise<void> {
    const server = new WebSocketServer({ port: this.options.port });
    this.server = server;

    this.publish();
    server.on('connection', (socket) => socket.send(this.latest!));
    this.timer = setInterval(() => this.publish(), this.options.intervalMs);

    return new Promise((resolve, reject) => {
      server.once('listening', resolve);
      server.once('error', reject);
    });
  }

  stop(): Promise<void> {
    clearInterval(this.timer);
    const server = this.server;
    this.server = undefined;
    if (!server) return Promise.resolve();
    server.clients.forEach((client) => client.terminate());
    return new Promise((resolve) => server.close(() => resolve()));
  }

  private publish(): void {
    this.latest = JSON.stringify(this.produce());
    for (const client of this.server?.clients ?? []) {
      if (client.readyState === WebSocket.OPEN) client.send(this.latest);
    }
  }
}
