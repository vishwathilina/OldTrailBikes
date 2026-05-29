'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { auth as authApi, ApiClientError } from '@/lib/api';
import type { User, AuthTokens } from '@/lib/types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    preferredLanguage?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

const ACCESS_KEY = 'otb_access_token';
const REFRESH_KEY = 'otb_refresh_token';

function saveTokens(tokens: AuthTokens) {
  localStorage.setItem(ACCESS_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
}

function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem(ACCESS_KEY);
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      const { user: me } = await authApi.me();
      setUser(me);
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 401) {
        // Try refresh token
        const refreshToken = localStorage.getItem(REFRESH_KEY);
        if (refreshToken) {
          try {
            const { tokens } = await authApi.refresh(refreshToken);
            saveTokens(tokens);
            const { user: me } = await authApi.me();
            setUser(me);
          } catch {
            clearTokens();
            setUser(null);
          }
        } else {
          clearTokens();
          setUser(null);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const payload = await authApi.login({ email, password });
    saveTokens(payload.tokens);
    setUser(payload.user);
  }, []);

  const register = useCallback(async (data: Parameters<typeof authApi.register>[0]) => {
    const payload = await authApi.register(data);
    saveTokens(payload.tokens);
    setUser(payload.user);
  }, []);

  const logout = useCallback(async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    clearTokens();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
