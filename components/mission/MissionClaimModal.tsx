"use client";

import { useEffect } from "react";
import CoupangPartnersBanner from "@/components/ads/CoupangPartnersBanner";
import OverlayPortal from "@/components/layout/OverlayPortal";

export default function MissionClaimModal({
  open,
  message,
  onClose,
}: {
  open: boolean;
  message: string;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <OverlayPortal>
      <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="mission-claim-title"
          className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[85dvh] flex flex-col overflow-hidden"
        >
          <div className="overflow-y-auto overscroll-contain pt-5 pb-4">
            <div className="px-5">
              <p className="text-center text-3xl" aria-hidden>
                🎉
              </p>
              <h2
                id="mission-claim-title"
                className="mt-2 text-center text-lg font-extrabold text-gray-900"
              >
                미션 보상 지급
              </h2>
              <p className="mt-1.5 text-center text-sm font-medium text-emerald-700 whitespace-pre-wrap">
                {message}
              </p>
            </div>

            <CoupangPartnersBanner
              placement="mission_claim"
              className="mt-4 mx-3"
            />
          </div>

          <div className="shrink-0 border-t border-gray-100 px-5 py-4 pb-[max(1rem,var(--safe-bottom))]">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-2xl bg-gray-900 text-white text-sm font-bold active:scale-98 transition-transform"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </OverlayPortal>
  );
}
