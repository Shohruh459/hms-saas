'use client';

import { useEffect, useState } from 'react';
import { getSocket } from '../lib/socket';

/**
 * Umumiy Socket.IO ulanishini o'rnatadi (token mavjud bo'lsa) va uning
 * holatini qaytaradi. Real-time xabarlarga yozilish uchun useSocketEvent'ni
 * ishlating.
 */
export function useSocket() {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    setConnected(socket.connected);
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  return { connected };
}

/** Ma'lum bir real-time hodisaga obuna bo'lish uchun qulay hook. */
export function useSocketEvent<T = unknown>(event: string, handler: (payload: T) => void) {
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const listener = (payload: T) => handler(payload);
    socket.on(event, listener);

    return () => {
      socket.off(event, listener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, handler]);
}
