import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export type UserRole = 'learner' | 'coach' | 'admin';

export type Profile = {
  id: string;
  role: UserRole;
  full_name: string | null;
  cohort_code: string | null;
};

type AuthState = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  /** Boot loading only. After boot, token refresh/profile refresh must not block rendering. */
  loading: boolean;
  signInWithPassword: (email: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  signUpWithPassword: (email: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

async function fetchProfile(userId: string): Promise<Profile | null> {
  // Some environments can "hang" when a tab is backgrounded or network is flaky.
  // Add a short timeout so we never leave the app stuck in a global Loading state.
  const withTimeout = <T,>(p: Promise<T>, ms = 6000): Promise<T> =>
    Promise.race([
      p,
      new Promise<T>((_resolve, reject) => setTimeout(() => reject(new Error('profile_fetch_timeout')), ms)),
    ]);

  try {
    const { data, error } = await withTimeout(
      supabase
        .from('profiles')
        .select('id, role, full_name, cohort_code')
        .eq('id', userId)
        .maybeSingle()
    );
    if (error) return null;
    return (data as Profile) ?? null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let refreshSeq = 0;

    const refreshProfile = async (u: User | null) => {
      const seq = ++refreshSeq;
      if (!u?.id) {
        if (mounted) setProfile(null);
        return;
      }
      const p = await fetchProfile(u.id);
      // Ignore stale refreshes
      if (!mounted || seq !== refreshSeq) return;
      setProfile(p);
    };

    (async () => {
      setLoading(true);
      try {
        const { data } = await supabase.auth.getSession();
        const s = data.session ?? null;
        if (!mounted) return;
        setSession(s);
        setUser(s?.user ?? null);
        await refreshProfile(s?.user ?? null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      // Do not block the UI on token refresh / focus changes.
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      await refreshProfile(nextSession?.user ?? null);
    });

    // When returning to the tab, quietly re-check session/profile without showing a global loader.
    const onVis = async () => {
      if (document.visibilityState !== 'visible') return;
      const { data } = await supabase.auth.getSession();
      const s = data.session ?? null;
      if (!mounted) return;
      setSession(s);
      setUser(s?.user ?? null);
      await refreshProfile(s?.user ?? null);
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      session,
      user,
      profile,
      loading,
      signInWithPassword: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return { ok: false, message: error.message };
        return { ok: true };
      },
      signUpWithPassword: async (email, password) => {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            // If email confirmation is enabled, users will be redirected here after verifying.
            emailRedirectTo: `${window.location.origin}/#/login`,
          },
        });
        if (error) return { ok: false, message: error.message };
        return { ok: true };
      },
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [session, user, profile, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
