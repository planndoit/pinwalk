"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  AdminButton,
  AdminCard,
  AdminInput,
  AdminPageHeader,
  AdminTable,
  StatusBadge,
} from "@/components/admin/AdminUi";
import { formatActivityDate } from "@/lib/formatDate";

const STATUS_OPTIONS = [
  { value: "pending", label: "대기" },
  { value: "processing", label: "처리중" },
  { value: "completed", label: "완료" },
  { value: "rejected", label: "반려" },
] as const;

interface RequestRow {
  id: string;
  storeName: string;
  categoryName: string | null;
  contactName: string | null;
  status: string;
  createdAt: string;
}

interface SearchFilters {
  q: string;
  categories: string[];
  statuses: string[];
}

function toggleValue(list: string[], value: string): string[] {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}

const EMPTY_FILTERS: SearchFilters = {
  q: "",
  categories: [],
  statuses: [],
};

export default function AdminPromotionRequestsPage() {
  const [draft, setDraft] = useState<SearchFilters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<SearchFilters>(EMPTY_FILTERS);
  const [categories, setCategories] = useState<{ code: string; name: string }[]>(
    []
  );
  const [requests, setRequests] = useState<RequestRow[]>([]);

  const fetchRequests = useCallback(async (filters: SearchFilters) => {
    const params = new URLSearchParams();
    if (filters.q.trim()) params.set("q", filters.q.trim());
    if (filters.categories.length > 0) {
      params.set("category", filters.categories.join(","));
    }
    if (filters.statuses.length > 0) {
      params.set("status", filters.statuses.join(","));
    }
    const res = await fetch(`/api/admin/promotion-requests?${params}`);
    if (res.ok) {
      const data = await res.json();
      setRequests(data.requests ?? []);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void (async () => {
        const res = await fetch("/api/common-codes?group=PREMIUM_CATEGORY");
        if (res.ok) {
          const data = await res.json();
          setCategories(data.codes ?? []);
        }
      })();
      void fetchRequests(EMPTY_FILTERS);
    });
  }, [fetchRequests]);

  const handleSearch = () => {
    setApplied(draft);
    void fetchRequests(draft);
  };

  const handleReset = () => {
    setDraft(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
    void fetchRequests(EMPTY_FILTERS);
  };

  return (
    <div>
      <AdminPageHeader title="프리미엄 홍보 요청 관리" />

      <AdminCard className="p-4 mb-4 space-y-4">
        <AdminInput
          label="가게명 / 담당자명 검색"
          value={draft.q}
          onChange={(e) => setDraft({ ...draft, q: e.target.value })}
          placeholder="가게명 또는 담당자명"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSearch();
            }
          }}
        />

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">카테고리</p>
          <div className="flex flex-wrap gap-3">
            {categories.map((c) => (
              <label
                key={c.code}
                className="inline-flex items-center gap-1.5 text-sm text-gray-700"
              >
                <input
                  type="checkbox"
                  checked={draft.categories.includes(c.code)}
                  onChange={() =>
                    setDraft({
                      ...draft,
                      categories: toggleValue(draft.categories, c.code),
                    })
                  }
                />
                {c.name}
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">상태</p>
          <div className="flex flex-wrap gap-3">
            {STATUS_OPTIONS.map((s) => (
              <label
                key={s.value}
                className="inline-flex items-center gap-1.5 text-sm text-gray-700"
              >
                <input
                  type="checkbox"
                  checked={draft.statuses.includes(s.value)}
                  onChange={() =>
                    setDraft({
                      ...draft,
                      statuses: toggleValue(draft.statuses, s.value),
                    })
                  }
                />
                {s.label}
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <AdminButton type="button" onClick={handleSearch}>
            검색
          </AdminButton>
          <AdminButton type="button" variant="secondary" onClick={handleReset}>
            검색조건 초기화
          </AdminButton>
        </div>
      </AdminCard>

      <AdminCard>
        <AdminTable headers={["가게명", "카테고리", "담당자", "상태", "요청일", ""]}>
          {requests.map((r) => (
            <tr
              key={r.id}
              className="border-b border-gray-50 hover:bg-gray-50/50"
            >
              <td className="px-4 py-3 font-medium">{r.storeName}</td>
              <td className="px-4 py-3">{r.categoryName ?? ""}</td>
              <td className="px-4 py-3">{r.contactName ?? ""}</td>
              <td className="px-4 py-3">
                <StatusBadge status={r.status} />
              </td>
              <td className="px-4 py-3 text-gray-500">
                {formatActivityDate(r.createdAt)}
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/admin/promotion-requests/${r.id}`}
                  className="text-blue-600 text-sm font-medium"
                >
                  상세
                </Link>
              </td>
            </tr>
          ))}
        </AdminTable>
        {requests.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-8">
            {applied.q ||
            applied.categories.length > 0 ||
            applied.statuses.length > 0
              ? "검색 결과가 없습니다."
              : "요청이 없습니다."}
          </p>
        )}
      </AdminCard>
    </div>
  );
}
