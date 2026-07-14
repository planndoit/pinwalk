"use client";

import type { SerializedPremiumPlace } from "@/types/premiumClient";
import { toTelHref } from "@/lib/validation/premium";

interface PremiumPlaceBottomSheetProps {
  place: SerializedPremiumPlace | null;
  onClose: () => void;
  onIssueCoupons?: () => void;
  issuing?: boolean;
}

export default function PremiumPlaceBottomSheet({
  place,
  onClose,
  onIssueCoupons,
  issuing = false,
}: PremiumPlaceBottomSheetProps) {
  if (!place) return null;

  const placePhone = place.placePhone?.trim() || null;

  return (
    <div className="fixed inset-0 z-40">
      <button
        type="button"
        className="absolute inset-0 bg-transparent"
        aria-label="닫기"
        onClick={onClose}
      />
      <div className="absolute inset-x-0 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] px-4 pointer-events-none">
        <div className="max-w-lg mx-auto pointer-events-auto">
          <div
            className="bg-gradient-to-br from-amber-50 to-white border-2 border-amber-300 rounded-2xl shadow-xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="inline-block px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                    PREMIUM
                  </span>
                  {onIssueCoupons && place.hasCoupons && (
                    <button
                      type="button"
                      onClick={onIssueCoupons}
                      disabled={issuing}
                      className="px-2.5 py-0.5 rounded-full bg-violet-600 text-white text-[10px] font-bold disabled:opacity-50"
                    >
                      {issuing ? "발행 중..." : "쿠폰 발행하기"}
                    </button>
                  )}
                </div>
                <h3 className="text-lg font-bold text-gray-900">{place.storeName}</h3>
                <p className="text-xs text-amber-700 mt-0.5">
                  {place.categoryName ?? place.categoryCode}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 text-xl leading-none shrink-0"
              >
                ×
              </button>
            </div>
            <p className="mt-3 max-h-[8.25rem] overflow-y-auto text-sm leading-6 text-gray-700 whitespace-pre-line overscroll-contain">
              {place.promoText}
            </p>
            {placePhone && (
              <a
                href={toTelHref(placePhone)}
                className="mt-3 flex items-center justify-between gap-3 w-full rounded-xl bg-amber-500 text-white px-4 py-3 font-bold shadow-md shadow-amber-500/25 active:scale-98 transition-transform"
              >
                <span className="text-sm">전화하기</span>
                <span className="text-base tabular-nums tracking-tight">
                  {placePhone}
                </span>
              </a>
            )}
            {place.promoLink && (
              <a
                href={place.promoLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-3 text-sm font-semibold text-amber-700 underline"
              >
                링크 열기
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
