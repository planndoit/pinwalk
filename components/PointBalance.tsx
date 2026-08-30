"use client";

import { useAuth } from "@/components/AuthProvider";
import NotificationBell from "@/components/notifications/NotificationBell";
import { SERVICE_NAME } from "@/lib/constants";

interface PointBalanceProps {
  points?: number | null;
  onPremiumPromotion?: () => void;
  premiumPromotionDisabled?: boolean;
}

const chipClassName =
  "box-border h-9 inline-flex items-center gap-1.5 rounded-2xl bg-white/95 backdrop-blur shadow-lg border border-transparent";

export default function PointBalance({
  points,
  onPremiumPromotion,
  premiumPromotionDisabled,
}: PointBalanceProps) {
  const { openAuthModal, loading: authLoading } = useAuth();
  const showPoints = typeof points === "number";

  return (
    <header className="absolute top-0 left-0 right-0 z-20 pointer-events-none overflow-hidden">
      <div className="px-safe pt-safe">
        <div className="mt-2 flex items-center gap-1.5 pointer-events-auto max-w-lg mx-auto min-w-0">
          <div className={`${chipClassName} min-w-0 shrink pl-2.5 pr-2.5 sm:pl-3 sm:pr-3.5`}>
            <span className="text-base leading-none shrink-0">🚩</span>
            <h1 className="text-gray-900 text-sm font-extrabold leading-none tracking-tight truncate">
              {SERVICE_NAME}
            </h1>
          </div>

          <div className="ml-auto flex items-center gap-1 min-w-0 justify-end">
            {onPremiumPromotion && (
              <button
                type="button"
                onClick={onPremiumPromotion}
                disabled={premiumPromotionDisabled}
                aria-label="프리미엄 홍보 요청"
                className={`${chipClassName} shrink-0 px-2 sm:px-2.5 text-amber-700 text-sm font-semibold border-amber-200/80 active:scale-98 transition-transform disabled:opacity-50`}
              >
                <span aria-hidden="true" className="leading-none">
                  ⭐
                </span>
                <span className="hidden sm:inline">홍보 요청</span>
              </button>
            )}
            <NotificationBell variant="chip" className="shrink-0" />
            {showPoints ? (
              <div className={`${chipClassName} shrink-0 px-2.5 sm:px-3.5`}>
                <span className="w-5 h-5 shrink-0 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 text-white text-[10px] font-extrabold flex items-center justify-center">
                  P
                </span>
                <p className="text-xs sm:text-sm font-extrabold text-gray-900 tabular-nums leading-none whitespace-nowrap">
                  {points.toLocaleString()}
                </p>
              </div>
            ) : (
              !authLoading && (
                <button
                  type="button"
                  onClick={() => openAuthModal("login")}
                  className={`${chipClassName} shrink-0 px-2.5 sm:px-3.5 text-sm font-extrabold text-gray-900 active:scale-98 transition-transform`}
                >
                  로그인
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
