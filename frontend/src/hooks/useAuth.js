import { useState, useCallback } from 'react';
import { api } from '../lib/api';

function tokenVigente() {
  const token = localStorage.getItem('token');
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export function useAuth() {
  const [usuario, setUsuario] = useState(() => {
    try {
      if (!tokenVigente()) {
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        return null;
      }
      const stored = localStorage.getItem('usuario');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const login = useCallback(async (email, password) => {
    const data = await api.post('/api/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('usuario', JSON.stringify(data.usuario));
    setUsuario(data.usuario);
    return data.usuario;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setUsuario(null);
  }, []);

  return { usuario, login, logout, isAuthenticated: !!usuario };
}
