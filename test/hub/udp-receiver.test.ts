import dgram from 'node:dgram';
import { afterEach, describe, expect, it } from 'vitest';
import { UdpReceiver } from '../../src/hub/udp-receiver';

function sendTo(port: number, payload: Buffer): Promise<void> {
  const client = dgram.createSocket('udp4');
  return new Promise((resolve, reject) =>
    client.send(payload, port, '127.0.0.1', (error) => {
      client.close();
      if (error) reject(error);
      else resolve();
    }),
  );
}

describe('UdpReceiver', () => {
  let receiver: UdpReceiver | undefined;
  afterEach(() => receiver?.stop());

  it('transmet chaque datagramme reçu au handler', async () => {
    const received: Buffer[] = [];
    receiver = new UdpReceiver({ host: '127.0.0.1', port: 0 }, (d) => received.push(d));
    const { port } = await receiver.start();

    await sendTo(port, Buffer.from('hello'));
    await expect.poll(() => received.map(String)).toEqual(['hello']);
  });

  it("continue de recevoir quand le handler lève une exception", async () => {
    const errors: string[] = [];
    let calls = 0;
    receiver = new UdpReceiver(
      { host: '127.0.0.1', port: 0 },
      () => {
        calls++;
        throw new Error('boom');
      },
      (message) => errors.push(message),
    );
    const { port } = await receiver.start();

    await sendTo(port, Buffer.from('a'));
    await sendTo(port, Buffer.from('b'));
    await expect.poll(() => calls).toBe(2);
    expect(errors).toHaveLength(2);
  });
});
