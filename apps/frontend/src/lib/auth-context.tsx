'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { fetchCurrentUser, login as loginApi, register as registerApi, type LoginPayload, type RegisterPayload } from './api/auth';
import { clearToken, getToken, setToken } from './api/client';
import { disconnectSocket } from './socket';
import type { User } from './api/types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (payload: LoginPayload) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    clearToken();
    disconnectSocket();
    setUser(null);
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    fetchCurrentUser()
      .then((data) => setUser(data as User))
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    window.addEventListener('hms:session-expired', logout);
    return () => window.removeEventListener('hms:session-expired', logout);
  }, [logout]);

  const login = useCallback(async (payload: LoginPayload) => {
    const res = await loginApi(payload);
    setToken(res.accessToken);
    setUser(res.user);
    return res.user;
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const res = await registerApi(payload);
    setToken(res.accessToken);
    setUser(res.user);
    return res.user;
  }, []);

  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth() AuthProvider ichida chaqirilishi kerak');
  }
  return ctx;
}
