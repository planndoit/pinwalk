"use client";

import { useEffect, useState } from "react";
import FlagIcon from "@/components/icons/FlagIcon";
import OverlayPortal from "@/components/layout/OverlayPortal";
import type { Pin, PinAttempt } from "@/types/pin";
import type { PinToll } from "@/types/randomPoint";
import {
  DEFAULT_NICKNAME,
  PIN_MAX_COST,
  PIN_REINFORCE_COST,
  getNextPinCost,
} from "@/lib/constants";
import {
  formatCooldownRemaining,
  getFlagLabel,
  getFlagTier,
  getPinReinforceCooldownMsRemaining,
} from "@/lib/flagVisual";
import { formatActivityDate } from "@/lib/formatDate";
import { getDistanceMeters } from "@/lib/geo";
import { useSubmitLock } from "@/lib/useSubmitLock";

interface PinBottomSheetProps {
  pin: Pin | null;
  onClose: () => void;
  onConquer: () => void;
  onDeleted?: (pinId: string) => void;
  onReinforced?: (pin: Pin) => void;
  isOwner: boolean;
  disabled?: boolean;
  currentPosition?: { lat: number; lng: number } | null;
}

type AttemptSummary = {
  successCount: number;
  failCount: number;
  total: number;
};

type AttemptHistory = {
  attempts: PinAttempt[];
  summary: AttemptSummary;
};

type TollSummary = {
  total: number;
  totalTollPoints: number;
};

type TollHistory = {
  tolls: PinToll[];
  summary: TollSummary;
};

const EMPTY_SUMMARY: AttemptSummary = {
  successCount: 0,
  failCount: 0,
  total: 0,
};

const EMPTY_TOLL_SUMMARY: TollSummary = {
  total: 0,
  totalTollPoints: 0,
};

const attemptHistoryCache = new Map<string, AttemptHistory>();
const tollHistoryCache = new Map<string, TollHistory>();

function formatAttemptText(attempt: PinAttempt): string {
  if (attempt.success && attempt.previous_owner_nickname) {
    return `${attempt.attacker_nickname ?? DEFAULT_NICKNAME} → ${attempt.previous_owner_nickname} 점령`;
  }
  if (attempt.success) {
    return `${attempt.attacker_nickname ?? DEFAULT_NICKNAME} 점령 성공`;
  }
  return `${attempt.attacker_nickname ?? DEFAULT_NICKNAME} 점령 실패`;
}

