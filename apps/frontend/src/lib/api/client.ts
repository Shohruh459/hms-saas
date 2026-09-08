import axios from 'axios';

const TOKEN_KEY = 'hms_access_token';
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(TOKEN_KEY);
}

export const apiClient = axios.create({ baseURL: API_URL });

apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const tenantId = process.env.NEXT_PUBLIC_TENANT_ID;
  if (tenantId) {
    config.headers['x-tenant-id'] = tenantId;
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const currentToken = getToken();
  if (!currentToken) return null;

  try {
    const res = await axios.post<{ accessToken: string }>(
      `${API_URL}/auth/refresh`,
      {},
      { headers: { Authorization: `Bearer ${currentToken}` } },
    );
    setToken(res.data.accessToken);
    return res.data.accessToken;
  } catch {
    clearToken();
    return null;
  }
}

declare module 'axios' {
  export interface AxiosRequestConfig {
    _retry?: boolean;
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      refreshPromise = refreshPromise ?? refreshAccessToken();
      const newToken = await refreshPromise;
      refreshPromise = null;

      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('hms:session-expired'));
      }
    }
    return Promise.reject(error);
  },
);
