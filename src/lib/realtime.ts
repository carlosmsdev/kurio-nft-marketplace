import { io } from 'socket.io-client';
import type { QueryClient } from '@tanstack/react-query';
import type { UpdatedNftEvent, UpdatedOrderEvent } from '../types';
export function connectRealtime(queryClient: QueryClient) {
    const socket = io(window.location.origin, { path: '/socket.io', transports: ['websocket'], autoConnect: false, reconnection: true });
    const nftVersion = new Map<string, number>();
    const orderVersion = new Map<string, number>();
    socket.on('nft.updated', (event: UpdatedNftEvent) => {
        if (event.version <= (nftVersion.get(event.id) ?? 0))
            return;
        nftVersion.set(event.id, event.version);
        void Promise.all([queryClient.invalidateQueries({ queryKey: ['nfts'] }), queryClient.invalidateQueries({ queryKey: ['nft', event.id] }), queryClient.invalidateQueries({ queryKey: ['quote'] }), queryClient.invalidateQueries({ queryKey: ['cart'] })]);
    });
    socket.on('order.updated', (event: UpdatedOrderEvent) => {
        const userId = queryClient.getQueryData<{
            user: {
                id: string;
            };
        } | null>(['session'])?.user.id;
        if (event.userId !== userId || event.version <= (orderVersion.get(event.id) ?? 0))
            return;
        orderVersion.set(event.id, event.version);
        void queryClient.invalidateQueries({ queryKey: ['order', event.id] });
        void queryClient.invalidateQueries({ queryKey: ['cart'] });
        void queryClient.invalidateQueries({ queryKey: ['quote'] });
        void queryClient.invalidateQueries({ queryKey: ['orders'] });
    });
    socket.on('connect', () => {
        window.dispatchEvent(new CustomEvent('kurio:connection', { detail: 'connected' }));
        void queryClient.invalidateQueries({ queryKey: ['nfts'] });
        void queryClient.invalidateQueries({ queryKey: ['quote'] });
        void queryClient.invalidateQueries({ queryKey: ['cart'] });
        void queryClient.invalidateQueries({ queryKey: ['order'] });
        void queryClient.invalidateQueries({ queryKey: ['orders'] });
    });
    socket.on('disconnect', () => { window.dispatchEvent(new CustomEvent('kurio:connection', { detail: 'disconnected' })); });
    socket.on('connect_error', () => { window.dispatchEvent(new CustomEvent('kurio:connection', { detail: 'disconnected' })); });
    socket.connect();
    return () => { socket.removeAllListeners(); socket.disconnect(); };
}

