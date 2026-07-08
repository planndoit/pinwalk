"use client";

import { useEffect, useMemo } from "react";

export type CelebrationType = "plant" | "conquer";

interface CelebrationOverlayProps {
  type: CelebrationType;
  onDone: () => void;
}

const CONFETTI_COLORS = [
  "#3b82f6",
  "#ef4444",
  "#f59e0b",
  "#10b981",
  "#8b5cf6",
  "#ec4899",
];

const CONFETTI_COUNT = 80;

export default function CelebrationOverlay({
  type,
  onDone,
}: CelebrationOverlayProps) {
  useEffect(() => {
    const duration = type === "conquer" ? 1900 : 1400;
    const timer = window.setTimeout(onDone, duration);
    return () => window.clearTimeout(timer);
  }, [type, onDone]);

  const confetti = useMemo(() => {
    if (type !== "conquer") return [];
    return Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.4,
      duration: 1 + Math.random() * 0.9,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      size: 6 + Math.random() * 8,
    }));
  }, [type]);

  return (
    <div className="celebration-overlay fixed inset-0 z-[100] pointer-events-none overflow-hidden flex items-center justify-center">
      {type === "plant" ? (
        <div className="relative flex items-center justify-center">
          <span
            className="absolute w-24 h-24 rounded-full border-4 border-blue-400/60"
            style={{ animation: "ring-expand 1s ease-out forwards" }}
          />
          <span
            className="absolute w-24 h-24 rounded-full border-4 border-blue-400/40"
            style={{ animation: "ring-expand 1s ease-out 0.15s forwards" }}
          />
          <span
            className="text-7xl drop-shadow-lg"
            style={{
              animation: "flag-plant 0.9s cubic-bezier(0.34,1.56,0.64,1) forwards",
            }}
          >
            🚩
          </span>
        </div>
      ) : (
        <>
          {confetti.map((c) => (
            <span
              key={c.id}
              className="absolute top-0 block"
              style={{
                left: `${c.left}%`,
                width: c.size,
                height: c.size,
                background: c.color,
                borderRadius: 2,
                animation: `confetti-fall ${c.duration}s linear ${c.delay}s forwards`,
              }}
            />
          ))}
          <div
            className="relative flex flex-col items-center"
            style={{
              animation: "badge-pop 0.7s cubic-bezier(0.34,1.56,0.64,1) forwards",
            }}
          >
            <span className="text-7xl drop-shadow-lg">👑</span>
            <span className="mt-2 px-5 py-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white text-lg font-extrabold shadow-xl">
              점령 성공!
            </span>
          </div>
        </>
      )}
    </div>
  );
}
