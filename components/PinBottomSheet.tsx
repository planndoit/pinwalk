"use client";

import { useEffect, useState } from "react";
import FlagIcon from "@/components/icons/FlagIcon";
import type { Pin, PinAttempt } from "@/types/pin";
import { DEFAULT_NICKNAME } from "@/lib/constants";
import { getFlagLabel, getFlagTier } from "@/lib/flagVisual";

interface PinBottomSheetProps {
  pin: Pin | null;
  onClose: () => void;
  onConquer: () => void;
  isOwner: boolean;
  disabled?: boolean;
}

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
  isOwner,
  disabled,
}: PinBottomSheetProps) {
  const [attempts, setAttempts] = useState<PinAttempt[]>([]);
  const [summary, setSummary] = useState({
    successCount: 0,
    failCount: 0,
    total: 0,
  });

  useEffect(() => {
    if (!pin) return;

    let cancelled = false;
    fetch(`/api/pins/${pin.id}/attempts`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setAttempts(data.attempts ?? []);
        setSummary(data.summary ?? { successCount: 0, failCount: 0, total: 0 });
      });

    return () => {
      cancelled = true;
    };
  }, [pin]);

  if (!pin) return null;

  const tier = getFlagTier(pin.cost);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <div
        className="absolute inset-0 bg-black/30"
        onClick={disabled ? undefined : onClose}
      />
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl px-6 pt-3 pb-8 animate-slide-up shadow-2xl max-h-[85dvh] flex flex-col">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5 shrink-0" />

        <div className="flex items-start gap-3 shrink-0">
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

        {!isOwner && (
          <button
            onClick={onConquer}
            disabled={disabled}
            className="w-full mt-4 py-3.5 rounded-2xl bg-red-500 text-white font-bold shadow-lg shadow-red-500/25 active:scale-98 transition-transform shrink-0 disabled:opacity-50"
          >
            ⚔️ 점령 도전하기
          </button>
        )}

        {summary.total > 0 && (
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
      </div>
    </div>
  );
}
