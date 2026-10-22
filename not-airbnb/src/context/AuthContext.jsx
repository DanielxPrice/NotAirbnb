import React, { createContext, useContext, useEffect, useState } from 'react';
import { previewMode } from '../preview';
import { api } from '../api';
const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    api('/auth/me').then(data => { if (active) setUser(data.user); }).catch(e => {
      if (active && e.status !== 401) setError('Unable to restore your session. Check the connection and refresh.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const login = async (email, password) => { const data = await api('/auth/login', { method: 'POST', body: { email, password } }); setUser(data.user); setError(''); };
  const register = async (email, password, role) => { const data = await api('/auth/register', { method: 'POST', body: { email, password, role } }); setUser(data.user); setError(''); };
  const logout = async () => { await api('/auth/logout', { method: 'POST' }); setUser(null); };
  const updateProfile = async name => { const data = await api('/auth/me', { method: 'PATCH', body: { name } }); setUser(data.user); };
  return <AuthContext.Provider value={{ isPreview: Boolean(previewMode()), user, currentUser: user, loading, login, register, logout, updateProfile }}>
    {error && <p role="alert" className="p-4 text-red-700">{error}</p>}{children}
  </AuthContext.Provider>;
};
