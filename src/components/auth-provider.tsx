"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase/client";
import type { Employee, Profile } from "@/types";

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  employee: Employee | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUser = useCallback(async (activeSession: Session | null) => {
    setSession(activeSession);

    if (!activeSession) {
      setProfile(null);
      setEmployee(null);
      setLoading(false);
      return;
    }

    const supabase = getSupabase();
    const [profileResult, employeeResult] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", activeSession.user.id).maybeSingle(),
      supabase.from("employees").select("*").eq("profile_id", activeSession.user.id).maybeSingle(),
    ]);

    if (profileResult.error) {
      setError(profileResult.error.message);
    } else {
      setProfile(profileResult.data as Profile | null);
      setError(null);
    }

    setEmployee((employeeResult.data as Employee | null) ?? null);
    setLoading(false);
  }, []);

  const refresh = useCallback(async () => {
    const supabase = getSupabase();
    const { data } = await supabase.auth.getSession();
    await loadUser(data.session);
  }, [loadUser]);

  const signOut = useCallback(async () => {
    await getSupabase().auth.signOut();
    setSession(null);
    setProfile(null);
    setEmployee(null);
  }, []);

  useEffect(() => {
    let mounted = true;

    try {
      const supabase = getSupabase();

      supabase.auth
        .getSession()
        .then(({ data }) => {
          if (mounted) void loadUser(data.session);
        })
        .catch((err: Error) => {
          if (!mounted) return;
          setError(err.message);
          setLoading(false);
        });

      const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        if (!mounted) return;
        void loadUser(nextSession);
      });

      return () => {
        mounted = false;
        subscription.subscription.unsubscribe();
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat konfigurasi.");
      setLoading(false);
      return;
    }
  }, [loadUser]);

  return (
    <AuthContext.Provider
      value={{ session, profile, employee, loading, error, refresh, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
