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
import {
  clearActivity,
  isSessionIdleExpired,
  touchActivity,
} from "@/lib/auth/session";
import type { Profile } from "@/types/profile";
import type { User } from "@supabase/supabase-js";
import AuthModal from "@/components/auth/AuthModal";

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  logout: () => Promise<void>;
  requireAuth: (onAuthed?: () => void) => boolean;
  openAuthModal: (mode?: "login" | "signup") => void;
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
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<"login" | "signup">(
    "login"
  );
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
    setProfile(null);
    return false;
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    if (supabase) {
      await supabase.auth.signOut();
    }
    clearActivity();
    setUser(null);
    setProfile(null);
  }, [supabase]);

  const initSession = useCallback(async () => {
    if (!supabase) return;

    if (isSessionIdleExpired()) {
      await logout();
      return;
    }

    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) {
      setUser(null);
      setProfile(null);
      return;
    }

    setUser(currentUser);

    let profileOk = false;
    for (let attempt = 0; attempt < 5; attempt++) {
      profileOk = await fetchProfile();
      if (profileOk) break;
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }

    if (!profileOk) {
      await supabase.auth.signOut();
      clearActivity();
      setUser(null);
      setProfile(null);
      return;
    }

    touchActivity();
  }, [supabase, fetchProfile, logout]);

  const refreshProfile = useCallback(async () => {
    await fetchProfile();
  }, [fetchProfile]);

  const openAuthModal = useCallback((mode: "login" | "signup" = "login") => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  }, []);

  const requireAuth = useCallback(
    (onAuthed?: () => void) => {
      if (user && profile) {
        onAuthed?.();
        return true;
      }
      openAuthModal("login");
      return false;
    },
    [user, profile, openAuthModal]
  );

  const handleAuthSuccess = useCallback(async () => {
    if (!supabase) return;

    const {
      data: { session },
    } = await supabase.auth.getSession();

    setUser(session?.user ?? null);

    if (session?.user) {
      setProfile(null);
      let profileOk = false;
      for (let attempt = 0; attempt < 5; attempt++) {
        profileOk = await fetchProfile();
        if (profileOk) break;
        await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
      }

      if (!profileOk) {
        await supabase.auth.signOut();
        clearActivity();
        setUser(null);
        setProfile(null);
        return;
      }

      touchActivity();
      setAuthModalOpen(false);
      return;
    }

    setAuthModalOpen(false);
  }, [supabase, fetchProfile]);

  useEffect(() => {
    if (!shouldAuthenticate || !supabase) return;

    let active = true;

    queueMicrotask(() => {
      void initSession().finally(() => {
        if (active) setAuthLoading(false);
      });
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile();
        touchActivity();
      } else {
        setProfile(null);
      }
    });

    const onActivity = () => touchActivity();
    window.addEventListener("pointerdown", onActivity);
    window.addEventListener("keydown", onActivity);

    return () => {
      active = false;
      subscription.unsubscribe();
      window.removeEventListener("pointerdown", onActivity);
      window.removeEventListener("keydown", onActivity);
    };
  }, [shouldAuthenticate, supabase, initSession, fetchProfile]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        refreshProfile,
        logout,
        requireAuth,
        openAuthModal,
      }}
    >
      {children}
      <AuthModal
        open={authModalOpen}
        mode={authModalMode}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
        onSwitchMode={setAuthModalMode}
      />
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

export function useRequireAuth() {
  const { requireAuth, user } = useAuth();
  return { requireAuth, isLoggedIn: !!user };
}
