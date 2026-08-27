import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  clearToken,
  clearUser,
  getToken,
  getUser,
  http,
  onUnauthorized,
  setToken,
  setUser,
  type StoredUser,
} from '../api';

interface LoginResponseData {
  accessToken: string;
  user: StoredUser;
}

export interface SessionContextValue {
  user: StoredUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<StoredUser | null>(() =>
    getToken() ? getUser() : null,
  );

  useEffect(() => onUnauthorized(() => setUserState(null)), []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await http.post<LoginResponseData>('/auth/login', { email, password });
    setToken(result.accessToken);
    setUser(result.user);
    setUserState(result.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await http.post('/auth/logout');
    } finally {
      clearToken();
      clearUser();
      setUserState(null);
    }
  }, []);

  const value = useMemo(() => ({ user, login, logout }), [user, login, logout]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
