"use client";

import type { ReactNode } from "react";

export type MapLayerKey = "landmarks" | "pins" | "premium";

export interface MapLayerVisibility {
  landmarks: boolean;
  pins: boolean;
  premium: boolean;
}

export const DEFAULT_MAP_LAYER_VISIBILITY: MapLayerVisibility = {
  landmarks: true,
  pins: true,
  premium: true,
};

interface MapLayerToggleProps {
  visibility: MapLayerVisibility;
  onChange: (key: MapLayerKey, next: boolean) => void;
  disabled?: boolean;
}

const LAYERS: {
  key: MapLayerKey;
  label: string;
  icon: ReactNode;
  onClass: string;
  offClass: string;
}[] = [
  {
    key: "landmarks",
    label: "랜드마크",
    onClass: "bg-teal-700 text-white",
    offClass: "bg-white text-teal-700/40",
    icon: (
      <span className="text-[10px] font-extrabold leading-none" aria-hidden>
        L
      </span>
    ),
  },
  {
    key: "pins",
    label: "깃발",
    onClass: "bg-blue-600 text-white",
    offClass: "bg-white text-blue-600/40",
    icon: (
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden>
        <line
          x1="5"
          y1="21"
          x2="5"
          y2="3.5"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path d="M5 3.5 L18.5 7.5 L5 11.5 Z" fill="currentColor" />
      </svg>
    ),
  },
  {
    key: "premium",
    label: "프리미엄",
    onClass: "bg-amber-500 text-white",
    offClass: "bg-white text-amber-500/40",
    icon: (
      <span className="text-[11px] leading-none" aria-hidden>
        👑
      </span>
    ),
  },
];

export default function MapLayerToggle({
  visibility,
  onChange,
  disabled,
}: MapLayerToggleProps) {
  return (
    <div
      className="flex h-9 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg"
      role="group"
      aria-label="지도 레이어"
    >
      {LAYERS.map((layer, index) => {
        const on = visibility[layer.key];
        return (
          <button
            key={layer.key}
            type="button"
            disabled={disabled}
            aria-pressed={on}
            aria-label={`${layer.label} ${on ? "숨기기" : "보이기"}`}
            title={layer.label}
            onClick={() => onChange(layer.key, !on)}
            className={`flex h-9 w-8 items-center justify-center transition-[colors,opacity] active:scale-95 disabled:opacity-50 ${
              on ? layer.onClass : `${layer.offClass} opacity-45`
            } ${index > 0 ? "border-l border-gray-200" : ""}`}
          >
            {layer.icon}
          </button>
        );
      })}
    </div>
  );
}
