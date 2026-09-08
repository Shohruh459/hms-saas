import { apiClient } from './client';
import type { PublicTenant } from './types';

export async function fetchPublicTenant(): Promise<PublicTenant> {
  const { data } = await apiClient.get<PublicTenant>('/tenants/public');
  return data;
}
