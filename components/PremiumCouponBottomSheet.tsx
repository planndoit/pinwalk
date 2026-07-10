"use client";

import type { SerializedCouponSpawn } from "@/types/premiumClient";

interface PremiumCouponBottomSheetProps {
  spawn: SerializedCouponSpawn | null;
  distance: number | null;
  claimRadius: number;
  onClose: () => void;
  onClaim: () => void;
  claiming: boolean;
}

export default function PremiumCouponBottomSheet({
  spawn,
  distance,
  claimRadius,
  onClose,
  onClaim,
  claiming,
}: PremiumCouponBottomSheetProps) {
  if (!spawn) return null;

  const canClaim = distance !== null && distance <= claimRadius;

  return (
    <div className="fixed inset-x-0 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-40 px-4 pointer-events-none">
      <div className="max-w-lg mx-auto pointer-events-auto">
        <div className="bg-white border-2 border-violet-300 rounded-2xl shadow-xl p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="inline-block px-2 py-0.5 rounded-full bg-violet-500 text-white text-[10px] font-bold mb-2">
                COUPON
              </span>
              <h3 className="text-lg font-bold text-gray-900">{spawn.couponTitle}</h3>
              <p className="text-xs text-gray-500 mt-0.5">{spawn.storeName}</p>
            </div>
            <button type="button" onClick={onClose} className="text-gray-400 text-xl leading-none">×</button>
          </div>
          {distance !== null && (
            <p className="text-sm text-gray-600 mt-3">
              {canClaim
                ? "가까이 왔어요! 쿠폰을 획득할 수 있습니다."
                : `쿠폰까지 ${Math.round(distance)}m 남았어요.`}
            </p>
          )}
          <button
            type="button"
            onClick={onClaim}
            disabled={!canClaim || claiming}
            className="w-full mt-4 py-3 rounded-xl bg-violet-600 text-white font-bold disabled:opacity-50"
          >
            {claiming ? "획득 중..." : "쿠폰 획득"}
          </button>
        </div>
      </div>
    </div>
  );
}
