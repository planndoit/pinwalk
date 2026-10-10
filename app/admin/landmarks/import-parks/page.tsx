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
  PARK_REGION_OPTIONS,
  PARK_TYPE_AREA_STATS_DATE,
  PARK_TYPE_OPTIONS,
} from "@/lib/constants";
import type { ParkLandmarkCandidate } from "@/types/landmark";

interface ParkFilters {
  region: string;
  provider: string;
  name: string;
  parkType: string;
}

const PAGE_SIZE = 50;

function buildSearchParams(filters: ParkFilters, pageNo: number) {
  const params = new URLSearchParams({
    limit: String(PAGE_SIZE),
    page: String(pageNo),
  });
  if (filters.region) params.set("region", filters.region);
  if (filters.provider.trim()) params.set("provider", filters.provider.trim());
  if (filters.name.trim()) params.set("name", filters.name.trim());
  if (filters.parkType) params.set("parkType", filters.parkType);
  return params;
}

function formatAreaSqm(value: number | null): string {
  if (value == null) return "-";
  return `${Math.round(value).toLocaleString("ko-KR")}㎡`;
}

function mergeCandidates(
  prev: ParkLandmarkCandidate[],
  next: ParkLandmarkCandidate[]
) {
  const map = new Map(prev.map((c) => [c.key, c]));
  for (const item of next) {
    map.set(item.key, item);
  }
  return [...map.values()];
}

export default function AdminParkImportPage() {
  const [draft, setDraft] = useState<ParkFilters>({
    region: "",
    provider: "",
    name: "",
    parkType: "",
  });
  const [applied, setApplied] = useState<ParkFilters | null>(null);
  const [candidates, setCandidates] = useState<ParkLandmarkCandidate[]>([]);
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

  const handleSearch = async () => {
    const filters = { ...draft };
    setLoading(true);
    setMessage(null);
    selectAllLoadedRef.current = false;
    try {
      const res = await fetch(
        `/api/admin/landmarks/park-search?${buildSearchParams(filters, 1)}`
      );
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "검색에 실패했습니다.");
        setApplied(null);
        setCandidates([]);
        setTotalCount(0);
        setHasMore(false);
        setPage(1);
        return;
      }
      setApplied(filters);
      setCandidates((data.candidates ?? []) as ParkLandmarkCandidate[]);
      setTotalCount(data.totalCount ?? 0);
      setHasMore(data.hasMore === true);
      setPage(1);
      setSelected(new Set());
    } finally {
      setLoading(false);
    }
  };

  const loadMore = useCallback(async () => {
    if (!applied || !hasMore || loadingMoreRef.current || loading) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await fetch(
        `/api/admin/landmarks/park-search?${buildSearchParams(applied, nextPage)}`
      );
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "추가 조회에 실패했습니다.");
        setHasMore(false);
        return;
      }
      const next = (data.candidates ?? []) as ParkLandmarkCandidate[];
      setCandidates((prev) => {
        const merged = mergeCandidates(prev, next);
        if (selectAllLoadedRef.current) {
          setSelected(new Set(merged.map((c) => c.key)));
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
  }, [applied, hasMore, loading, page, totalCount]);

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

  const toggleSelected = (key: string) => {
    selectAllLoadedRef.current = false;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectAllLoaded = () => {
    selectAllLoadedRef.current = true;
    setSelected(new Set(candidates.map((c) => c.key)));
  };

  const clearSelection = () => {
    selectAllLoadedRef.current = false;
    setSelected(new Set());
  };

  const handleImportSelected = async () => {
    const items = candidates.filter((c) => selected.has(c.key));
    if (items.length === 0) {
      setMessage("가져올 항목을 선택해주세요.");
      return;
    }
    setImporting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/landmarks/park-import", {
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
    if (!applied || totalCount <= 0) {
      setMessage("먼저 검색해주세요.");
      return;
    }
    const ok = window.confirm(
      `검색 조건에 맞는 공원 전체(약 ${totalCount}건)를 가져옵니다.\n계속할까요?`
    );
    if (!ok) return;

    setImportingAll(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/landmarks/park-import-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(applied),
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
          data.truncated ? `(페이지 상한으로 일부만 가져옴)` : "",
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
        title="공원 가져오기"
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
        <AdminSelect
          label="지역"
          value={draft.region}
          onChange={(e) => setDraft({ ...draft, region: e.target.value })}
        >
          <option value="">전국</option>
          {PARK_REGION_OPTIONS.map((region) => (
            <option key={region.value} value={region.value}>
              {region.label}
            </option>
          ))}
        </AdminSelect>
        <AdminInput
          label="제공기관명"
          value={draft.provider}
          onChange={(e) => setDraft({ ...draft, provider: e.target.value })}
          placeholder="예: 서울특별시 송파구"
        />
        <AdminInput
          label="공원명"
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          placeholder="예: 올림픽공원"
        />
        <AdminSelect
          label="공원구분"
          value={draft.parkType}
          onChange={(e) => setDraft({ ...draft, parkType: e.target.value })}
        >
          <option value="">전체</option>
          {PARK_TYPE_OPTIONS.map((type) => (
            <option key={type.value} value={type.value}>
              {`${type.value} (평균 ${type.averageAreaSqm.toLocaleString("ko-KR")}㎡)`}
            </option>
          ))}
        </AdminSelect>
        <p className="text-xs text-gray-500">
          제공기관명과 공원명은 정확히 일치해야 검색됩니다. 공원구분은 평균
          면적이 큰 순이며, 평균 면적은 {PARK_TYPE_AREA_STATS_DATE} 전국 데이터
          기준입니다. 지역을 고르면 전국 데이터를 조회해 주소로 거르므로 검색에
          시간이 걸리고, 결과는 면적 큰 순으로 한 번에 표시됩니다.
        </p>

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
          <AdminTable
            headers={["", "이름", "구분", "면적", "주소", "제공기관", "관리번호"]}
          >
            {candidates.map((row) => (
              <tr
                key={row.key}
                className="border-b border-gray-50 hover:bg-gray-50/50"
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(row.key)}
                    onChange={() => toggleSelected(row.key)}
                  />
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">
                  {row.name}
                </td>
                <td className="px-4 py-3">{row.parkType ?? "-"}</td>
                <td className="px-4 py-3 tabular-nums">
                  {formatAreaSqm(row.areaSquareMeters)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 max-w-[240px] truncate">
                  {row.address ?? "-"}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {row.providerName ?? "-"}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {row.manageNo}
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
