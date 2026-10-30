import dgram from 'node:dgram';
import type { AddressInfo } from 'node:net';

export type DatagramHandler = (datagram: Buffer) => void;
export type ErrorReporter = (message: string) => void;

export interface UdpReceiverOptions {
  host: string;
  port: number;
}

/**
 * Couche réseau seule : reçoit des datagrammes et les transmet au handler.
 * Elle ignore tout du protocole. Une erreur dans le traitement d'un datagramme
 * est signalée mais n'interrompt jamais la réception.
 */
export class UdpReceiver {
  private readonly options: UdpReceiverOptions;
  private readonly handler: DatagramHandler;
  private readonly reportError: ErrorReporter;
  private socket: dgram.Socket | undefined;

  constructor(options: UdpReceiverOptions, handler: DatagramHandler, reportError: ErrorReporter = console.error) {
    this.options = options;
    this.handler = handler;
    this.reportError = reportError;
  }

  start(): Promise<AddressInfo> {
    const socket = dgram.createSocket('udp4');
    this.socket = socket;

    socket.on('message', (datagram) => {
      try {
        this.handler(datagram);
      } catch (error) {
        this.reportError(`Traitement d'un datagramme en échec : ${(error as Error).message}`);
      }
    });

    return new Promise((resolve, reject) => {
      socket.once('error', reject);
      socket.bind(this.options.port, this.options.host, () => {
        socket.off('error', reject);
        socket.on('error', (error) => this.reportError(`Erreur UDP : ${error.message}`));
        resolve(socket.address());
      });
    });
  }

  stop(): Promise<void> {
    const socket = this.socket;
    this.socket = undefined;
    if (!socket) return Promise.resolve();
    return new Promise((resolve) => socket.close(() => resolve()));
  }
}
