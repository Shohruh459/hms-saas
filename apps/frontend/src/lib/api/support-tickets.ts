import { apiClient } from './client';
import type { SupportTicket, SupportTicketStatus, SupportTicketType } from './types';

export interface CreateSupportTicketPayload {
  type: SupportTicketType;
  message: string;
}

export async function createSupportTicket(payload: CreateSupportTicketPayload): Promise<SupportTicket> {
  const { data } = await apiClient.post<SupportTicket>('/support-tickets', payload);
  return data;
}

export async function fetchSupportTickets(status?: SupportTicketStatus): Promise<SupportTicket[]> {
  const { data } = await apiClient.get<SupportTicket[]>('/support-tickets', { params: { status } });
  return data;
}

export async function respondSupportTicket(
  id: string,
  response: string,
  status: 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED',
): Promise<SupportTicket> {
  const { data } = await apiClient.patch<SupportTicket>(`/support-tickets/${id}/respond`, { response, status });
  return data;
}
