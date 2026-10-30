import { ws } from 'msw';
import { toSocketIo } from '@mswjs/socket.io-binding';
import type { UpdatedNftEvent, UpdatedOrderEvent } from '../types';

const url = new URL('/', window.location.origin);
url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
const channel = ws.link(url.href);
const subscribers = new Set<(event: string, data: unknown) => void>();

export const socketHandlers = [
  channel.addEventListener('connection', connection => {
    const socket = toSocketIo(connection);
    const send = (event: string, data: unknown) => socket.client.emit(event, data);
    subscribers.add(send);
    const heartbeat = window.setInterval(() => connection.client.send('2'), 20000);
    connection.client.addEventListener('close', () => {
      window.clearInterval(heartbeat);
      subscribers.delete(send);
    }, { once: true });
  }),
];

export function emitNftUpdated(data: UpdatedNftEvent) {
  subscribers.forEach(send => send('nft.updated', data));
}

export function emitOrderUpdated(data: UpdatedOrderEvent) {
  subscribers.forEach(send => send('order.updated', data));
}
