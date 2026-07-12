"use client";

import { SERVICE_NAME } from "@/lib/constants";

interface PointBalanceProps {
  points?: number | null;
  onPremiumPromotion?: () => void;
  premiumPromotionDisabled?: boolean;
}

const chipClassName =
  "box-border h-9 inline-flex items-center gap-1.5 rounded-2xl bg-white/95 backdrop-blur shadow-lg border border-transparent shrink-0";

export default function PointBalance({
  points,
  onPremiumPromotion,
  premiumPromotionDisabled,
}: PointBalanceProps) {
  const showPoints = typeof points === "number";

  return (
    <header className="absolute top-0 left-0 right-0 z-20 pointer-events-none">
      <div className="px-4 pt-safe">
        <div className="mt-3 flex items-center gap-2 pointer-events-auto max-w-lg mx-auto">
          <div className={`${chipClassName} pl-3 pr-3.5`}>
            <span className="text-base leading-none">🚩</span>
            <h1 className="text-gray-900 text-sm font-extrabold leading-none tracking-tight">
              {SERVICE_NAME}
            </h1>
          </div>

          <div className="ml-auto flex items-center gap-1.5 shrink-0">
            {onPremiumPromotion && (
              <button
                type="button"
                onClick={onPremiumPromotion}
                disabled={premiumPromotionDisabled}
                className={`${chipClassName} px-2.5 text-amber-700 text-sm font-semibold border-amber-200/80 active:scale-98 transition-transform disabled:opacity-50`}
              >
                <span aria-hidden="true" className="leading-none">
                  ⭐
                </span>
                홍보 요청
              </button>
            )}
            {showPoints && (
              <div className={`${chipClassName} px-3.5`}>
                <span className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 text-white text-[10px] font-extrabold flex items-center justify-center">
                  P
                </span>
                <p className="text-sm font-extrabold text-gray-900 tabular-nums leading-none">
                  {points.toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
