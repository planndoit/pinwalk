"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createClient } from "@/lib/supabase/client";
import {
  clearActivity,
  isSessionIdleExpired,
  touchActivity,
} from "@/lib/auth/session";
import {
  clearNativeSession,
  loadNativeSession,
  persistNativeSession,
} from "@/lib/auth/nativeSession";
import type { AuthSuccessPayload } from "@/types/authClient";
import type { Profile } from "@/types/profile";
import type { User } from "@supabase/supabase-js";
import AuthModal from "@/components/auth/AuthModal";

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  setProfilePoints: (points: number) => void;
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

function sameUser(prev: User | null, next: User | null): boolean {
  if (prev === next) return true;
  if (!prev || !next) return false;
  return prev.id === next.id;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<"login" | "signup">(
    "login"
  );
  const userRef = useRef<User | null>(null);
  const profileRef = useRef<Profile | null>(null);
  const lastProfileFetchAtRef = useRef(0);
  const isClient = useSyncExternalStore(
    subscribeNoop,
    getClientSnapshot,
    getServerSnapshot
  );

  useEffect(() => {
    userRef.current = user;
    profileRef.current = profile;
  }, [user, profile]);

  const supabase = useMemo(() => {
    if (!isClient) return null;
    try {
      return createClient();
    } catch {
      return null;
    }
  }, [isClient]);

  const shouldAuthenticate = isClient && supabase !== null;
  const loading = !isClient || (shouldAuthenticate ? authLoading : false);

  const fetchProfile = useCallback(
    async (options?: { clearOnFailure?: boolean }): Promise<boolean> => {
      const clearOnFailure = options?.clearOnFailure === true;
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const data = await res.json();
          setProfile(data.profile);
          lastProfileFetchAtRef.current = Date.now();
          return true;
        }
        if (clearOnFailure || res.status === 401 || res.status === 404) {
          setProfile(null);
        }
        return false;
      } catch {
        if (clearOnFailure) {
          setProfile(null);
        }
        return false;
      }
    },
    []
  );

  const loadProfileWithRetry = useCallback(async () => {
    for (let attempt = 0; attempt < 5; attempt++) {
      const profileOk = await fetchProfile();
      if (profileOk) return true;
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
    return false;
  }, [fetchProfile]);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      if (supabase) {
        await supabase.auth.signOut();
      }
      await clearNativeSession();
    } finally {
      clearActivity();
      lastProfileFetchAtRef.current = 0;
      setUser(null);
      setProfile(null);
    }
  }, [supabase]);

  const initSession = useCallback(async () => {
    if (!supabase) return;

    if (isSessionIdleExpired()) {
      await logout();
      return;
    }

    let {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (!currentUser) {
      const stored = await loadNativeSession();
      if (stored) {
        const { error } = await supabase.auth.setSession(stored);
        if (error) {
          await clearNativeSession();
        } else {
          const restored = await supabase.auth.getUser();
          currentUser = restored.data.user;
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (session) {
            await persistNativeSession(session);
          }
        }
      }
    }

    if (!currentUser) {
      setUser(null);
      setProfile(null);
      return;
    }

    setUser((prev) => (sameUser(prev, currentUser) ? prev : currentUser));
    await loadProfileWithRetry();
    touchActivity();

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) {
      await persistNativeSession(session);
    }
  }, [supabase, loadProfileWithRetry, logout]);

  const refreshProfile = useCallback(async () => {
    await fetchProfile();
  }, [fetchProfile]);

  const setProfilePoints = useCallback((points: number) => {
    setProfile((prev) => (prev ? { ...prev, points } : prev));
  }, []);

  const openAuthModal = useCallback((mode: "login" | "signup" = "login") => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  }, []);

  const requireAuth = useCallback(
    (onAuthed?: () => void) => {
      if (userRef.current && profileRef.current) {
        onAuthed?.();
        return true;
      }
      openAuthModal("login");
      return false;
    },
    [openAuthModal]
  );

  const handleAuthSuccess = useCallback(
    async (payload?: AuthSuccessPayload) => {
      setAuthModalOpen(false);

      if (payload?.profile) {
        setProfile(payload.profile);
      }

      if (!supabase) return;

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        setUser((prev) =>
          sameUser(prev, session.user) ? prev : session.user
        );
        touchActivity();
        void persistNativeSession(session);
      }

      if (!payload?.profile) {
        void loadProfileWithRetry();
      }
    },
    [supabase, loadProfileWithRetry]
  );

  if (authModalOpen && user && profile) {
    setAuthModalOpen(false);
  }

  useEffect(() => {
    if (!shouldAuthenticate || !supabase) return;

    let active = true;

    queueMicrotask(() => {
      void initSession().finally(() => {
        if (active) setAuthLoading(false);
      });
    });

    const PROFILE_REFRESH_TTL_MS = 30_000;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser((prev) => (sameUser(prev, nextUser) ? prev : nextUser));

      if (nextUser) {
        void persistNativeSession(session);
        const currentProfile = profileRef.current;
        const identityChanged =
          !currentProfile || currentProfile.id !== nextUser.id;
        const stale =
          Date.now() - lastProfileFetchAtRef.current >= PROFILE_REFRESH_TTL_MS;
        if (identityChanged || stale) {
          void fetchProfile({ clearOnFailure: identityChanged });
        }
        touchActivity();
      } else {
        lastProfileFetchAtRef.current = 0;
        setProfile(null);
      }
    });

    const onActivity = () => touchActivity();
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (!userRef.current) return;
      if (
        Date.now() - lastProfileFetchAtRef.current <
        PROFILE_REFRESH_TTL_MS
      ) {
        return;
      }
      void fetchProfile({ clearOnFailure: false });
    };
    window.addEventListener("pointerdown", onActivity);
    window.addEventListener("keydown", onActivity);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      active = false;
      subscription.unsubscribe();
      window.removeEventListener("pointerdown", onActivity);
      window.removeEventListener("keydown", onActivity);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [shouldAuthenticate, supabase, initSession, fetchProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      refreshProfile,
      setProfilePoints,
      logout,
      requireAuth,
      openAuthModal,
    }),
    [
      user,
      profile,
      loading,
      refreshProfile,
      setProfilePoints,
      logout,
      requireAuth,
      openAuthModal,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
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
