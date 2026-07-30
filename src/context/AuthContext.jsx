import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import * as authService from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfileForSession = useCallback(async (session) => {
    if (!session?.user) {
      setUser(null);
      return;
    }
    const profile = await authService.getProfile(session.user.id);
    setUser(profile);
  }, []);

  useEffect(() => {
    let active = true;

    authService.getCurrentSession().then(async (session) => {
      if (!active) return;
      await loadProfileForSession(session);
      setLoading(false);
    });

    // This is the single source of truth for auth state — it fires for
    // sign-in, sign-out, token refresh, AND the redirect back from Google
    // OAuth, so every one of those cases is handled in one place.
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      loadProfileForSession(session);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [loadProfileForSession]);

  const refresh = useCallback(async () => {
    const session = await authService.getCurrentSession();
    await loadProfileForSession(session);
  }, [loadProfileForSession]);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    isBanned: user?.status === 'banned',
    isSuspended: user?.status === 'suspended',
    role: user?.role || 'guest',
    logout,
    refresh,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
