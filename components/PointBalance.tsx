"use client";

import { SERVICE_NAME } from "@/lib/constants";

interface PointBalanceProps {
  points: number;
  onNicknameClick?: () => void;
  nickname?: string;
}

export default function PointBalance({
  points,
  onNicknameClick,
  nickname,
}: PointBalanceProps) {
  return (
    <header className="absolute top-0 left-0 right-0 z-20 pointer-events-none">
      <div className="px-4 pt-safe">
        <div className="mt-3 flex items-center justify-between gap-2 pointer-events-auto max-w-lg mx-auto">
          <div className="flex items-center gap-2.5 bg-white/95 backdrop-blur rounded-2xl pl-3.5 pr-4 py-2.5 shadow-lg">
            <span className="text-xl leading-none">👣</span>
            <div>
              <h1 className="text-gray-900 text-base font-extrabold leading-tight tracking-tight">
                {SERVICE_NAME}
              </h1>
              {nickname && (
                <button
                  onClick={onNicknameClick}
                  className="text-gray-400 text-[11px] leading-tight flex items-center gap-0.5"
                >
                  {nickname}
                  <svg
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-2.5 h-2.5"
                  >
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur rounded-2xl px-4 py-2.5 shadow-lg">
            <span className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 text-white text-[10px] font-extrabold flex items-center justify-center">
              P
            </span>
            <p className="text-base font-extrabold text-gray-900 tabular-nums">
              {points.toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
