"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ActivityTimeline from "@/components/ActivityTimeline";
import { useAuth } from "@/components/AuthProvider";
import NotificationBell from "@/components/notifications/NotificationBell";
import ProfileEditorSection from "@/components/my/ProfileEditorSection";
import { useSubmitLock } from "@/lib/useSubmitLock";
import type { TimelineEvent, UserStats } from "@/types/ranking";

export default function MyPage() {
  const {
    user,
    profile,
    refreshProfile,
    logout,
    loading: authLoading,
    openAuthModal,
  } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const { locked: saving, run: runSave } = useSubmitLock();
  const [toast, setToast] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const fetchingTimelineRef = useRef(false);

  const fetchStats = useCallback(async () => {
    const res = await fetch("/api/my/stats");
    if (res.ok) {
      const data = await res.json();
      setStats(data.stats);
    }
  }, []);

  const fetchTimeline = useCallback(
    async (before?: string, append = false) => {
      if (fetchingTimelineRef.current) return;
      fetchingTimelineRef.current = true;
      setTimelineLoading(true);
      const params = new URLSearchParams({ limit: "20" });
      if (before) params.set("before", before);
      const res = await fetch(`/api/my/timeline?${params}`);
      if (res.ok) {
        const data = await res.json();
  const newEvents = ((data.events ?? []) as TimelineEvent[]).map((event) => ({
          ...event,
          amount:
            event.amount == null || Number.isNaN(Number(event.amount))
              ? null
              : Number(event.amount),
        }));
        setEvents((prev) => (append ? [...prev, ...newEvents] : newEvents));
        setHasMore(newEvents.length === 20);
      }
      setTimelineLoading(false);
      fetchingTimelineRef.current = false;
    },
    []
  );

  useEffect(() => {
    if (authLoading || user) return;
    router.replace("/");
    openAuthModal("login");
  }, [authLoading, user, router, openAuthModal]);

  useEffect(() => {
    if (!user) return;
    queueMicrotask(() => {
      void fetchStats();
      void fetchTimeline();
    });
  }, [user, fetchStats, fetchTimeline]);

  useEffect(() => {
    if (!loadMoreRef.current || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !timelineLoading && events.length > 0) {
          const last = events[events.length - 1];
          void fetchTimeline(last.created_at, true);
        }
      },
      { rootMargin: "120px" }
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [events, hasMore, timelineLoading, fetchTimeline]);

  useEffect(() => {
    if (!menuOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  };

  const handleSaveProfile = async (payload: {
    nickname: string;
    avatar?: { base64: string; mime: string };
  }) => {
    await runSave(async () => {
      const body: Record<string, unknown> = { nickname: payload.nickname };
      if (payload.avatar) {
        body.avatar_base64 = payload.avatar.base64;
        body.avatar_mime = payload.avatar.mime;
      }

      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        showToast(data.error ?? "저장에 실패했습니다.");
        return "release";
      }

      await refreshProfile();
      showToast("프로필이 저장되었습니다.");
      return "release";
    });
  };

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    router.replace("/");
  };

  if (authLoading) {
    return (
      <div className="h-dvh flex items-center justify-center bg-gray-50">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  return (
    <div className="h-dvh overflow-y-auto bg-gray-50 pb-[calc(6.5rem+env(safe-area-inset-bottom))]">
      <div className="max-w-lg mx-auto">
        <header className="px-4 pt-safe pb-4 bg-white border-b border-gray-100">
          <div className="flex items-center justify-between mt-3">
            <h1 className="text-xl font-extrabold text-gray-900">마이페이지</h1>
            <div className="flex items-center gap-0.5">
              <NotificationBell />
              <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100"
                aria-label="설정"
                aria-expanded={menuOpen}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </button>
              {menuOpen ? (
                <div className="absolute right-0 mt-1 w-36 bg-white rounded-xl border border-gray-100 shadow-lg overflow-hidden z-20">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      router.push("/my/settings");
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-50"
                  >
                    설정
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleLogout()}
                    className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-50 border-t border-gray-100"
                  >
                    로그아웃
                  </button>
                </div>
              ) : null}
            </div>
            </div>
          </div>
        </header>

        <ProfileEditorSection
          key={profile.updated_at}
          profile={profile}
          saving={saving}
          onSave={handleSaveProfile}
          onError={showToast}
        />

        <section className="px-4 pt-4">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl px-5 py-5 text-center shadow-lg shadow-blue-600/20">
            <p className="text-xs text-blue-100 font-medium">현재 포인트</p>
            <p className="text-4xl font-extrabold text-white mt-1 tabular-nums">
              {profile.points.toLocaleString()}
              <span className="text-lg font-bold ml-1">P</span>
            </p>
            <p className="text-xs text-blue-100/80 mt-1.5 flex items-center justify-center gap-2">
              <span>
                누적 획득 {(stats?.total_earned ?? 0).toLocaleString()}P
              </span>
              <span className="text-blue-200/50">·</span>
              <span>{(stats?.earn_count ?? 0).toLocaleString()}회</span>
            </p>
          </div>
        </section>

        <section className="px-4 pt-2">
          <Link
            href="/coupons"
            className="flex items-center justify-between bg-white border border-violet-100 rounded-2xl px-4 py-4 shadow-sm"
          >
            <div>
              <p className="text-sm font-bold text-gray-900">쿠폰함</p>
              <p className="text-xs text-gray-500 mt-0.5">프리미엄 장소 쿠폰 확인</p>
            </div>
            <span className="text-violet-600 text-sm font-semibold">보기</span>
          </Link>
        </section>

        <section className="px-4 py-4">
          <h2 className="text-sm font-bold text-gray-800 mb-3">나의 활동</h2>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white rounded-2xl border border-gray-100 px-3 py-3">
              <p className="text-[11px] text-gray-400">현재 깃발</p>
              <p className="text-lg font-extrabold text-gray-900 tabular-nums mt-0.5">
                {(stats?.active_pins ?? 0).toLocaleString()}
                <span className="text-xs font-semibold text-gray-400 ml-0.5">개</span>
              </p>
              <p className="text-[11px] text-gray-400 mt-1">
                누적{" "}
                <span className="font-semibold text-gray-600">
                  {(stats?.total_pins ?? 0).toLocaleString()}개
                </span>
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 px-3 py-3">
              <p className="text-[11px] text-gray-400">전투력</p>
              <p className="text-lg font-extrabold text-gray-900 tabular-nums mt-0.5">
                {(stats?.combat_power ?? 0).toLocaleString()}
                <span className="text-xs font-semibold text-gray-400 ml-0.5">P</span>
              </p>
              <p className="text-[11px] text-gray-400 mt-1">
                보유 깃발 투자 합
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 px-3 py-3">
              <p className="text-[11px] text-gray-400">점령 수</p>
              <p className="text-lg font-extrabold text-gray-900 tabular-nums mt-0.5">
                {(
                  (stats?.conquers ?? 0) + (stats?.conquer_fails ?? 0)
                ).toLocaleString()}
                <span className="text-xs font-semibold text-gray-400 ml-0.5">회</span>
              </p>
              <p className="text-[11px] text-gray-400 mt-1">
                성공{" "}
                <span className="font-semibold text-emerald-600">
                  {(stats?.conquers ?? 0).toLocaleString()}
                </span>
                <span className="mx-1 text-gray-300">·</span>
                실패{" "}
                <span className="font-semibold text-red-500">
                  {(stats?.conquer_fails ?? 0).toLocaleString()}
                </span>
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 px-3 py-3">
              <p className="text-[11px] text-gray-400">출석</p>
              <p className="text-lg font-extrabold text-gray-900 tabular-nums mt-0.5">
                {(stats?.attendance_count ?? 0).toLocaleString()}
                <span className="text-xs font-semibold text-gray-400 ml-0.5">회</span>
              </p>
              <p className="text-[11px] text-gray-400 mt-1">
                연속{" "}
                <span className="font-semibold text-gray-600">
                  {(stats?.attendance_streak ?? 0).toLocaleString()}일
                </span>
              </p>
            </div>
          </div>
        </section>

        <section className="px-4 pb-6">
          <h2 className="text-sm font-bold text-gray-800 mb-3">활동 내역</h2>
          <ActivityTimeline events={events} />
          <div ref={loadMoreRef} className="h-8" />
          {timelineLoading && (
            <p className="text-center text-xs text-gray-400 py-3">더 불러오는 중...</p>
          )}
          {!hasMore && events.length > 0 && (
            <p className="text-center text-xs text-gray-300 py-3">모든 활동을 불러왔습니다</p>
          )}
        </section>
      </div>

      {toast && (
        <div className="fixed top-20 left-0 right-0 z-50 flex justify-center pointer-events-none">
          <p className="bg-gray-900/90 text-white text-sm px-4 py-2 rounded-full">
            {toast}
          </p>
        </div>
      )}
    </div>
  );
}
