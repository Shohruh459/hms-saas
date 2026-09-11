import { apiClient } from './client';
import type { AdminFeedback, FeedbackWithAiReply, MyFeedbackTicket } from './types';

export interface SubmitFeedbackPayload {
  message: string;
  roomNumber?: string;
  guestPhone?: string;
  guestName?: string;
}

export async function submitFeedback(payload: SubmitFeedbackPayload): Promise<FeedbackWithAiReply> {
  const { data } = await apiClient.post<FeedbackWithAiReply>('/feedback/ai-chat', payload);
  return data;
}

export async function fetchMyFeedbackTickets(phone: string): Promise<MyFeedbackTicket[]> {
  const { data } = await apiClient.get<MyFeedbackTicket[]>('/feedback/my-tickets', { params: { phone } });
  return data;
}

export async function fetchAdminFeedbacks(): Promise<AdminFeedback[]> {
  const { data } = await apiClient.get<AdminFeedback[]>('/admin/feedbacks');
  return data;
}

export async function replyToFeedback(id: string, reply: string): Promise<AdminFeedback> {
  const { data } = await apiClient.post<AdminFeedback>(`/admin/feedbacks/${id}/reply`, { reply });
  return data;
}
