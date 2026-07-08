"use client";

import { useEffect, useState } from "react";
import type { Pin, PinAttempt } from "@/types/pin";
import { formatRemainingTime } from "@/lib/naverMap";
import { DEFAULT_NICKNAME } from "@/lib/constants";

interface PinBottomSheetProps {
  pin: Pin | null;
  onClose: () => void;
  onConquer: () => void;
  isOwner: boolean;
}

export default function PinBottomSheet({
  pin,
  onClose,
  onConquer,
  isOwner,
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

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl px-6 pt-3 pb-8 animate-slide-up shadow-2xl">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

        <div className="flex items-start gap-3">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0 ${
              isOwner ? "bg-blue-50" : "bg-red-50"
            }`}
          >
            {isOwner ? "👣" : "📍"}
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

        <div className="mt-4 flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-xl px-3.5 py-2.5">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="w-3.5 h-3.5 text-gray-400"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 3" strokeLinecap="round" />
          </svg>
          남은 노출 시간 <span className="font-semibold text-gray-700">{formatRemainingTime(pin.expires_at)}</span>
        </div>

        {!isOwner && (
          <button
            onClick={onConquer}
            className="w-full mt-4 py-3.5 rounded-2xl bg-red-500 text-white font-bold shadow-lg shadow-red-500/25 active:scale-98 transition-transform"
          >
            ⚔️ 점령 도전하기
          </button>
        )}

        {summary.total > 0 && (
          <div className="mt-4 p-4 bg-gray-50 rounded-2xl">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-600">점령 기록</p>
              <p className="text-xs text-gray-500">
                <span className="text-emerald-600 font-semibold">
                  성공 {summary.successCount}
                </span>
                <span className="mx-1">·</span>
                <span className="text-red-500 font-semibold">
                  실패 {summary.failCount}
                </span>
              </p>
            </div>
            <ul className="mt-2.5 space-y-1.5">
              {attempts.slice(0, 3).map((a) => (
                <li
                  key={a.id}
                  className="text-xs text-gray-500 flex items-center gap-1.5"
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      a.success ? "bg-emerald-500" : "bg-red-400"
                    }`}
                  />
                  <span className="truncate">
                    {a.attacker_nickname ?? DEFAULT_NICKNAME}
                  </span>
                  <span className="text-gray-400 shrink-0">
                    {a.selected_probability}% · {a.success ? "성공" : "실패"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
