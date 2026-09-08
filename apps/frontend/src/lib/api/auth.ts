import { apiClient } from './client';
import type { AuthResponse, UserRole } from './types';

export interface RegisterPayload {
  fullName: string;
  email?: string;
  phone?: string;
  password: string;
  role?: UserRole;
  tenantId?: string;
}

export interface LoginPayload {
  email?: string;
  phone?: string;
  password: string;
}

export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth/register', payload);
  return data;
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth/login', payload);
  return data;
}

export async function fetchCurrentUser() {
  const { data } = await apiClient.get('/auth/me');
  return data;
}
