"use client";

import type { SerializedPremiumPlace } from "@/types/premiumClient";

interface PremiumPlaceBottomSheetProps {
  place: SerializedPremiumPlace | null;
  onClose: () => void;
}

export default function PremiumPlaceBottomSheet({
  place,
  onClose,
}: PremiumPlaceBottomSheetProps) {
  if (!place) return null;

  return (
    <div className="fixed inset-x-0 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-40 px-4 pointer-events-none">
      <div className="max-w-lg mx-auto pointer-events-auto">
        <div className="bg-gradient-to-br from-amber-50 to-white border-2 border-amber-300 rounded-2xl shadow-xl p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="inline-block px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold mb-2">
                PREMIUM
              </span>
              <h3 className="text-lg font-bold text-gray-900">{place.storeName}</h3>
              <p className="text-xs text-amber-700 mt-0.5">{place.categoryName ?? place.categoryCode}</p>
            </div>
            <button type="button" onClick={onClose} className="text-gray-400 text-xl leading-none">×</button>
          </div>
          <p className="text-sm text-gray-700 mt-3 font-medium">{place.benefit}</p>
          <p className="text-sm text-gray-600 mt-2">{place.promoText}</p>
          {place.promoLink && (
            <a
              href={place.promoLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-3 text-sm font-semibold text-amber-700 underline"
            >
              홍보 링크 열기
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
