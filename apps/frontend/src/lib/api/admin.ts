import { apiClient } from './client';
import type { AdminTenant, SuperadminAccessEntry, TenantStatus } from './types';

export async function fetchAdminTenants(): Promise<AdminTenant[]> {
  const { data } = await apiClient.get<AdminTenant[]>('/admin/tenants');
  return data;
}

export async function updateTenantStatus(tenantId: string, status: TenantStatus): Promise<AdminTenant> {
  const { data } = await apiClient.patch<AdminTenant>(`/admin/tenants/${tenantId}/status`, { status });
  return data;
}

export async function extendTenantSubscription(tenantId: string): Promise<AdminTenant> {
  const { data } = await apiClient.patch<AdminTenant>(`/admin/tenants/${tenantId}/extend-subscription`);
  return data;
}

export async function approveTenantVideo(tenantId: string): Promise<AdminTenant> {
  const { data } = await apiClient.patch<AdminTenant>(`/admin/tenants/${tenantId}/approve-video`);
  return data;
}

export async function rejectTenantVideo(tenantId: string): Promise<AdminTenant> {
  const { data } = await apiClient.patch<AdminTenant>(`/admin/tenants/${tenantId}/reject-video`);
  return data;
}

export async function fetchSuperadminAccessList(): Promise<SuperadminAccessEntry[]> {
  const { data } = await apiClient.get<SuperadminAccessEntry[]>('/admin/superadmin-access');
  return data;
}

export async function grantSuperadminAccess(email: string): Promise<SuperadminAccessEntry> {
  const { data } = await apiClient.post<SuperadminAccessEntry>('/admin/superadmin-access', { email });
  return data;
}

export async function revokeSuperadminAccess(email: string): Promise<void> {
  await apiClient.delete(`/admin/superadmin-access/${encodeURIComponent(email)}`);
}
