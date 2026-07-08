"use client";

import type { RandomPoint } from "@/types/randomPoint";
import {
  formatDistance,
  formatRemainingTime,
} from "@/lib/naverMap";
import { RANDOM_POINT_CLAIM_RADIUS_METERS } from "@/lib/constants";

interface RandomPointBottomSheetProps {
  point: RandomPoint | null;
  distance: number | null;
  onClose: () => void;
  onClaim: () => void;
  claiming?: boolean;
}

export default function RandomPointBottomSheet({
  point,
  distance,
  onClose,
  onClaim,
  claiming,
}: RandomPointBottomSheetProps) {
  if (!point) return null;

  const canClaim =
    distance !== null && distance <= RANDOM_POINT_CLAIM_RADIUS_METERS;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <div
        className="absolute inset-0 bg-black/30"
        onClick={claiming ? undefined : onClose}
      />
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl px-6 pt-3 pb-8 animate-slide-up shadow-2xl">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

        <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center shadow-lg shadow-amber-400/40">
          <span className="text-white text-lg font-extrabold">
            {point.points}P
          </span>
        </div>
        <p className="text-center text-gray-900 font-bold mt-3">
          주변에 포인트가 생겼어요!
        </p>

        <div className="mt-4 flex gap-2">
          <div className="flex-1 bg-gray-50 rounded-xl px-3.5 py-2.5 text-center">
            <p className="text-[11px] text-gray-400 font-medium">남은 시간</p>
            <p className="text-sm font-bold text-gray-700">
              {formatRemainingTime(point.expires_at)}
            </p>
          </div>
          <div className="flex-1 bg-gray-50 rounded-xl px-3.5 py-2.5 text-center">
            <p className="text-[11px] text-gray-400 font-medium">현재 거리</p>
            <p
              className={`text-sm font-bold ${
                canClaim ? "text-emerald-600" : "text-gray-700"
              }`}
            >
              {distance !== null ? formatDistance(distance) : "확인 중"}
            </p>
          </div>
        </div>

        {canClaim ? (
          <button
            onClick={onClaim}
            disabled={claiming}
            className="w-full mt-4 py-3.5 rounded-2xl bg-amber-500 text-white font-bold shadow-lg shadow-amber-500/30 disabled:opacity-50 active:scale-98 transition-transform"
          >
            {claiming ? "획득 중..." : "✨ 획득하기"}
          </button>
        ) : (
          <p className="text-sm text-gray-500 text-center mt-4 bg-amber-50 rounded-xl px-3.5 py-3">
            {RANDOM_POINT_CLAIM_RADIUS_METERS}m 안으로 가까이 가면 획득할 수
            있어요.
          </p>
        )}
      </div>
    </div>
  );
}
