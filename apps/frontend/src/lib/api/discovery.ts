import { apiClient } from './client';
import type { DiscoveryHotel } from './types';

export async function fetchDiscoveryHotels(region?: string): Promise<DiscoveryHotel[]> {
  const { data } = await apiClient.get<DiscoveryHotel[]>('/discovery/hotels', {
    params: region ? { region } : undefined,
  });
  return data;
}
