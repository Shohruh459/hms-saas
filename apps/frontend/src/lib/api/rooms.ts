import { apiClient } from './client';
import type { Room, RoomStatus } from './types';

export interface PublicRoomFilters {
  minPrice?: number;
  maxPrice?: number;
  capacity?: number;
  minRating?: number;
  amenities?: string[];
}

export async function fetchPublicRooms(filters: PublicRoomFilters = {}): Promise<Room[]> {
  const { data } = await apiClient.get<Room[]>('/rooms/public', {
    params: {
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      capacity: filters.capacity,
      minRating: filters.minRating,
      amenities: filters.amenities?.length ? filters.amenities.join(',') : undefined,
    },
  });
  return data;
}

export async function fetchAdminRooms(): Promise<Room[]> {
  const { data } = await apiClient.get<Room[]>('/rooms');
  return data;
}

export async function updateRoomStatus(roomId: string, status: RoomStatus): Promise<Room> {
  const { data } = await apiClient.patch<Room>(`/rooms/${roomId}/status`, { status });
  return data;
}
