import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api, { setAccessToken, setUnauthorizedHandler } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [policy, setPolicy] = useState({ logisticsGlobalScope: true });
  const [loading, setLoading] = useState(true);

  const clearAuth = useCallback(() => {
    setAccessToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearAuth();
    });
  }, [clearAuth]);

  const restoreSession = useCallback(async () => {
    try {
      const res = await api.post('/auth/refresh');
      const { accessToken, user: refreshedUser } = res.data?.data || {};
      if (accessToken && refreshedUser) {
        setAccessToken(accessToken);
        setUser(refreshedUser);
        const meRes = await api.get('/auth/me');
        if (meRes.data?.data?.policy) {
          setPolicy(meRes.data.data.policy);
        }
      } else {
        clearAuth();
      }
    } catch {
      clearAuth();
    } finally {
      setLoading(false);
    }
  }, [clearAuth]);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  const login = useCallback(async ({ username, password }) => {
    const res = await api.post('/auth/login', { username, password });
    const { accessToken, user: loggedUser } = res.data.data;
    setAccessToken(accessToken);
    setUser(loggedUser);
    try {
      const meRes = await api.get('/auth/me');
      if (meRes.data?.data?.policy) {
        setPolicy(meRes.data.data.policy);
      }
    } catch {
      // Non-fatal
    }
    return loggedUser;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Clear local state regardless of server response
    } finally {
      clearAuth();
    }
  }, [clearAuth]);

  const value = useMemo(
    () => ({
      user,
      policy,
      loading,
      isAuthenticated: Boolean(user),
      login,
      logout,
      hasRole: (...roles) => Boolean(user && roles.includes(user.role)),
    }),
    [user, policy, loading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
