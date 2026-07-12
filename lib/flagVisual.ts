import { DEFAULT_PIN_COST, isPinCost, type PinCost } from "./constants";

export type FlagTier = PinCost;

export function getFlagTier(cost: number | null | undefined): FlagTier {
  if (typeof cost === "number" && isPinCost(cost)) {
    return cost;
  }
  return DEFAULT_PIN_COST;
}

/** 맵 마커용 티어별 깃발 SVG (흰색, 배경색 버블 위에 올림) */
export function createFlagIconSvg(tier: FlagTier, size = 14): string {
  const common = `width="${size}" height="${size}" viewBox="0 0 24 24" style="display:block;flex-shrink:0" aria-hidden="true"`;

  switch (tier) {
    case 100:
      return `<svg ${common}><line x1="5" y1="21" x2="5" y2="3" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/><path d="M5 3 L19 7.5 L5 12 Z" fill="#ffffff"/></svg>`;
    case 300:
      return `<svg ${common}><line x1="5" y1="21" x2="5" y2="3" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/><path d="M5 3 L20 7 L5 11 Z" fill="#ffffff"/><path d="M7 6.2 L16.5 7.2 L7 9.5 Z" fill="rgba(0,0,0,0.22)"/></svg>`;
    case 500:
      return `<svg ${common}><line x1="5" y1="21" x2="5" y2="3" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/><path d="M5 3 L20 7 L5 11 Z" fill="#ffffff"/><path d="M8.5 5.8 L11 7 L8.5 8.2 L6 7 Z" fill="#fbbf24"/></svg>`;
    case 1000:
      return `<svg ${common}><line x1="5" y1="21" x2="5" y2="2.5" stroke="#fde68a" stroke-width="2.5" stroke-linecap="round"/><path d="M5 3.5 L20 7 L5 11.5 Z" fill="#fbbf24"/><path d="M5 3.5 L20 7 L5 11.5 Z" fill="none" stroke="#ffffff" stroke-width="1.2"/><path d="M4 2.2 L6.2 3.4 L8.2 2 L9.5 3.6 L5 4.2 L0.5 3.6 L1.8 2 L3.8 3.4 Z" fill="#fde68a" stroke="#ffffff" stroke-width="0.6" stroke-linejoin="round"/></svg>`;
  }
}

export function getFlagMarkerScale(tier: FlagTier): {
  paddingY: number;
  paddingX: number;
  fontSize: number;
  emojiSize: number;
  flagSize: number;
  borderWidth: number;
} {
  switch (tier) {
    case 100:
      return {
        paddingY: 7,
        paddingX: 12,
        fontSize: 12,
        emojiSize: 28,
        flagSize: 14,
        borderWidth: 2,
      };
    case 300:
      return {
        paddingY: 8,
        paddingX: 13,
        fontSize: 12,
        emojiSize: 30,
        flagSize: 15,
        borderWidth: 2,
      };
    case 500:
      return {
        paddingY: 8,
        paddingX: 14,
        fontSize: 13,
        emojiSize: 32,
        flagSize: 16,
        borderWidth: 2.5,
      };
    case 1000:
      return {
        paddingY: 9,
        paddingX: 15,
        fontSize: 13,
        emojiSize: 36,
        flagSize: 18,
        borderWidth: 3,
      };
  }
}

export function getFlagAccentColor(tier: FlagTier, isMine: boolean): string {
  if (tier === 1000) return isMine ? "#1d4ed8" : "#b45309";
  if (tier === 500) return isMine ? "#1d4ed8" : "#dc2626";
  return isMine ? "#2563eb" : "#ef4444";
}

export function getFlagBorderColor(tier: FlagTier): string {
  if (tier === 1000) return "#fbbf24";
  if (tier === 500) return "#fde68a";
  return "#ffffff";
}

export function getFlagLabel(tier: FlagTier): string {
  return `${tier}P`;
}
