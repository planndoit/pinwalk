import type { SerializedPremiumPlace } from "@/types/premiumClient";

export const FOCUS_PREMIUM_PLACE_KEY = "pinwalk:focusPremiumPlace";

const listeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cachedPlace: SerializedPremiumPlace | null = null;

function emit(): void {
  for (const listener of listeners) listener();
}

export function saveFocusPremiumPlace(place: SerializedPremiumPlace): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(FOCUS_PREMIUM_PLACE_KEY, JSON.stringify(place));
  emit();
}

export function clearFocusPremiumPlace(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(FOCUS_PREMIUM_PLACE_KEY);
  emit();
}

export function subscribeFocusPremiumPlace(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getFocusPremiumPlaceSnapshot(): SerializedPremiumPlace | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(FOCUS_PREMIUM_PLACE_KEY);
  if (raw === cachedRaw) return cachedPlace;
  cachedRaw = raw;
  if (!raw) {
    cachedPlace = null;
    return null;
  }
  try {
    cachedPlace = JSON.parse(raw) as SerializedPremiumPlace;
  } catch {
    cachedPlace = null;
  }
  return cachedPlace;
}

export function getFocusPremiumPlaceServerSnapshot(): SerializedPremiumPlace | null {
  return null;
}
