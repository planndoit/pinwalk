"use client";

import { useCallback, useRef, useState } from "react";

/** 성공 후 잠금 유지(화면 전환·모달 닫기 등) vs 즉시 해제(같은 화면에서 재시도 가능) */
export type SubmitLockResult = "keep" | "release";

export function useSubmitLock() {
  const [locked, setLocked] = useState(false);
  const lockedRef = useRef(false);

  const unlock = useCallback(() => {
    lockedRef.current = false;
    setLocked(false);
  }, []);

  const run = useCallback(
    async (action: () => Promise<SubmitLockResult>) => {
      if (lockedRef.current) return;
      lockedRef.current = true;
      setLocked(true);
      try {
        const result = await action();
        if (result === "release") unlock();
      } catch {
        unlock();
      }
    },
    [unlock]
  );

  return { locked, run, unlock };
}
