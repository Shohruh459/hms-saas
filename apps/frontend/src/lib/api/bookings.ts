import { apiClient } from './client';
import type { Booking, GuestGender } from './types';

export interface CreateBookingPayload {
  roomId: string;
  checkIn: string;
  checkOut: string;
  guestId?: string;
  guestGender?: GuestGender;
  bedsBooked?: number;
}

export async function createBooking(payload: CreateBookingPayload): Promise<Booking> {
  const { data } = await apiClient.post<Booking>('/bookings', payload);
  return data;
}

export async function fetchMyBookings(): Promise<Booking[]> {
  const { data } = await apiClient.get<Booking[]>('/bookings');
  return data;
}

export async function cancelBooking(bookingId: string): Promise<Booking> {
  const { data } = await apiClient.patch<Booking>(`/bookings/${bookingId}/cancel`);
  return data;
}
