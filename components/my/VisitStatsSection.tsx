"use client";

import { useState } from "react";
import VisitMapModal from "@/components/my/VisitMapModal";
import type { VisitStats } from "@/types/visit";

export default function VisitStatsSection({
  visits,
}: {
  visits: VisitStats | null;
}) {
  const [mapOpen, setMapOpen] = useState(false);

  return (
    <section className="px-4 pb-4">
      <h2 className="text-sm font-bold text-gray-800 mb-3">내가 방문한 곳</h2>
      <div className="bg-white rounded-2xl border border-gray-100 px-4 py-4 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-gray-400">방문한 시·군·구</p>
          <p className="text-lg font-extrabold text-gray-900 tabular-nums mt-0.5">
            {visits ? (
              <>
                {visits.visited_count.toLocaleString()}
                <span className="text-xs font-semibold text-gray-400 ml-0.5">
                  / {visits.total_count.toLocaleString()}개
                </span>
              </>
            ) : (
              <span className="text-gray-300">—</span>
            )}
          </p>
          <p className="text-[11px] text-gray-400 mt-1">
            {visits
              ? `${visits.sido_visited_count.toLocaleString()}개 시·도`
              : "기록을 불러오는 중"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setMapOpen(true)}
          className="w-12 h-12 shrink-0 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 active:scale-95 transition-transform"
          aria-label="전국 지도 보기"
        >
          <svg
            viewBox="0 0 24 24"
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          >
            <path d="M9 20l-6 2V6l6-2 6 2 6-2v16l-6 2-6-2z" />
            <path d="M9 4v16M15 6v16" />
          </svg>
        </button>
      </div>
      <VisitMapModal
        open={mapOpen}
        onClose={() => setMapOpen(false)}
        visits={visits}
      />
    </section>
  );
}
