import { SESSION_IDLE_MS, LAST_ACTIVITY_KEY } from "./constants";

const TOUCH_THROTTLE_MS = 5_000;
let lastTouchWriteMs = 0;

export function touchActivity(): void {
  if (typeof window === "undefined") return;
  const now = Date.now();
  if (now - lastTouchWriteMs < TOUCH_THROTTLE_MS) return;
  lastTouchWriteMs = now;
  localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
}

export function isSessionIdleExpired(): boolean {
  if (typeof window === "undefined") return false;
  const raw = localStorage.getItem(LAST_ACTIVITY_KEY);
  if (!raw) return false;
  const last = Number(raw);
  if (Number.isNaN(last)) return false;
  return Date.now() - last > SESSION_IDLE_MS;
}

export function clearActivity(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LAST_ACTIVITY_KEY);
}
