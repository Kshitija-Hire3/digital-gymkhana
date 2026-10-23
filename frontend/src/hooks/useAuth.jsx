import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, tokenStore, setUnauthorizedHandler } from '../services/api.js';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const clear = useCallback(() => { tokenStore.clear(); setUser(null); }, []);
  useEffect(() => { setUnauthorizedHandler(clear); }, [clear]);
  useEffect(() => {
    if (!tokenStore.get()) { setReady(true); return; }
    api.get('/auth/me').then(setUser).catch(clear).finally(() => setReady(true));
  }, [clear]);
  const login = useCallback(async (kind, creds) => {
    const r = await api.post(`/auth/${kind}/login`, creds);
    tokenStore.set(r.token); setUser(r.user); return r.user;
  }, []);
  const logout = useCallback(async () => { try { await api.post('/auth/logout'); } catch { /* token may already be invalid */ } clear(); }, [clear]);
  const value = useMemo(() => ({ user, ready, login, logout, isAdmin: !!user && user.role !== 'student', isStudent: user?.role === 'student' }), [user, ready, login, logout]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