export default function PinBottomSheet({
  pin,
  onClose,
  onConquer,
  onDeleted,
  onReinforced,
  isOwner,
  disabled,
  currentPosition,
}: PinBottomSheetProps) {
  const [attempts, setAttempts] = useState<PinAttempt[]>([]);
  const [summary, setSummary] = useState<AttemptSummary>(EMPTY_SUMMARY);
  const [attemptsLoading, setAttemptsLoading] = useState(false);
  const [tolls, setTolls] = useState<PinToll[]>([]);
  const [tollSummary, setTollSummary] =
    useState<TollSummary>(EMPTY_TOLL_SUMMARY);
  const [tollsLoading, setTollsLoading] = useState(false);
  const [cooldownMs, setCooldownMs] = useState(0);
  const [reinforceError, setReinforceError] = useState<string | null>(null);
  const { locked: deleting, run, unlock } = useSubmitLock();
  const {
    locked: reinforcing,
    run: runReinforce,
    unlock: unlockReinforce,
  } = useSubmitLock();

  useEffect(() => {
    if (!pin) {
      unlock();
      unlockReinforce();
    }
  }, [pin, unlock, unlockReinforce]);

  useEffect(() => {
    if (!pin || !isOwner) {
      setCooldownMs(0);
      return;
    }

    const tick = () => {
      setCooldownMs(getPinReinforceCooldownMsRemaining(pin));
    };
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, [pin, isOwner]);

  useEffect(() => {
    if (!pin) return;

    const pinId = pin.id;
    const cached = attemptHistoryCache.get(pinId);
    if (cached) {
      setAttempts(cached.attempts);
      setSummary(cached.summary);
      setAttemptsLoading(false);
    } else {
      setAttempts([]);
      setSummary(EMPTY_SUMMARY);
      setAttemptsLoading(true);
    }

    let cancelled = false;
    fetch(`/api/pins/${pinId}/attempts`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const next: AttemptHistory = {
          attempts: data.attempts ?? [],
          summary: data.summary ?? EMPTY_SUMMARY,
        };
        attemptHistoryCache.set(pinId, next);
        setAttempts(next.attempts);
        setSummary(next.summary);
      })
      .catch(() => {
        if (cancelled || cached) return;
        setAttempts([]);
        setSummary(EMPTY_SUMMARY);
      })
      .finally(() => {
        if (!cancelled) setAttemptsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pin]);

  useEffect(() => {
    if (!pin) return;

    const pinId = pin.id;
    const cached = tollHistoryCache.get(pinId);
    if (cached) {
      setTolls(cached.tolls);
      setTollSummary(cached.summary);
      setTollsLoading(false);
    } else {
      setTolls([]);
      setTollSummary(EMPTY_TOLL_SUMMARY);
      setTollsLoading(true);
    }

    let cancelled = false;
    fetch(`/api/pins/${pinId}/tolls`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const next: TollHistory = {
          tolls: data.tolls ?? [],
          summary: data.summary ?? EMPTY_TOLL_SUMMARY,
        };
        tollHistoryCache.set(pinId, next);
        setTolls(next.tolls);
        setTollSummary(next.summary);
      })
      .catch(() => {
        if (cancelled || cached) return;
        setTolls([]);
        setTollSummary(EMPTY_TOLL_SUMMARY);
      })
      .finally(() => {
        if (!cancelled) setTollsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pin]);

  if (!pin) return null;

  const tier = getFlagTier(pin.cost);
  const nextCost = getNextPinCost(pin.cost);
  const busy = disabled || deleting || reinforcing;
  const insideRadius =
    currentPosition != null &&
    getDistanceMeters(
      currentPosition.lat,
      currentPosition.lng,
      pin.lat,
      pin.lng
    ) <= pin.radius_meters;
  const canReinforce =
    isOwner &&
    nextCost !== null &&
    pin.cost < PIN_MAX_COST &&
    cooldownMs <= 0 &&
    insideRadius;

  const handleDelete = () => {
    if (busy) return;
    const ok = window.confirm(
      "이 깃발을 삭제할까요? 삭제 후에는 지도에서 사라집니다."
    );
    if (!ok) return;

    void run(async () => {
      const res = await fetch(`/api/pins/${pin.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        window.alert(data.error ?? "삭제에 실패했습니다.");
        return "release";
      }
      attemptHistoryCache.delete(pin.id);
      tollHistoryCache.delete(pin.id);
      onDeleted?.(pin.id);
      return "keep";
    });
  };

  const handleReinforce = () => {
    if (busy || !currentPosition) return;
    setReinforceError(null);

    void runReinforce(async () => {
      const res = await fetch(`/api/pins/${pin.id}/reinforce`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_lat: currentPosition.lat,
          current_lng: currentPosition.lng,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setReinforceError(data.error ?? "깃발 강화에 실패했습니다.");
        return "release";
      }
      if (data.pin) {
        onReinforced?.(data.pin as Pin);
      }
      return "keep";
    });
  };

  return (
    <OverlayPortal>
      <div className="fixed inset-0 z-40 flex items-end justify-center">
        <div
          className="absolute inset-0 bg-black/30"
          onClick={busy ? undefined : onClose}
        />
        <div className="relative w-full max-w-lg bg-white rounded-t-3xl px-6 pt-3 pb-8 animate-slide-up shadow-2xl max-h-[85dvh] flex flex-col">
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5 shrink-0" />

          {isOwner && (
            <div className="absolute top-4 right-4">
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={busy}
                className="px-2.5 py-1.5 text-xs font-semibold text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50"
              >
                삭제
              </button>
            </div>
          )}

          <div
            className={`flex items-start gap-3 shrink-0 ${isOwner ? "pr-14" : ""}`}
          >
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                isOwner ? "bg-blue-50" : "bg-red-50"
              }`}
            >
              <FlagIcon
                size={22}
                tier={tier}
                color={isOwner ? "#2563eb" : "#ef4444"}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-bold text-gray-900 break-all leading-snug">
                {pin.text}
              </p>
              <p className="text-sm text-gray-500 mt-0.5">
                {pin.nickname ?? DEFAULT_NICKNAME}
                {isOwner && (
                  <span className="ml-1.5 text-[11px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md">
                    내 깃발
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-xl px-3.5 py-2.5 shrink-0">
            <FlagIcon size={14} tier={tier} color="#6b7280" />
            투자 포인트{" "}
            <span className="font-semibold text-gray-700">
              {getFlagLabel(tier)}
            </span>
            <span className="text-gray-400">· 점령될 때까지 유지</span>
          </div>

          {isOwner && (
            <div className="mt-3 shrink-0 space-y-2">
              {nextCost === null ? (
                <p className="text-center text-sm font-semibold text-gray-500 bg-gray-50 rounded-xl py-3">
                  최대 강화 ({PIN_MAX_COST}P)
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleReinforce()}
                  disabled={busy || !canReinforce}
                  className="w-full py-3.5 rounded-2xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-600/20 active:scale-98 transition-transform disabled:opacity-40"
                >
                  {reinforcing
                    ? "강화 중..."
                    : `깃발 강화 (+${PIN_REINFORCE_COST}P → ${nextCost}P)`}
                </button>
              )}
              {nextCost !== null && (
                <p className="text-center text-xs text-gray-500">
                  {!insideRadius
                    ? "깃발 영역 안에서만 강화할 수 있어요"
                    : cooldownMs > 0
                      ? `다음 강화까지 ${formatCooldownRemaining(cooldownMs)}`
                      : "지금 강화할 수 있어요"}
                </p>
              )}
              {reinforceError ? (
                <p className="text-center text-xs text-red-500">{reinforceError}</p>
              ) : null}
            </div>
          )}

          {!isOwner && (
            <button
              onClick={onConquer}
              disabled={busy}
              className="w-full mt-4 py-3.5 rounded-2xl bg-red-500 text-white font-bold shadow-lg shadow-red-500/25 active:scale-98 transition-transform shrink-0 disabled:opacity-50"
            >
              ⚔️ 점령 도전하기
            </button>
          )}

          {attemptsLoading && (
            <div className="mt-4 p-4 bg-gray-50 rounded-2xl shrink-0">
              <p className="text-xs font-semibold text-gray-600">점령 기록</p>
              <p className="mt-2.5 text-xs text-gray-400">불러오는 중...</p>
            </div>
          )}

          {!attemptsLoading && summary.total > 0 && (
            <div className="mt-4 p-4 bg-gray-50 rounded-2xl flex flex-col min-h-0 shrink">
              <div className="flex items-center justify-between shrink-0">
                <p className="text-xs font-semibold text-gray-600">점령 기록</p>
                <p className="text-xs text-gray-500">
                  <span className="text-blue-600 font-semibold">
                    성공 {summary.successCount}
                  </span>
                  <span className="mx-1">·</span>
                  <span className="text-red-500 font-semibold">
                    실패 {summary.failCount}
                  </span>
                </p>
              </div>
              <ul className="mt-2.5 space-y-2 overflow-y-auto max-h-48 pr-1">
                {attempts.map((a) => (
                  <li
                    key={a.id}
                    className="text-xs text-gray-600 flex items-start gap-2"
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${
                        a.success ? "bg-blue-500" : "bg-red-400"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-800">
                        {formatAttemptText(a)}
                      </p>
                      <p className="text-gray-400 mt-0.5">
                        {a.selected_probability}% 시도
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {tollsLoading && (
            <div className="mt-4 p-4 bg-gray-50 rounded-2xl shrink-0">
              <p className="text-xs font-semibold text-gray-600">통행료 기록</p>
              <p className="mt-2.5 text-xs text-gray-400">불러오는 중...</p>
            </div>
          )}

          {!tollsLoading && tollSummary.total > 0 && (
            <div className="mt-4 p-4 bg-gray-50 rounded-2xl flex flex-col min-h-0 shrink">
              <div className="flex items-center justify-between shrink-0">
                <p className="text-xs font-semibold text-gray-600">통행료 기록</p>
                <p className="text-xs text-emerald-600 font-semibold">
                  +{tollSummary.totalTollPoints.toLocaleString()}P ·{" "}
                  {tollSummary.total}건
                </p>
              </div>
              <ul className="mt-2.5 space-y-2 overflow-y-auto max-h-48 pr-1">
                {tolls.map((toll) => (
                  <li
                    key={toll.id}
                    className="text-xs text-gray-600 flex items-start gap-2"
                  >
                    <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 bg-amber-500" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-800">
                        {toll.collector_nickname ?? DEFAULT_NICKNAME}님이
                        포인트 주움 → 통행료 +{toll.toll_points}P
                      </p>
                      <p className="text-gray-400 mt-0.5">
                        {formatActivityDate(toll.created_at)} · 기본{" "}
                        {toll.base_points}P의 10%
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </OverlayPortal>
  );
}
