"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AdminButton,
  AdminCard,
  AdminInput,
  AdminPageHeader,
  AdminTable,
} from "@/components/admin/AdminUi";
import {
  TOUR_AREA_OPTIONS,
  TOUR_CONTENT_TYPE_LABELS,
  TOUR_LANDMARK_CONTENT_TYPE_IDS,
} from "@/lib/constants";
import { formatActivityDate } from "@/lib/formatDate";
import type { SerializedLandmark } from "@/types/landmark";

interface SearchFilters {
  q: string;
  address: string;
  visible: string[];
  closed: string[];
  areaCodes: string[];
  contentTypeIds: string[];
}

const EMPTY_FILTERS: SearchFilters = {
  q: "",
  address: "",
  visible: [],
  closed: [],
  areaCodes: [],
  contentTypeIds: [],
};

const PAGE_SIZE = 50;

function toggleValue(list: string[], value: string): string[] {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}

function buildListParams(filters: SearchFilters, page: number) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(PAGE_SIZE),
  });
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.address.trim()) params.set("address", filters.address.trim());
  if (filters.visible.length > 0) {
    params.set("visible", filters.visible.join(","));
  }
  if (filters.closed.length > 0) {
    params.set("closed", filters.closed.join(","));
  }
  if (filters.areaCodes.length > 0) {
    params.set("areaCode", filters.areaCodes.join(","));
  }
  if (filters.contentTypeIds.length > 0) {
    params.set("contentTypeId", filters.contentTypeIds.join(","));
  }
  return params;
}

