"use client";

import { useEffect, useState } from "react";
import { LANDMARK_SOURCE_ATTRIBUTION } from "@/lib/constants";
import type {
  LandmarkRankingEntry,
  SerializedLandmark,
} from "@/types/landmark";

interface LandmarkBottomSheetProps {
  landmark: SerializedLandmark | null;
  onClose: () => void;
}

export default function LandmarkBottomSheet({
  landmark,
  onClose,
}: LandmarkBottomSheetProps) {
  const [ranking, setRanking] = useState<LandmarkRankingEntry[]>([]);
  const [rankingLoading, setRankingLoading] = useState(false);

  useEffect(() => {
    if (!landmark) {
      setRanking([]);
      return;
    }

    let cancelled = false;
    setRankingLoading(true);

    void (async () => {
      try {
        const res = await fetch(`/api/landmarks/${landmark.id}/ranking`, {
          cache: "no-store",
        });
        if (!res.ok) {
          if (!cancelled) setRanking([]);
          return;
        }
        const data = await res.json();
        if (!cancelled) {
          setRanking(
            Array.isArray(data.ranking) ? (data.ranking as LandmarkRankingEntry[]) : []
          );
        }
      } catch {
        if (!cancelled) setRanking([]);
      } finally {
        if (!cancelled) setRankingLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [landmark]);

  if (!landmark) return null;

  return (
    <div className="fixed inset-0 z-40">
      <button
        type="button"
        className="absolute inset-0 bg-transparent"
        aria-label="닫기"
        onClick={onClose}
      />
      <div className="absolute inset-x-0 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] px-4 pointer-events-none">
        <div className="max-w-lg mx-auto pointer-events-auto">
          <div
            className="bg-white border border-teal-200 rounded-2xl shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {landmark.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={landmark.imageUrl}
                alt=""
                className="w-full h-36 object-cover bg-teal-50"
              />
            ) : null}
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="inline-block px-2 py-0.5 rounded bg-teal-700 text-white text-[10px] font-bold tracking-wide">
                      랜드마크
                    </span>
                    {landmark.isClosed ? (
                      <span className="inline-block px-2 py-0.5 rounded bg-gray-500 text-white text-[10px] font-bold">
                        미운영
                      </span>
                    ) : null}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {landmark.name}
                    {landmark.titleHolderNickname ? (
                      <span className="font-semibold text-teal-800">
                        {" "}
                        ({landmark.titleHolderNickname})
                      </span>
                    ) : null}
                  </h3>
                  {landmark.address ? (
                    <p className="text-xs text-teal-800 mt-0.5">
                      {landmark.address}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-gray-400 text-xl leading-none shrink-0"
                >
                  ×
                </button>
              </div>

              {landmark.isClosed ? (
                <p className="mt-3 text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                  현재 운영되지 않는 랜드마크입니다.
                </p>
              ) : null}

              {landmark.overview ? (
                <p className="mt-3 max-h-[8.25rem] overflow-y-auto text-sm leading-6 text-gray-700 whitespace-pre-line overscroll-contain">
                  {landmark.overview}
                </p>
              ) : null}

              <div className="mt-4">
                <h4 className="text-sm font-bold text-gray-900 mb-2">
                  점령 순위 Top 10
                </h4>
                {rankingLoading ? (
                  <p className="text-xs text-gray-400">불러오는 중…</p>
                ) : ranking.length === 0 ? (
                  <p className="text-xs text-gray-400">
                    아직 점령한 유저가 없습니다.
                  </p>
                ) : (
                  <ol className="space-y-1.5">
                    {ranking.map((row) => (
                      <li
                        key={`${row.userId}-${row.rank}`}
                        className="flex items-center justify-between gap-3 text-sm"
                      >
                        <span className="min-w-0 flex items-center gap-2">
                          <span className="w-5 text-center tabular-nums text-teal-800 font-bold shrink-0">
                            {row.rank}
                          </span>
                          <span className="truncate font-medium text-gray-900">
                            {row.nickname}
                          </span>
                        </span>
                        <span className="tabular-nums text-teal-900 font-semibold shrink-0">
                          {row.score.toLocaleString()}P
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>

              {landmark.tel ? (
                <a
                  href={`tel:${landmark.tel.replace(/[^0-9+]/g, "")}`}
                  className="mt-3 flex items-center justify-between gap-3 w-full rounded-xl bg-teal-700 text-white px-4 py-3 font-bold"
                >
                  <span className="text-sm">전화하기</span>
                  <span className="text-base tabular-nums tracking-tight">
                    {landmark.tel}
                  </span>
                </a>
              ) : null}

              <p className="mt-3 text-[11px] text-gray-400">
                자료 제공: {LANDMARK_SOURCE_ATTRIBUTION}
                {landmark.source === "manual" ? " · 수동 등록" : ""}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
