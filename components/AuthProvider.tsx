"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/profile";
import type { User } from "@supabase/supabase-js";

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signIn: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function subscribeNoop() {
  return () => {};
}

function getClientSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const isClient = useSyncExternalStore(
    subscribeNoop,
    getClientSnapshot,
    getServerSnapshot
  );

  const supabase = useMemo(() => {
    if (!isClient) return null;
    try {
      return createClient();
    } catch {
      return null;
    }
  }, [isClient]);

  const shouldAuthenticate = isClient && supabase !== null;
  const loading = shouldAuthenticate ? authLoading : false;

  const fetchProfile = useCallback(async (): Promise<boolean> => {
    const res = await fetch("/api/profile");
    if (res.ok) {
      const data = await res.json();
      setProfile(data.profile);
      return true;
    }
    return false;
  }, []);

  const signIn = useCallback(async () => {
    if (!supabase) return;

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      const { error } = await supabase.auth.signInAnonymously();
      if (error) {
        console.error("익명 로그인 실패:", error.message);
        return;
      }
    }

    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();
    setUser(currentUser);

    if (currentUser) {
      // 가입 트리거가 프로필을 만드는 동안 짧게 재시도한다.
      for (let attempt = 0; attempt < 5; attempt++) {
        const ok = await fetchProfile();
        if (ok) break;
        await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
      }
    }
  }, [supabase, fetchProfile]);

  const refreshProfile = useCallback(async () => {
    await fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (!shouldAuthenticate || !supabase) return;

    let active = true;

    queueMicrotask(() => {
      void signIn().finally(() => {
        if (active) setAuthLoading(false);
      });
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile();
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [shouldAuthenticate, supabase, signIn, fetchProfile]);

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, refreshProfile, signIn }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
