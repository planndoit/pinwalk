"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ActivityTimeline from "@/components/ActivityTimeline";
import { useAuth } from "@/components/AuthProvider";
import ProfileEditorSection from "@/components/my/ProfileEditorSection";
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
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
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

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  };

  const handleSaveProfile = async (payload: {
    nickname: string;
    avatar?: { base64: string; mime: string };
  }) => {
    if (saving) return;
    setSaving(true);
    try {
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
        return;
      }

      await refreshProfile();
      showToast("프로필이 저장되었습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
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
            <button
              onClick={handleLogout}
              className="text-xs text-gray-400 font-medium px-2 py-1"
            >
              로그아웃
            </button>
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
