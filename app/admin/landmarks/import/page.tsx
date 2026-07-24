"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AdminButton,
  AdminCard,
  AdminInput,
  AdminPageHeader,
  AdminSelect,
  AdminTable,
} from "@/components/admin/AdminUi";
import {
  TOUR_AREA_OPTIONS,
  TOUR_CONTENT_TYPE_LABELS,
  TOUR_LANDMARK_CONTENT_TYPE_IDS,
} from "@/lib/constants";
import type { TourApiLandmarkCandidate } from "@/types/landmark";

type SearchMode = "keyword" | "area" | "location";

const PAGE_SIZE = 50;

export default function AdminLandmarkImportPage() {
  const [mode, setMode] = useState<SearchMode>("keyword");
  const [keyword, setKeyword] = useState("");
  const [areaCode, setAreaCode] = useState("1");
  const [lat, setLat] = useState("37.5665");
  const [lng, setLng] = useState("126.9780");
  const [radius, setRadius] = useState("3000");
  const [contentTypeId, setContentTypeId] = useState("");
  const [candidates, setCandidates] = useState<TourApiLandmarkCandidate[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importingAll, setImportingAll] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const loadingMoreRef = useRef(false);
  const selectAllLoadedRef = useRef(false);

  const buildSearchParams = useCallback(
    (pageNo: number) => {
      const params = new URLSearchParams({
        mode,
        limit: String(PAGE_SIZE),
        page: String(pageNo),
      });
      if (contentTypeId) params.set("contentTypeId", contentTypeId);

      if (mode === "keyword") {
        params.set("q", keyword.trim());
      } else if (mode === "area") {
        params.set("areaCode", areaCode);
      } else {
        params.set("lat", lat);
        params.set("lng", lng);
        params.set("radius", radius);
      }
      return params;
    },
    [mode, contentTypeId, keyword, areaCode, lat, lng, radius]
  );

  const mergeCandidates = (
    prev: TourApiLandmarkCandidate[],
    next: TourApiLandmarkCandidate[]
  ) => {
    const map = new Map(prev.map((c) => [c.contentId, c]));
    for (const item of next) {
      map.set(item.contentId, item);
    }
    return [...map.values()];
  };

  const handleSearch = async () => {
    setLoading(true);
    setMessage(null);
    selectAllLoadedRef.current = false;
    try {
      const res = await fetch(
        `/api/admin/landmarks/tour-search?${buildSearchParams(1)}`
      );
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "검색에 실패했습니다.");
        setCandidates([]);
        setTotalCount(0);
        setHasMore(false);
        setPage(1);
        return;
      }
      const next = (data.candidates ?? []) as TourApiLandmarkCandidate[];
      setCandidates(next);
      setTotalCount(data.totalCount ?? 0);
      setHasMore(data.hasMore === true);
      setPage(1);
      setSelected(new Set());
    } finally {
      setLoading(false);
    }
  };

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMoreRef.current || loading) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await fetch(
        `/api/admin/landmarks/tour-search?${buildSearchParams(nextPage)}`
      );
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "추가 조회에 실패했습니다.");
        setHasMore(false);
        return;
      }
      const next = (data.candidates ?? []) as TourApiLandmarkCandidate[];
      setCandidates((prev) => {
        const merged = mergeCandidates(prev, next);
        if (selectAllLoadedRef.current) {
          setSelected(new Set(merged.map((c) => c.contentId)));
        }
        return merged;
      });
      setTotalCount(data.totalCount ?? totalCount);
      setHasMore(data.hasMore === true);
      setPage(nextPage);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [hasMore, loading, page, buildSearchParams, totalCount]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onScroll = () => {
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 80) {
        void loadMore();
      }
    };

    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [loadMore]);

  const toggleSelected = (contentId: string) => {
    selectAllLoadedRef.current = false;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(contentId)) next.delete(contentId);
      else next.add(contentId);
      return next;
    });
  };

  const selectAllLoaded = () => {
    selectAllLoadedRef.current = true;
    setSelected(new Set(candidates.map((c) => c.contentId)));
  };

  const clearSelection = () => {
    selectAllLoadedRef.current = false;
    setSelected(new Set());
  };

  const handleImportSelected = async () => {
    const items = candidates.filter((c) => selected.has(c.contentId));
    if (items.length === 0) {
      setMessage("가져올 항목을 선택해주세요.");
      return;
    }
    setImporting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/landmarks/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidates: items }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "가져오기에 실패했습니다.");
        return;
      }
      setMessage(
        `선택 가져오기 완료: 신규 ${data.inserted ?? 0}건, 갱신 ${data.updated ?? 0}건`
      );
      clearSelection();
    } finally {
      setImporting(false);
    }
  };

  const handleImportAll = async () => {
    if (totalCount <= 0) {
      setMessage("먼저 검색해주세요.");
      return;
    }
    const ok = window.confirm(
      `검색 조건에 맞는 결과 전체(약 ${totalCount}건)를 TourAPI에서 페이지로 불러와 가져옵니다.\n계속할까요?`
    );
    if (!ok) return;

    setImportingAll(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/landmarks/import-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          q: keyword.trim(),
          areaCode,
          lat: Number.parseFloat(lat),
          lng: Number.parseFloat(lng),
          radius: Number.parseInt(radius, 10),
          contentTypeId: contentTypeId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "전체 가져오기에 실패했습니다.");
        return;
      }
      setMessage(
        [
          `전체 가져오기 완료`,
          `조회 ${data.fetched ?? 0}건 / API totalCount ${data.totalCount ?? 0}`,
          `신규 ${data.inserted ?? 0}건, 갱신 ${data.updated ?? 0}건`,
          data.truncated ? `(상한 ${100}페이지로 일부만 가져옴)` : "",
        ]
          .filter(Boolean)
          .join("\n")
      );
    } finally {
      setImportingAll(false);
    }
  };

  return (
    <div>
      <AdminPageHeader
        title="TourAPI에서 가져오기"
        backHref="/admin/landmarks"
        action={
          <Link href="/admin/landmarks">
            <AdminButton type="button" variant="secondary">
              목록으로
            </AdminButton>
          </Link>
        }
      />

      <AdminCard className="p-4 mb-4 space-y-4">
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">검색 방식</p>
          <div className="flex flex-wrap gap-3">
            {(
              [
                { value: "keyword", label: "키워드" },
                { value: "area", label: "지역" },
                { value: "location", label: "좌표 근처" },
              ] as const
            ).map((opt) => (
              <label
                key={opt.value}
                className="inline-flex items-center gap-1.5 text-sm text-gray-700"
              >
                <input
                  type="radio"
                  name="mode"
                  checked={mode === opt.value}
                  onChange={() => setMode(opt.value)}
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        {mode === "keyword" ? (
          <AdminInput
            label="검색어"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="예: 남산타워"
          />
        ) : null}

        {mode === "area" ? (
          <AdminSelect
            label="지역"
            value={areaCode}
            onChange={(e) => setAreaCode(e.target.value)}
          >
            {TOUR_AREA_OPTIONS.map((area) => (
              <option key={area.code} value={area.code}>
                {area.name}
              </option>
            ))}
          </AdminSelect>
        ) : null}

        {mode === "location" ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <AdminInput
              label="위도"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
            />
            <AdminInput
              label="경도"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
            />
            <AdminInput
              label="반경(m)"
              value={radius}
              onChange={(e) => setRadius(e.target.value)}
            />
          </div>
        ) : null}

        <AdminSelect
          label="콘텐츠 유형"
          value={contentTypeId}
          onChange={(e) => setContentTypeId(e.target.value)}
        >
          <option value="">관광지 + 문화시설</option>
          {TOUR_LANDMARK_CONTENT_TYPE_IDS.map((id) => (
            <option key={id} value={id}>
              {TOUR_CONTENT_TYPE_LABELS[id] ?? id}
            </option>
          ))}
        </AdminSelect>

        <AdminButton
          type="button"
          onClick={() => void handleSearch()}
          disabled={loading}
        >
          {loading ? "검색 중..." : "검색"}
        </AdminButton>
      </AdminCard>

      {message ? (
        <p className="text-sm text-gray-700 mb-3 whitespace-pre-wrap">{message}</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <p className="text-sm text-gray-500 mr-auto">
          목록 {candidates.length}건 / API 전체 {totalCount}건
          {hasMore ? " · 스크롤 시 더 불러옴" : ""}
        </p>
        <AdminButton type="button" variant="secondary" onClick={selectAllLoaded}>
          목록 전체 선택
        </AdminButton>
        <AdminButton type="button" variant="secondary" onClick={clearSelection}>
          선택 해제
        </AdminButton>
        <AdminButton
          type="button"
          onClick={() => void handleImportSelected()}
          disabled={importing || importingAll || selected.size === 0}
        >
          {importing ? "가져오는 중..." : `선택 ${selected.size}건 가져오기`}
        </AdminButton>
        <AdminButton
          type="button"
          variant="secondary"
          onClick={() => void handleImportAll()}
          disabled={importing || importingAll || totalCount === 0}
        >
          {importingAll
            ? "전체 가져오는 중..."
            : `검색 결과 전체 가져오기 (${totalCount})`}
        </AdminButton>
      </div>

      <AdminCard className="overflow-hidden">
        <div ref={scrollRef} className="max-h-[28rem] overflow-auto">
          <AdminTable headers={["", "이름", "유형", "주소", "contentId"]}>
            {candidates.map((row) => (
              <tr
                key={row.contentId}
                className="border-b border-gray-50 hover:bg-gray-50/50"
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(row.contentId)}
                    onChange={() => toggleSelected(row.contentId)}
                  />
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">
                  {row.name}
                </td>
                <td className="px-4 py-3">
                  {TOUR_CONTENT_TYPE_LABELS[row.contentTypeId] ??
                    row.contentTypeId}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 max-w-[240px] truncate">
                  {row.address ?? "-"}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {row.contentId}
                </td>
              </tr>
            ))}
          </AdminTable>
          {candidates.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">
              검색 결과가 없습니다.
            </p>
          ) : null}
          {loadingMore ? (
            <p className="text-sm text-gray-500 text-center py-3">
              더 불러오는 중...
            </p>
          ) : null}
          {!hasMore && candidates.length > 0 ? (
            <p className="text-xs text-gray-400 text-center py-3">
              목록 끝
            </p>
          ) : null}
        </div>
      </AdminCard>
    </div>
  );
}