export default function AdminLandmarksPage() {
  const [draft, setDraft] = useState<SearchFilters>(EMPTY_FILTERS);
  const [landmarks, setLandmarks] = useState<SerializedLandmark[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const loadingMoreRef = useRef(false);
  const selectAllLoadedRef = useRef(false);
  const pageRef = useRef(1);
  const hasMoreRef = useRef(false);
  const appliedRef = useRef<SearchFilters>(EMPTY_FILTERS);
  const totalRef = useRef(0);
  const loadedCountRef = useRef(0);

  const fetchPage = useCallback(
    async (filters: SearchFilters, pageNo: number, append: boolean) => {
      const res = await fetch(
        `/api/admin/landmarks?${buildListParams(filters, pageNo)}`
      );
      if (!res.ok) {
        const data = await res.json();
        setMessage(data.error ?? "조회에 실패했습니다.");
        return;
      }
      const data = await res.json();
      const next = (data.landmarks ?? []) as SerializedLandmark[];
      const nextTotal = data.total ?? 0;
      setTotal(nextTotal);
      totalRef.current = nextTotal;
      pageRef.current = pageNo;
      setMessage(null);

      if (append) {
        setLandmarks((prev) => {
          const map = new Map(prev.map((row) => [row.id, row]));
          for (const row of next) map.set(row.id, row);
          const merged = [...map.values()];
          loadedCountRef.current = merged.length;
          const more = merged.length < nextTotal;
          hasMoreRef.current = more;
          setHasMore(more);
          if (selectAllLoadedRef.current) {
            setSelected(new Set(merged.map((row) => row.id)));
          }
          return merged;
        });
      } else {
        loadedCountRef.current = next.length;
        const more = next.length < nextTotal;
        hasMoreRef.current = more;
        setHasMore(more);
        setLandmarks(next);
        setSelected(new Set());
        selectAllLoadedRef.current = false;
      }
    },
    []
  );

  useEffect(() => {
    queueMicrotask(() => {
      setLoading(true);
      appliedRef.current = EMPTY_FILTERS;
      void fetchPage(EMPTY_FILTERS, 1, false).finally(() => setLoading(false));
    });
  }, [fetchPage]);

  const handleSearch = () => {
    appliedRef.current = draft;
    setLoading(true);
    void fetchPage(draft, 1, false).finally(() => setLoading(false));
  };

  const handleReset = () => {
    setDraft(EMPTY_FILTERS);
    appliedRef.current = EMPTY_FILTERS;
    setLoading(true);
    void fetchPage(EMPTY_FILTERS, 1, false).finally(() => setLoading(false));
  };

  const loadMore = useCallback(async () => {
    if (!hasMoreRef.current || loadingMoreRef.current || loading) return;
    if (loadedCountRef.current >= totalRef.current) {
      hasMoreRef.current = false;
      setHasMore(false);
      return;
    }
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      await fetchPage(appliedRef.current, pageRef.current + 1, true);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [loading, fetchPage]);

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

  const allSelected =
    landmarks.length > 0 && landmarks.every((row) => selected.has(row.id));

  const toggleAll = () => {
    if (allSelected) {
      selectAllLoadedRef.current = false;
      setSelected(new Set());
      return;
    }
    selectAllLoadedRef.current = true;
    setSelected(new Set(landmarks.map((row) => row.id)));
  };

  const toggleOne = (id: string) => {
    selectAllLoadedRef.current = false;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkVisibility = async (mapVisible: boolean) => {
    if (selected.size === 0) {
      setMessage("선택된 랜드마크가 없습니다.");
      return;
    }
    setBulkLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/landmarks/bulk-visibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: [...selected],
          mapVisible,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "일괄 변경에 실패했습니다.");
        return;
      }
      setMessage(
        `${data.updated ?? 0}건을 지도 ${mapVisible ? "노출" : "미노출"}로 변경했습니다.`
      );
      setLoading(true);
      await fetchPage(appliedRef.current, 1, false);
    } finally {
      setBulkLoading(false);
      setLoading(false);
    }
  };

  return (
    <div>
      <AdminPageHeader
        title="랜드마크 관리"
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/landmarks/import">
              <AdminButton type="button">TourAPI에서 가져오기</AdminButton>
            </Link>
            <Link href="/admin/landmarks/new">
              <AdminButton type="button" variant="secondary">
                수동 추가
              </AdminButton>
            </Link>
          </div>
        }
      />

      <AdminCard className="p-4 mb-4 space-y-4">
        <AdminInput
          label="이름 검색"
          value={draft.q}
          onChange={(e) => setDraft({ ...draft, q: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSearch();
            }
          }}
        />

        <AdminInput
          label="주소 검색"
          value={draft.address}
          onChange={(e) => setDraft({ ...draft, address: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSearch();
            }
          }}
          placeholder="예: 종로구, 남산"
        />

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">지역</p>
          <div className="flex flex-wrap gap-3">
            {TOUR_AREA_OPTIONS.map((area) => (
              <label
                key={area.code}
                className="inline-flex items-center gap-1.5 text-sm text-gray-700"
              >
                <input
                  type="checkbox"
                  checked={draft.areaCodes.includes(area.code)}
                  onChange={() =>
                    setDraft({
                      ...draft,
                      areaCodes: toggleValue(draft.areaCodes, area.code),
                    })
                  }
                />
                {area.name}
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">유형</p>
          <div className="flex flex-wrap gap-3">
            {TOUR_LANDMARK_CONTENT_TYPE_IDS.map((id) => (
              <label
                key={id}
                className="inline-flex items-center gap-1.5 text-sm text-gray-700"
              >
                <input
                  type="checkbox"
                  checked={draft.contentTypeIds.includes(id)}
                  onChange={() =>
                    setDraft({
                      ...draft,
                      contentTypeIds: toggleValue(draft.contentTypeIds, id),
                    })
                  }
                />
                {TOUR_CONTENT_TYPE_LABELS[id] ?? id}
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">지도 노출</p>
          <div className="flex flex-wrap gap-3">
            {[
              { value: "true", label: "노출" },
              { value: "false", label: "미노출" },
            ].map((opt) => (
              <label
                key={opt.value}
                className="inline-flex items-center gap-1.5 text-sm text-gray-700"
              >
                <input
                  type="checkbox"
                  checked={draft.visible.includes(opt.value)}
                  onChange={() =>
                    setDraft({
                      ...draft,
                      visible: toggleValue(draft.visible, opt.value),
                    })
                  }
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">운영 여부</p>
          <div className="flex flex-wrap gap-3">
            {[
              { value: "false", label: "운영" },
              { value: "true", label: "미운영" },
            ].map((opt) => (
              <label
                key={opt.value}
                className="inline-flex items-center gap-1.5 text-sm text-gray-700"
              >
                <input
                  type="checkbox"
                  checked={draft.closed.includes(opt.value)}
                  onChange={() =>
                    setDraft({
                      ...draft,
                      closed: toggleValue(draft.closed, opt.value),
                    })
                  }
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <AdminButton type="button" onClick={handleSearch} disabled={loading}>
            {loading ? "검색 중..." : "검색"}
          </AdminButton>
          <AdminButton
            type="button"
            variant="secondary"
            onClick={handleReset}
            disabled={loading}
          >
            초기화
          </AdminButton>
        </div>
      </AdminCard>

      {message ? (
        <p className="text-sm text-gray-700 mb-3 whitespace-pre-wrap">{message}</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 mb-2">
        <p className="text-sm text-gray-500 mr-auto">
          목록 {landmarks.length}건 / 전체 {total}건 · 선택 {selected.size}건
          {hasMore ? " · 스크롤 시 더 불러옴" : ""}
        </p>
        <AdminButton
          type="button"
          onClick={() => void handleBulkVisibility(true)}
          disabled={bulkLoading || selected.size === 0}
        >
          노출
        </AdminButton>
        <AdminButton
          type="button"
          variant="secondary"
          onClick={() => void handleBulkVisibility(false)}
          disabled={bulkLoading || selected.size === 0}
        >
          미노출
        </AdminButton>
      </div>

      <AdminCard className="overflow-hidden">
        <div ref={scrollRef} className="max-h-[32rem] overflow-auto">
          <AdminTable
            headers={[
              "선택",
              "이름",
              "유형",
              "노출",
              "운영 여부",
              "반경",
              "출처",
              "갱신",
              "관리",
            ]}
          >
            <tr className="border-b border-gray-50 bg-gray-50/40">
              <td className="px-4 py-2">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="현재 목록 전체 선택"
                />
              </td>
              <td colSpan={8} className="px-4 py-2 text-xs text-gray-500">
                현재 목록 전체 선택
              </td>
            </tr>
            {landmarks.map((row) => (
              <tr
                key={row.id}
                className="border-b border-gray-50 hover:bg-gray-50/50"
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(row.id)}
                    onChange={() => toggleOne(row.id)}
                    aria-label={`${row.name} 선택`}
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{row.name}</div>
                  <div className="text-xs text-gray-500 truncate max-w-[220px]">
                    {row.address ?? "-"}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {row.tourContentTypeId
                    ? (TOUR_CONTENT_TYPE_LABELS[row.tourContentTypeId] ??
                      row.tourContentTypeId)
                    : "-"}
                </td>
                <td className="px-4 py-3">
                  {row.mapVisible ? "노출" : "미노출"}
                </td>
                <td className="px-4 py-3">
                  {row.isClosed ? "미운영" : "운영"}
                </td>
                <td className="px-4 py-3">{row.radiusMeters}m</td>
                <td className="px-4 py-3">
                  {row.source === "tourapi" ? "TourAPI" : "수동"}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {formatActivityDate(row.updatedAt)}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/landmarks/${row.id}`}
                    className="text-sm font-semibold text-blue-600"
                  >
                    상세
                  </Link>
                </td>
              </tr>
            ))}
          </AdminTable>
          {landmarks.length === 0 && !loading ? (
            <p className="text-sm text-gray-500 text-center py-8">
              등록된 랜드마크가 없습니다. TourAPI에서 가져와 주세요.
            </p>
          ) : null}
          {loadingMore ? (
            <p className="text-sm text-gray-500 text-center py-3">
              더 불러오는 중...
            </p>
          ) : null}
          {!hasMore && landmarks.length > 0 ? (
            <p className="text-xs text-gray-400 text-center py-3">목록 끝</p>
          ) : null}
        </div>
      </AdminCard>
    </div>
  );
}
