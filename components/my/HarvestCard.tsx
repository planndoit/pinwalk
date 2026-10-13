"use client";

import { useCallback, useEffect, useState } from "react";
import { REMOTE_HARVEST_MIN_TOTAL } from "@/lib/harvest";
import { PIN_HARVEST_REMOTE_PERCENT } from "@/lib/constants";
import { useSubmitLock } from "@/lib/useSubmitLock";
import type { HarvestSummary } from "@/types/harvest";

export default function HarvestCard({
  onHarvested,
  onError,
}: {
  onHarvested: (result: { points: number; message: string }) => void;
  onError: (message: string) => void;
}) {
  const [summary, setSummary] = useState<HarvestSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const { locked: harvesting, run } = useSubmitLock();

  const fetchSummary = useCallback(async () => {
    const res = await fetch("/api/harvest/summary", { cache: "no-store" });
    if (res.ok) {
      setSummary((await res.json()) as HarvestSummary);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void fetchSummary();
    });
  }, [fetchSummary]);

  const total = summary?.harvestTotal ?? 0;
  const remoteAmount = summary?.remoteAmount ?? 0;
  const lostAmount = total - remoteAmount;

  const handleRemoteAll = () => {
    if (harvesting || remoteAmount <= 0) return;
    const ok = window.confirm(
      `전체 원격 수확하면 ${remoteAmount.toLocaleString()}P만 받고 ${lostAmount.toLocaleString()}P는 사라져요. 계속할까요?`
    );
    if (!ok) return;

    void run(async () => {
      const res = await fetch("/api/harvest/remote-all", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        onError(data.error ?? "전체 원격 수확에 실패했습니다.");
        await fetchSummary();
        return "release";
      }
      onHarvested({
        points: Number(data.points),
        message: String(data.message ?? ""),
      });
      await fetchSummary();
      return "release";
    });
  };

  return (
    <section className="px-4 pt-2">
      <div className="bg-white border border-amber-100 rounded-2xl px-4 py-4 shadow-sm">
        <p className="text-sm font-bold text-gray-900">🌾 깃발 수확</p>
        {loading ? (
          <p className="text-xs text-gray-400 mt-1">불러오는 중...</p>
        ) : total > 0 && summary ? (
          <>
            <p className="text-xs text-gray-600 mt-1">
              내 깃발 {summary.pinCount.toLocaleString()}개 · 쌓인 수확 포인트{" "}
              <span className="font-semibold text-amber-700">
                {total.toLocaleString()}P
              </span>
            </p>
            {summary.fullPinCount > 0 ? (
              <p className="text-xs font-semibold text-red-500 mt-0.5">
                가득 찬 깃발 {summary.fullPinCount.toLocaleString()}개 · 수확하기
                전까지 더 쌓이지 않아요
              </p>
            ) : null}
          </>
        ) : (
          <p className="text-xs text-gray-500 mt-1">
            아직 쌓인 수확 포인트가 없어요
          </p>
        )}

        <button
          type="button"
          onClick={handleRemoteAll}
          disabled={loading || harvesting || remoteAmount <= 0}
          className="mt-3 w-full py-3 rounded-2xl bg-amber-500 text-white text-sm font-bold shadow-lg shadow-amber-500/20 active:scale-98 transition-transform disabled:opacity-40"
        >
          {harvesting
            ? "수확 중..."
            : remoteAmount > 0
              ? `전체 원격 수확 (+${remoteAmount.toLocaleString()}P)`
              : "전체 원격 수확"}
        </button>
        {!loading && total > 0 && remoteAmount <= 0 ? (
          <p className="mt-1.5 text-center text-[11px] text-amber-700">
            {REMOTE_HARVEST_MIN_TOTAL}P 이상 쌓이면 전체 원격 수확할 수 있어요
          </p>
        ) : null}

        <p className="mt-3 text-[11px] text-gray-500 leading-relaxed">
          전체 원격 수확은 내 모든 깃발에 쌓인 수확 포인트를 한 번에 받는
          기능이에요.
          <br />
          대신 합계의 {PIN_HARVEST_REMOTE_PERCENT}%만 받고 나머지{" "}
          {100 - PIN_HARVEST_REMOTE_PERCENT}%는 사라져요.
          <br />
          깃발 영역 안에 가서 직접 수확하면 쌓인 포인트를 모두 받을 수 있어요.
        </p>
      </div>
    </section>
  );
}
