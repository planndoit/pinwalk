"use client";

interface MapActionButtonsProps {
  onCreatePin: () => void;
  onSpawnPoints: () => void;
  disabled?: boolean;
}

export default function MapActionButtons({
  onCreatePin,
  onSpawnPoints,
  disabled,
}: MapActionButtonsProps) {
  return (
    <div className="fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] left-0 right-0 z-20 pointer-events-none">
      <div className="max-w-lg mx-auto px-4 pointer-events-auto">
        <div className="flex gap-2">
          <button
            onClick={onCreatePin}
            disabled={disabled}
            className="flex-[1.4] py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold shadow-lg shadow-blue-600/25 active:scale-98 transition-transform disabled:opacity-50"
          >
            👣 발도장 찍기
          </button>
          <button
            onClick={onSpawnPoints}
            disabled={disabled}
            className="flex-1 py-2.5 rounded-xl bg-white text-amber-600 text-sm font-bold shadow-lg border border-amber-200 active:scale-98 transition-transform disabled:opacity-50"
          >
            ✨ 포인트 찾기
          </button>
        </div>
      </div>
    </div>
  );
}
