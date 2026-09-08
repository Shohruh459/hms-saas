import { io, type Socket } from 'socket.io-client';
import { getToken } from './api/client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:3001';

let socket: Socket | null = null;

/** Butun ilova bo'ylab bitta umumiy Socket.IO ulanishini qaytaradi/yaratadi. */
export function getSocket(): Socket | null {
  if (typeof window === 'undefined') return null;
  const token = getToken();
  if (!token) return null;

  if (!socket) {
    socket = io(`${SOCKET_URL}/notifications`, {
      auth: { token },
      transports: ['websocket'],
    });
  }
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
