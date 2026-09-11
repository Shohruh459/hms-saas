import { apiClient } from './client';
import type { GenderPolicy, Room, RoomStatus, RoomType } from './types';

export interface PublicRoomFilters {
  minPrice?: number;
  maxPrice?: number;
  capacity?: number;
  minRating?: number;
  amenities?: string[];
}

export interface RoomFormInput {
  roomNumber: string;
  floor: number;
  category: string;
  pricePerNight: number;
  capacity?: number;
  amenities?: string[];
  type: RoomType;
  genderPolicy: GenderPolicy;
  totalBeds: number;
  pricePerBed?: number;
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

export async function createRoom(input: RoomFormInput): Promise<Room> {
  const { data } = await apiClient.post<Room>('/rooms', input);
  return data;
}

export async function updateRoom(roomId: string, input: RoomFormInput): Promise<Room> {
  const { data } = await apiClient.patch<Room>(`/rooms/${roomId}`, input);
  return data;
}
