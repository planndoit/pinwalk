"use client";

import MapLayerToggle, {
  type MapLayerKey,
  type MapLayerVisibility,
} from "@/components/MapLayerToggle";

interface MapActionButtonsProps {
  onCreatePin: () => void;
  onSpawnPoints: () => void;
  disabled?: boolean;
  layerVisibility: MapLayerVisibility;
  onLayerVisibilityChange: (key: MapLayerKey, next: boolean) => void;
  myCrewOnly: boolean;
  onMyCrewOnlyChange: (next: boolean) => void;
  myCrewAvailable: boolean;
}

export default function MapActionButtons({
  onCreatePin,
  onSpawnPoints,
  disabled,
  layerVisibility,
  onLayerVisibilityChange,
  myCrewOnly,
  onMyCrewOnlyChange,
  myCrewAvailable,
}: MapActionButtonsProps) {
  return (
    <div className="fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] left-0 right-0 z-20 pointer-events-none">
      <div className="max-w-lg mx-auto px-4 pointer-events-auto">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onCreatePin}
            disabled={disabled}
            className="h-9 flex-[1.15] rounded-xl bg-blue-600 px-2 text-white text-xs font-bold shadow-lg shadow-blue-600/25 active:scale-98 transition-transform disabled:opacity-50"
          >
            🚩 깃발 꽂기
          </button>
          <button
            type="button"
            onClick={onSpawnPoints}
            disabled={disabled}
            className="h-9 flex-1 rounded-xl bg-white px-2 text-amber-600 text-xs font-bold shadow-lg border border-amber-200 active:scale-98 transition-transform disabled:opacity-50"
          >
            ✨ 포인트 찾기
          </button>
          <button
            type="button"
            disabled={disabled || !myCrewAvailable}
            aria-pressed={myCrewOnly}
            title={
              myCrewAvailable
                ? "내 크루만 하이라이트"
                : "크루에 가입하면 사용할 수 있습니다"
            }
            onClick={() => onMyCrewOnlyChange(!myCrewOnly)}
            className={`h-9 shrink-0 rounded-xl px-2 text-[10px] font-bold shadow-lg border transition-transform active:scale-95 disabled:opacity-40 ${
              myCrewOnly
                ? "bg-violet-600 text-white border-violet-600"
                : "bg-white text-violet-700 border-violet-200"
            }`}
          >
            내 크루
          </button>
          <MapLayerToggle
            visibility={layerVisibility}
            onChange={onLayerVisibilityChange}
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
}
