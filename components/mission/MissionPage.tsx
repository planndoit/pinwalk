"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import MainTabHeader from "@/components/layout/MainTabHeader";
import NotificationBell from "@/components/notifications/NotificationBell";
import type { MissionPeriod, SerializedMission } from "@/types/mission";

type MissionTab = {
  period: MissionPeriod;
  label: string;
  description: string;
};

const TABS: MissionTab[] = [
  {
    period: "daily",
    label: "일간",
    description: "매일 오전 9시에 새로 시작해요.",
  },
  {
    period: "weekly",
    label: "주간",
    description: "매주 월요일 오전 9시에 새로 시작해요.",
  },
  {
    period: "monthly",
    label: "월간",
    description: "매월 1일 오전 9시에 새로 시작해요.",
  },
  {
    period: "starter",
    label: "시작하기",
    description: "주요 기능을 한 번씩 경험해 보세요.",
  },
];

function MissionCard({
  mission,
  claiming,
  onClaim,
}: {
  mission: SerializedMission;
  claiming: boolean;
  onClaim: (missionId: string) => void;
}) {
  const completed = mission.current >= mission.target;
  const displayCurrent = mission.claimed
    ? mission.target
    : Math.min(mission.current, mission.target);
  const progress = mission.claimed
    ? 100
    : Math.min(100, (mission.current / mission.target) * 100);

  return (
    <article className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-gray-900">{mission.title}</h3>
            {mission.claimed ? (
              <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                완료
              </span>
            ) : completed ? (
              <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600">
                달성
              </span>
            ) : null}
          </div>
          {mission.description ? (
            <p className="mt-1 text-xs text-gray-400">
              {mission.description}
            </p>
          ) : null}
        </div>
        <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-extrabold text-amber-600">
          +{mission.reward.toLocaleString()}P
        </span>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
          <div
            className={`h-full rounded-full transition-[width] ${
              mission.claimed
                ? "bg-emerald-500"
                : completed
                  ? "bg-blue-600"
                  : "bg-blue-400"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="min-w-14 text-right text-xs font-bold tabular-nums text-gray-500">
          {displayCurrent}/{mission.target}{mission.unit}
        </span>
      </div>

      {mission.claimable ? (
        <button
          type="button"
          onClick={() => onClaim(mission.id)}
          disabled={claiming}
          className="mt-3 w-full rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white shadow-sm shadow-blue-600/20 disabled:opacity-50"
        >
          {claiming ? "받는 중..." : "보상 받기"}
        </button>
      ) : null}
    </article>
  );
}

export default function MissionPage() {
  const { refreshProfile } = useAuth();
  const [activePeriod, setActivePeriod] = useState<MissionPeriod>("daily");
  const [missions, setMissions] = useState<SerializedMission[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchMissions = useCallback(async () => {
    const response = await fetch("/api/missions", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error ?? "미션을 불러오지 못했습니다.");
    }
    setMissions(data.missions ?? []);
  }, []);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      void fetchMissions()
        .catch((fetchError: unknown) => {
          if (!active) return;
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : "미션을 불러오지 못했습니다."
          );
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    });
    return () => {
      active = false;
    };
  }, [fetchMissions]);

  const activeTab = TABS.find((tab) => tab.period === activePeriod)!;
  const activeMissions = useMemo(
    () => missions.filter((mission) => mission.period === activePeriod),
    [missions, activePeriod]
  );
  const completedCount = activeMissions.filter(
    (mission) => mission.claimed
  ).length;

  const handleClaim = (missionId: string) => {
    if (claimingId) return;
    setClaimingId(missionId);
    setMessage(null);
    setError(null);

    void (async () => {
      const response = await fetch("/api/missions/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ missionId }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "보상을 받지 못했습니다.");
      }
      await Promise.all([fetchMissions(), refreshProfile()]);
      setMessage(data.message ?? "미션 보상을 받았습니다.");
    })()
      .catch((claimError: unknown) => {
        setError(
          claimError instanceof Error
            ? claimError.message
            : "보상을 받지 못했습니다."
        );
      })
      .finally(() => setClaimingId(null));
  };

  const renderCards = (items: SerializedMission[]) => (
    <div className="space-y-2.5">
      {items.map((mission) => (
        <MissionCard
          key={mission.id}
          mission={mission}
          claiming={claimingId === mission.id}
          onClaim={handleClaim}
        />
      ))}
    </div>
  );

  return (
    <div className="h-dvh overflow-y-auto bg-gray-50 pb-[calc(6.5rem+var(--safe-bottom))]">
      <div className="mx-auto max-w-lg">
        <MainTabHeader
          title="미션"
          description="활동하고 추가 포인트를 받아보세요"
          action={<NotificationBell />}
        />

        <div className="px-4 pb-2 pt-3">
          <div className="grid grid-cols-4 gap-1 rounded-2xl bg-gray-100 p-1">
            {TABS.map((tab) => (
              <button
                key={tab.period}
                type="button"
                onClick={() => setActivePeriod(tab.period)}
                className={`rounded-xl px-1 py-2 text-xs font-bold transition-colors ${
                  activePeriod === tab.period
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-400"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-xs text-gray-500">{activeTab.description}</p>
            {!loading && activeMissions.length > 0 ? (
              <span className="shrink-0 text-xs font-bold text-gray-400">
                완료 {completedCount}/{activeMissions.length}
              </span>
            ) : null}
          </div>
        </div>

        {message ? (
          <p className="mx-4 mb-2 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm font-medium text-emerald-700">
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="mx-4 mb-2 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-600">
            {error}
          </p>
        ) : null}

        <div className="px-4 pb-4">
          {loading ? (
            <div className="py-16 text-center text-sm text-gray-400">
              불러오는 중...
            </div>
          ) : activeMissions.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-400">
              표시할 미션이 없습니다.
            </div>
          ) : activePeriod === "monthly" ? (
            <div className="space-y-5">
              <section>
                <div className="mb-2 flex items-end justify-between">
                  <div>
                    <h2 className="text-sm font-extrabold text-gray-800">
                      핵심 미션
                    </h2>
                    <p className="mt-0.5 text-[11px] text-gray-400">
                      꾸준히 활동하면 모두 달성할 수 있어요
                    </p>
                  </div>
                </div>
                {renderCards(
                  activeMissions.filter((mission) => mission.group === "core")
                )}
              </section>
              <section>
                <div className="mb-2">
                  <h2 className="text-sm font-extrabold text-gray-800">
                    도전 미션
                  </h2>
                  <p className="mt-0.5 text-[11px] text-gray-400">
                    핵심 미션 완료 조건에는 포함되지 않아요
                  </p>
                </div>
                {renderCards(
                  activeMissions.filter(
                    (mission) => mission.group === "challenge"
                  )
                )}
              </section>
            </div>
          ) : (
            renderCards(activeMissions)
          )}
        </div>
      </div>
    </div>
  );
}
