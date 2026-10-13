"use client";

import { useEffect, useState } from "react";
import AnnouncementCard from "@/components/announcements/AnnouncementCard";
import OverlayPortal from "@/components/layout/OverlayPortal";
import MySubpageHeader from "@/components/my/MySubpageHeader";
import { formatActivityDate } from "@/lib/formatDate";
import type { PublicAnnouncement } from "@/types/announcement";

export default function NoticesPage() {
  const [announcements, setAnnouncements] = useState<PublicAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<PublicAnnouncement | null>(null);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      void (async () => {
        try {
          const res = await fetch("/api/announcements", { cache: "no-store" });
          const data = await res.json();
          if (cancelled) return;
          if (res.ok) {
            setAnnouncements(data.announcements ?? []);
          } else {
            setError(data.error ?? "공지를 불러오지 못했어요.");
          }
        } catch {
          if (!cancelled) setError("공지를 불러오지 못했어요.");
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="h-dvh overflow-y-auto bg-gray-50 pb-safe">
      <div className="max-w-lg mx-auto px-4 pt-page pb-6">
        <MySubpageHeader title="공지사항" />

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <p className="text-center text-sm text-red-500 py-12">{error}</p>
        ) : announcements.length === 0 ? (
          <p className="text-center text-sm text-gray-500 py-12">
            등록된 공지가 없어요
          </p>
        ) : (
          <div className="space-y-2">
            {announcements.map((announcement) => (
              <button
                key={announcement.id}
                type="button"
                onClick={() => setSelected(announcement)}
                className="block w-full text-left bg-white border border-gray-100 rounded-2xl px-4 py-3.5"
              >
                <p className="text-sm font-bold text-gray-900 break-words">
                  {announcement.title}
                </p>
                <p className="text-xs text-gray-400 mt-1.5">
                  {formatActivityDate(announcement.published_at)}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <OverlayPortal>
          <div
            className="fixed inset-0 z-[55] flex items-center justify-center p-6"
            role="dialog"
            aria-modal="true"
            aria-label={selected.title}
          >
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setSelected(null)}
            />
            <AnnouncementCard
              title={selected.title}
              body={selected.body}
              footer={
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="w-full py-3 rounded-2xl bg-gray-900 text-white text-sm font-bold"
                >
                  닫기
                </button>
              }
            />
          </div>
        </OverlayPortal>
      )}
    </div>
  );
}
