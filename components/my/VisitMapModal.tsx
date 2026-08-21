"use client";

import { useEffect, useMemo, useState } from "react";
import { formatActivityDate } from "@/lib/formatDate";
import {
  KOREA_MAP_SIZE,
  projectKoreaLngLat,
} from "@/lib/geo/koreaMapProjection";
import type { SigunguCollection, SigunguFeature, VisitStats } from "@/types/visit";

let geojsonPromise: Promise<SigunguCollection> | null = null;

function loadSigunguGeojson(): Promise<SigunguCollection> {
  if (!geojsonPromise) {
    geojsonPromise = fetch("/geo/korea-sigungu.json")
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("지도 데이터를 불러오지 못했습니다.");
        }
        return (await res.json()) as SigunguCollection;
      })
      .catch((error) => {
        geojsonPromise = null;
        throw error;
      });
  }
  return geojsonPromise;
}

function geometryToPath(geometry: SigunguFeature["geometry"]): string {
  const polygons =
    geometry.type === "Polygon"
      ? [geometry.coordinates as number[][][]]
      : (geometry.coordinates as number[][][][]);
  const parts: string[] = [];
  for (const polygon of polygons) {
    for (const ring of polygon) {
      const commands: string[] = [];
      for (let i = 0; i < ring.length; i++) {
        const point = ring[i];
        if (!point || point.length < 2) continue;
        const { x, y } = projectKoreaLngLat(point[0], point[1]);
        commands.push(`${i === 0 ? "M" : "L"}${x.toFixed(4)} ${y.toFixed(4)}`);
      }
      if (commands.length >= 3) {
        commands.push("Z");
        parts.push(commands.join(" "));
      }
    }
  }
  return parts.join(" ");
}

function groupVisitedRegions(stats: VisitStats) {
  const groups: {
    sido_code: string;
    sido_name: string;
    regions: VisitStats["regions"];
  }[] = [];
  const index = new Map<string, number>();
  for (const region of stats.regions) {
    const existing = index.get(region.sido_code);
    if (existing === undefined) {
      index.set(region.sido_code, groups.length);
      groups.push({
        sido_code: region.sido_code,
        sido_name: region.sido_name,
        regions: [region],
      });
    } else {
      groups[existing].regions.push(region);
    }
  }
  return groups;
}

export default function VisitMapModal({
  open,
  onClose,
  visits,
}: {
  open: boolean;
  onClose: () => void;
  visits: VisitStats | null;
}) {
  const [geojson, setGeojson] = useState<SigunguCollection | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || geojson) return;
    let cancelled = false;
    void loadSigunguGeojson()
      .then((data) => {
        if (cancelled) return;
        setGeojson(data);
        setLoadError(null);
      })
      .catch(() => {
        if (!cancelled) setLoadError("지도 데이터를 불러오지 못했습니다.");
      });
    return () => {
      cancelled = true;
    };
  }, [open, geojson]);

  const visitedByCode = useMemo(() => {
    const map = new Map<string, VisitStats["regions"][number]>();
    for (const region of visits?.regions ?? []) {
      map.set(region.code, region);
    }
    return map;
  }, [visits]);

  const selectedFeature = geojson?.features.find(
    (feature) => feature.properties.SIG_CD === selectedCode
  );
  const selectedVisit = selectedCode
    ? (visitedByCode.get(selectedCode) ?? null)
    : null;
  const groups = visits ? groupVisitedRegions(visits) : [];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="visit-map-title"
        className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[85dvh] flex flex-col"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2
            id="visit-map-title"
            className="text-base font-bold text-gray-900 pr-4"
          >
            내가 방문한 곳
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 shrink-0 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4">
          <p className="text-sm text-gray-600">
            {visits
              ? `${visits.visited_count} / ${visits.total_count}개 시·군·구 · ${visits.sido_visited_count}개 시·도`
              : "방문 기록을 불러오는 중..."}
          </p>

          <div className="mt-3 rounded-2xl bg-slate-50 border border-gray-100 p-3">
            {loadError ? (
              <p className="text-sm text-red-500 text-center py-10">
                {loadError}
              </p>
            ) : !geojson ? (
              <div className="flex justify-center py-16">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <svg
                viewBox={`0 0 ${KOREA_MAP_SIZE.width} ${KOREA_MAP_SIZE.height}`}
                className="w-full h-auto"
                role="img"
                aria-label="전국 시군구 방문 지도"
              >
                {geojson.features.map((feature) => {
                  const code = feature.properties.SIG_CD;
                  const visited = visitedByCode.has(code);
                  const selected = selectedCode === code;
                  return (
                    <path
                      key={code}
                      d={geometryToPath(feature.geometry)}
                      fillRule="evenodd"
                      onClick={() => setSelectedCode(code)}
                      className="cursor-pointer"
                      fill={
                        selected
                          ? visited
                            ? "#1d4ed8"
                            : "#cbd5e1"
                          : visited
                            ? "#2563eb"
                            : "#f3f4f6"
                      }
                      stroke={visited ? "#1e40af" : "#e5e7eb"}
                      strokeWidth={selected ? 0.018 : 0.01}
                    />
                  );
                })}
              </svg>
            )}
          </div>

          {selectedFeature ? (
            <div className="mt-3 rounded-2xl border border-gray-100 bg-white px-4 py-3">
              <p className="text-xs text-gray-400">
                {selectedFeature.properties.CTP_KOR_NM}
              </p>
              <p className="text-sm font-bold text-gray-900 mt-0.5">
                {selectedFeature.properties.SIG_KOR_NM}
              </p>
              {selectedVisit ? (
                <p className="text-xs text-gray-500 mt-1">
                  첫 방문 {formatActivityDate(selectedVisit.first_visited_at)} ·
                  깃발 {selectedVisit.pin_count.toLocaleString()}개
                </p>
              ) : (
                <p className="text-xs text-gray-400 mt-1">아직 방문하지 않은 곳</p>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-400 mt-3">
              지역을 누르면 이름을 확인할 수 있어요.
            </p>
          )}

          <div className="mt-5">
            <h3 className="text-sm font-bold text-gray-800 mb-2">방문 목록</h3>
            {groups.length === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center">
                깃발을 꽂으면 방문한 시·군·구가 여기에 쌓여요.
              </p>
            ) : (
              <div className="space-y-4">
                {groups.map((group) => (
                  <div key={group.sido_code}>
                    <p className="text-xs font-semibold text-gray-500 mb-1.5">
                      {group.sido_name}
                    </p>
                    <ul className="space-y-1">
                      {group.regions.map((region) => (
                        <li key={region.code}>
                          <button
                            type="button"
                            onClick={() => setSelectedCode(region.code)}
                            className={`w-full text-left rounded-xl px-3 py-2 border ${
                              selectedCode === region.code
                                ? "border-blue-200 bg-blue-50"
                                : "border-gray-100 bg-white"
                            }`}
                          >
                            <p className="text-sm font-semibold text-gray-900">
                              {region.name}
                            </p>
                            <p className="text-[11px] text-gray-400 mt-0.5">
                              첫 방문 {formatActivityDate(region.first_visited_at)}{" "}
                              · 깃발 {region.pin_count.toLocaleString()}개
                            </p>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
