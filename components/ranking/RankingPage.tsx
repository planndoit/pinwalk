"use client";

import { useCallback, useEffect, useState } from "react";
import MainTabHeader from "@/components/layout/MainTabHeader";
import NotificationBell from "@/components/notifications/NotificationBell";
import type { RankingEntry, RankingType } from "@/types/ranking";

type RankTab =
  | { kind: "user"; type: RankingType; label: string; unit: string; description: string }
  | { kind: "crew"; label: string; unit: string; description: string };

const TABS: RankTab[] = [
  {
    kind: "user",
    type: "combat_power",
    label: "전투력",
    unit: "P",
    description: "지금 보유 중인 깃발에 투자한 포인트 합계입니다.",
  },
  {
    kind: "crew",
    label: "크루",
    unit: "P",
    description: "크루 전투력 = 소속 멤버들의 개인 전투력 합입니다.",
  },
  {
    kind: "user",
    type: "active_pins",
    label: "현재 깃발",
    unit: "개",
    description: "지도에 남아 있는 내 깃발 수입니다.",
  },
  {
    kind: "user",
    type: "total_earned",
    label: "누적 포인트",
    unit: "P",
    description: "지금까지 획득한 포인트의 총합입니다. 획득 횟수도 함께 표시됩니다.",
  },
  {
    kind: "user",
    type: "conquers",
    label: "점령 수",
    unit: "회",
    description: "다른 사람의 깃발을 점령에 성공한 횟수입니다.",
  },
];

type CrewRankEntry = {
  rank: number;
  crewId: string;
  name: string;
  areaLabel: string;
  memberCount: number;
  maxMembers: number;
  hasImage: boolean;
  value: number;
  leaderNickname: string | null;
};

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
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [entries, setEntries] = useState<RankingEntry[]>([]);
  const [crewEntries, setCrewEntries] = useState<CrewRankEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const activeTab = TABS[activeTabIndex]!;

  const fetchRanking = useCallback(async (tab: RankTab) => {
    setLoading(true);
    if (tab.kind === "crew") {
      const res = await fetch("/api/ranking/crews");
      if (res.ok) {
        const data = await res.json();
        setCrewEntries(data.entries ?? []);
      } else {
        setCrewEntries([]);
      }
      setEntries([]);
    } else {
      const res = await fetch(`/api/ranking?type=${tab.type}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries ?? []);
      } else {
        setEntries([]);
      }
      setCrewEntries([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void fetchRanking(activeTab);
    });
  }, [activeTab, fetchRanking]);

  return (
    <div className="h-dvh overflow-y-auto bg-gray-50 pb-[calc(6.5rem+env(safe-area-inset-bottom))]">
      <div className="max-w-lg mx-auto">
        <MainTabHeader
          title="랭킹"
          description="상위 100위까지 표시됩니다"
          action={<NotificationBell />}
        />

        <div className="px-4 pt-3 pb-2">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {TABS.map((tab, index) => (
              <button
                key={tab.kind === "crew" ? "crew" : tab.type}
                onClick={() => setActiveTabIndex(index)}
                className={`shrink-0 px-3 py-2 rounded-full text-xs font-bold transition-colors ${
                  activeTabIndex === index
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
          ) : activeTab.kind === "crew" ? (
            crewEntries.length === 0 ? (
              <div className="py-16 text-center text-gray-400 text-sm">
                아직 크루 랭킹 데이터가 없습니다.
              </div>
            ) : (
              crewEntries.map((entry) => (
                <div
                  key={entry.crewId}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${rankStyle(entry.rank)}`}
                >
                  <div
                    className={`w-9 text-center font-extrabold ${
                      entry.rank <= 3
                        ? "text-lg"
                        : entry.rank <= 10
                          ? "text-blue-600"
                          : "text-gray-500"
                    }`}
                  >
                    {rankBadge(entry.rank)}
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-gray-100 overflow-hidden shrink-0">
                    {entry.hasImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/crews/${entry.crewId}/image`}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sm font-bold text-gray-400">
                        {entry.name.slice(0, 1)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-bold text-gray-900">{entry.name}</p>
                    <p className="text-[11px] text-gray-400 truncate">
                      {entry.areaLabel} · {entry.memberCount}/{entry.maxMembers}명
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-extrabold tabular-nums text-gray-900">
                      {entry.value.toLocaleString()}
                      <span className="text-xs font-semibold text-gray-400 ml-0.5">
                        {activeTab.unit}
                      </span>
                    </p>
                  </div>
                </div>
              ))
            )
          ) : entries.length === 0 ? (
            <div className="py-16 text-center text-gray-400 text-sm">
              아직 랭킹 데이터가 없습니다.
            </div>
          ) : (
            entries.map((entry) => (
              <div
                key={`${activeTab.type}-${entry.user_id}`}
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
                </div>
                <div className="text-right shrink-0 min-h-[40px] flex flex-col justify-center">
                  <p
                    className={`font-extrabold tabular-nums leading-none ${
                      entry.rank <= 3 ? "text-lg text-gray-900" : "text-base text-gray-800"
                    }`}
                  >
                    {entry.value.toLocaleString()}
                    <span className="text-xs font-semibold text-gray-400 ml-0.5">
                      {activeTab.unit}
                    </span>
                  </p>
                  {activeTab.type === "total_earned" && entry.earn_count != null ? (
                    <p className="text-[11px] text-gray-400 mt-1 tabular-nums leading-none">
                      획득 {entry.earn_count.toLocaleString()}회
                    </p>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
