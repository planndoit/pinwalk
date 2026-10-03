"use client";

import { useCallback, useSyncExternalStore } from "react";

const CLOCK_INTERVAL_MS = 30_000;

function getClockSnapshot(): number {
  return Math.floor(Date.now() / CLOCK_INTERVAL_MS) * CLOCK_INTERVAL_MS;
}

function noopUnsubscribe(): void {}

/** 30초 단위로 내림한 현재 시각(ms). enabled일 때만 주기적으로 다시 렌더링한다. */
export function useClock(enabled: boolean): number {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!enabled) return noopUnsubscribe;
      const id = window.setInterval(onChange, CLOCK_INTERVAL_MS);
      return () => window.clearInterval(id);
    },
    [enabled]
  );

  return useSyncExternalStore(subscribe, getClockSnapshot, getClockSnapshot);
}
