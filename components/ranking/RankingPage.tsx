"use client";

import { useCallback, useEffect, useState } from "react";
import type { RankingEntry, RankingType } from "@/types/ranking";

const TABS: {
  type: RankingType;
  label: string;
  unit: string;
  description: string;
}[] = [
  {
    type: "combat_power",
    label: "전투력",
    unit: "P",
    description: "지금 보유 중인 깃발에 투자한 포인트 합계입니다.",
  },
  {
    type: "active_pins",
    label: "현재 깃발",
    unit: "개",
    description: "지도에 남아 있는 내 깃발 수입니다.",
  },
  {
    type: "total_earned",
    label: "누적 포인트",
    unit: "P",
    description: "지금까지 획득한 포인트의 총합입니다.",
  },
  {
    type: "earn_count",
    label: "포인트 획득",
    unit: "회",
    description: "포인트를 획득한 횟수입니다.",
  },
  {
    type: "conquers",
    label: "점령 수",
    unit: "회",
    description: "다른 사람의 깃발을 점령에 성공한 횟수입니다.",
  },
];

function rankStyle(rank: number) {
  if (rank === 1) {
    return "bg-gradient-to-r from-amber-100 to-yellow-50 border-amber-300 ring-2 ring-amber-300/60";
  }
  if (rank === 2) {
    return "bg-gradient-to-r from-slate-100 to-gray-50 border-slate-300 ring-2 ring-slate-300/50";
  }
  if (rank === 3) {
    return "bg-gradient-to-r from-orange-100 to-amber-50 border-orange-300 ring-2 ring-orange-300/50";
  }
  if (rank <= 10) {
    return "bg-blue-50/80 border-blue-100";
  }
  return "bg-white border-gray-100";
}

function rankBadge(rank: number) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return String(rank);
}

export default function RankingPage() {
  const [activeType, setActiveType] = useState<RankingType>("combat_power");
  const [entries, setEntries] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRanking = useCallback(async (type: RankingType) => {
    setLoading(true);
    const res = await fetch(`/api/ranking?type=${type}`);
    if (res.ok) {
      const data = await res.json();
      setEntries(data.entries ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void fetchRanking(activeType);
    });
  }, [activeType, fetchRanking]);

  const activeTab = TABS.find((tab) => tab.type === activeType)!;

  return (
    <div className="h-dvh overflow-y-auto bg-gray-50 pb-[calc(6.5rem+env(safe-area-inset-bottom))]">
      <div className="max-w-lg mx-auto">
        <header className="px-4 pt-safe pb-3 bg-white border-b border-gray-100">
          <h1 className="text-xl font-extrabold text-gray-900 mt-3">랭킹</h1>
          <p className="text-xs text-gray-400 mt-1">상위 100위까지 표시됩니다</p>
        </header>

        <div className="px-4 pt-3 pb-2">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {TABS.map((tab) => (
              <button
                key={tab.type}
                onClick={() => setActiveType(tab.type)}
                className={`shrink-0 px-3 py-2 rounded-full text-xs font-bold transition-colors ${
                  activeType === tab.type
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-500 border border-gray-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <p className="mt-2.5 text-xs text-gray-500 leading-relaxed">
            {activeTab.description}
          </p>
        </div>

        <div className="px-4 pb-4 space-y-2">
          {loading ? (
            <div className="py-16 text-center text-gray-400 text-sm">불러오는 중...</div>
          ) : entries.length === 0 ? (
            <div className="py-16 text-center text-gray-400 text-sm">
              아직 랭킹 데이터가 없습니다.
            </div>
          ) : (
            entries.map((entry) => (
              <div
                key={`${activeType}-${entry.user_id}`}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${rankStyle(entry.rank)}`}
              >
                <div
                  className={`w-9 text-center font-extrabold ${
                    entry.rank <= 3 ? "text-lg" : entry.rank <= 10 ? "text-blue-600" : "text-gray-500"
                  }`}
                >
                  {rankBadge(entry.rank)}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`truncate font-bold ${
                      entry.rank <= 3
                        ? "text-gray-900 text-base"
                        : entry.rank <= 10
                          ? "text-gray-800"
                          : "text-gray-700"
                    }`}
                  >
                    {entry.nickname}
                  </p>
                  <p className="text-xs text-gray-400">{activeTab.label}</p>
                </div>
                <p
                  className={`font-extrabold tabular-nums ${
                    entry.rank <= 3 ? "text-lg text-gray-900" : "text-base text-gray-800"
                  }`}
                >
                  {entry.value.toLocaleString()}
                  <span className="text-xs font-semibold text-gray-400 ml-0.5">
                    {activeTab.unit}
                  </span>
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
