import type { SerializedPremiumPlace } from "@/types/premiumClient";

export const FOCUS_PREMIUM_PLACE_KEY = "pinwalk:focusPremiumPlace";

export function saveFocusPremiumPlace(place: SerializedPremiumPlace): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(FOCUS_PREMIUM_PLACE_KEY, JSON.stringify(place));
}

export function consumeFocusPremiumPlace(): SerializedPremiumPlace | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(FOCUS_PREMIUM_PLACE_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(FOCUS_PREMIUM_PLACE_KEY);
  try {
    return JSON.parse(raw) as SerializedPremiumPlace;
  } catch {
    return null;
  }
}
