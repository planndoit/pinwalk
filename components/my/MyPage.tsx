"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import ProfileEditorSection from "@/components/my/ProfileEditorSection";
import { formatActivityDate } from "@/lib/formatDate";
import type { TimelineEvent, UserStats } from "@/types/ranking";

const STAT_LABELS: { key: keyof UserStats; label: string; unit: string }[] = [
  { key: "total_earned", label: "누적 포인트", unit: "P" },
  { key: "earn_count", label: "포인트 획득", unit: "회" },
  { key: "active_pins", label: "현재 깃발", unit: "개" },
  { key: "total_pins", label: "누적 깃발", unit: "개" },
  { key: "conquers", label: "점령 수", unit: "회" },
];

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
        const newEvents = (data.events ?? []) as TimelineEvent[];
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
    setSaving(true);
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
    setSaving(false);

    if (!res.ok) {
      showToast(data.error ?? "저장에 실패했습니다.");
      return;
    }

    await refreshProfile();
    showToast("프로필이 저장되었습니다.");
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

        <section className="px-4 py-4">
          <h2 className="text-sm font-bold text-gray-800 mb-3">나의 활동</h2>
          <div className="grid grid-cols-2 gap-2">
            {STAT_LABELS.map((item) => (
              <div
                key={item.key}
                className="bg-white rounded-2xl border border-gray-100 px-3 py-3"
              >
                <p className="text-[11px] text-gray-400">{item.label}</p>
                <p className="text-lg font-extrabold text-gray-900 tabular-nums mt-0.5">
                  {(stats?.[item.key] ?? 0).toLocaleString()}
                  <span className="text-xs font-semibold text-gray-400 ml-0.5">
                    {item.unit}
                  </span>
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="px-4 pb-6">
          <h2 className="text-sm font-bold text-gray-800 mb-3">활동 내역</h2>
          <div className="space-y-0">
            {events.map((event, index) => (
              <div key={`${event.id}-${event.created_at}`} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-2.5 h-2.5 rounded-full mt-2 ${
                      event.event_type === "pin_create"
                        ? "bg-blue-500"
                        : event.event_type === "point_earn"
                          ? "bg-amber-500"
                          : "bg-red-500"
                    }`}
                  />
                  {index < events.length - 1 && (
                    <div className="w-px flex-1 bg-gray-200 my-1" />
                  )}
                </div>
                <div className="flex-1 pb-5">
                  <p className="text-xs text-gray-400">
                    {formatActivityDate(event.created_at)}
                  </p>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">
                    {event.title}
                  </p>
                  <p className="text-sm text-gray-600 mt-0.5">{event.description}</p>
                </div>
              </div>
            ))}
          </div>
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
