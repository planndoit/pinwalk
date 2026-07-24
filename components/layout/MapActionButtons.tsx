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
}

export default function MapActionButtons({
  onCreatePin,
  onSpawnPoints,
  disabled,
  layerVisibility,
  onLayerVisibilityChange,
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
