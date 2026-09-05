import {
  DEFAULT_PIN_COST,
  FIXED_PIN_RADIUS_METERS,
  PIN_COST_STEPS,
  PIN_REINFORCE_COOLDOWN_MS,
  getNextPinCost,
  normalizePinCost,
  type PinCost,
} from "@/lib/constants";

export type FlagTier = PinCost;

export function getFlagTier(cost: number | null | undefined): FlagTier {
  if (typeof cost === "number") {
    return normalizePinCost(cost);
  }
  return DEFAULT_PIN_COST;
}

/** 맵 마커용 티어별 깃발 SVG (흰색, 배경색 버블 위에 올림) */
export function createFlagIconSvg(tier: FlagTier, size = 14): string {
  const common = `width="${size}" height="${size}" viewBox="0 0 24 24" style="display:block;flex-shrink:0" aria-hidden="true"`;

  if (tier <= 200) {
    return `<svg ${common}><line x1="5" y1="21" x2="5" y2="3" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/><path d="M5 3 L19 7.5 L5 12 Z" fill="#ffffff"/></svg>`;
  }
  if (tier <= 400) {
    return `<svg ${common}><line x1="5" y1="21" x2="5" y2="3" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/><path d="M5 3 L20 7 L5 11 Z" fill="#ffffff"/><path d="M7 6.2 L16.5 7.2 L7 9.5 Z" fill="rgba(0,0,0,0.22)"/></svg>`;
  }
  if (tier <= 600) {
    return `<svg ${common}><line x1="5" y1="21" x2="5" y2="3" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/><path d="M5 3 L20 7 L5 11 Z" fill="#ffffff"/><path d="M8.5 5.8 L11 7 L8.5 8.2 L6 7 Z" fill="#fbbf24"/></svg>`;
  }
  if (tier <= 800) {
    return `<svg ${common}><line x1="5" y1="21" x2="5" y2="3" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/><path d="M5 3 L20 7.2 L5 11.5 Z" fill="#ffffff"/><path d="M7 5.8 L17 7 L7 9.8 Z" fill="rgba(0,0,0,0.18)"/><path d="M8.5 5.5 L11 6.8 L8.5 8.1 L6 6.8 Z" fill="#fbbf24"/></svg>`;
  }
  return `<svg ${common}><line x1="5" y1="21" x2="5" y2="2.5" stroke="#fde68a" stroke-width="2.5" stroke-linecap="round"/><path d="M5 3.5 L20 7 L5 11.5 Z" fill="#fbbf24"/><path d="M5 3.5 L20 7 L5 11.5 Z" fill="none" stroke="#ffffff" stroke-width="1.2"/><path d="M4 2.2 L6.2 3.4 L8.2 2 L9.5 3.6 L5 4.2 L0.5 3.6 L1.8 2 L3.8 3.4 Z" fill="#fde68a" stroke="#ffffff" stroke-width="0.6" stroke-linejoin="round"/></svg>`;
}

export function getFlagMarkerScale(tier: FlagTier): {
  paddingY: number;
  paddingX: number;
  fontSize: number;
  emojiSize: number;
  flagSize: number;
  borderWidth: number;
} {
  const step = Math.max(0, PIN_COST_STEPS.indexOf(tier));
  return {
    paddingY: 7 + step * 0.25,
    paddingX: 12 + step * 0.35,
    fontSize: 12 + (step >= 5 ? 1 : 0),
    emojiSize: 28 + step,
    flagSize: 14 + Math.floor(step / 2),
    borderWidth: step >= 8 ? 3 : step >= 4 ? 2.5 : 2,
  };
}

export function getFlagAccentColor(tier: FlagTier, isMine: boolean): string {
  if (tier >= 900) return isMine ? "#1d4ed8" : "#b45309";
  if (tier >= 500) return isMine ? "#1d4ed8" : "#dc2626";
  return isMine ? "#2563eb" : "#ef4444";
}

export function getFlagBorderColor(tier: FlagTier): string {
  if (tier >= 900) return "#fbbf24";
  if (tier >= 500) return "#fde68a";
  return "#ffffff";
}

export function getFlagLabel(tier: FlagTier): string {
  return `${tier}P`;
}

export function getPinReinforceAnchorAt(pin: {
  created_at: string;
  last_reinforced_at?: string | null;
}): Date {
  if (pin.last_reinforced_at) {
    return new Date(pin.last_reinforced_at);
  }
  return new Date(pin.created_at);
}

export function getPinReinforceAvailableAt(pin: {
  created_at: string;
  last_reinforced_at?: string | null;
}): Date {
  return new Date(
    getPinReinforceAnchorAt(pin).getTime() + PIN_REINFORCE_COOLDOWN_MS
  );
}

export function getPinReinforceCooldownMsRemaining(
  pin: {
    created_at: string;
    last_reinforced_at?: string | null;
  },
  nowMs = Date.now()
): number {
  return Math.max(0, getPinReinforceAvailableAt(pin).getTime() - nowMs);
}

export function formatCooldownRemaining(ms: number): string {
  if (ms <= 0) return "가능";
  const totalMinutes = Math.ceil(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes}분`;
  if (minutes <= 0) return `${hours}시간`;
  return `${hours}시간 ${minutes}분`;
}

export function getFixedPinRadiusMeters(): number {
  return FIXED_PIN_RADIUS_METERS;
}

export { getNextPinCost, normalizePinCost };
