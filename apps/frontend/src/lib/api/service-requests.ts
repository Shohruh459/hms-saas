import { apiClient } from './client';
import type { ServiceRequest, ServiceRequestStatus } from './types';

export interface CreateServiceRequestPayload {
  roomId: string;
  reason: string;
}

export async function fetchServiceRequests(status?: ServiceRequestStatus): Promise<ServiceRequest[]> {
  const { data } = await apiClient.get<ServiceRequest[]>('/service-requests', { params: { status } });
  return data;
}

export async function createServiceRequest(payload: CreateServiceRequestPayload): Promise<ServiceRequest> {
  const { data } = await apiClient.post<ServiceRequest>('/service-requests/guest', payload);
  return data;
}

export async function adminApproveServiceRequest(
  id: string,
  approve: boolean,
  staffNotes?: string,
): Promise<ServiceRequest> {
  const { data } = await apiClient.patch<ServiceRequest>(`/service-requests/${id}/admin-approve`, {
    approve,
    staffNotes,
  });
  return data;
}

export async function staffFulfillServiceRequest(
  id: string,
  completed: boolean,
  staffNotes?: string,
): Promise<ServiceRequest> {
  const { data } = await apiClient.patch<ServiceRequest>(`/service-requests/${id}/staff-fulfill`, {
    completed,
    staffNotes,
  });
  return data;
}
