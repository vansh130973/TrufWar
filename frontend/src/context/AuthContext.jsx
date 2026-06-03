import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session from localStorage
  useEffect(() => {
    const token = localStorage.getItem('turfwar_token');
    const savedUser = localStorage.getItem('turfwar_user');
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
        // Re-validate token in background
        api.get('/auth/me').then(res => {
          setUser(res.data.user);
          localStorage.setItem('turfwar_user', JSON.stringify(res.data.user));
        }).catch(() => {
          localStorage.removeItem('turfwar_token');
          localStorage.removeItem('turfwar_user');
          setUser(null);
        });
      } catch {
        setUser(null);
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token, user } = res.data;
    localStorage.setItem('turfwar_token', token);
    localStorage.setItem('turfwar_user', JSON.stringify(user));
    setUser(user);
    return user;
  }, []);

  const register = useCallback(async (username, email, password) => {
    const res = await api.post('/auth/register', { username, email, password });
    const { token, user } = res.data;
    localStorage.setItem('turfwar_token', token);
    localStorage.setItem('turfwar_user', JSON.stringify(user));
    setUser(user);
    return user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('turfwar_token');
    localStorage.removeItem('turfwar_user');
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data.user);
      localStorage.setItem('turfwar_user', JSON.stringify(res.data.user));
    } catch {}
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
