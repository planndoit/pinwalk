"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  AdminButton,
  AdminCard,
  AdminInput,
  AdminPageHeader,
  AdminTable,
} from "@/components/admin/AdminUi";
import { formatActivityDate } from "@/lib/formatDate";

interface PlaceRow {
  id: string;
  storeName: string;
  categoryCode: string;
  isActive: boolean;
  createdAt: string;
}

interface SearchFilters {
  q: string;
  categories: string[];
  active: string[];
}

function toggleValue(list: string[], value: string): string[] {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}

const EMPTY_FILTERS: SearchFilters = {
  q: "",
  categories: [],
  active: [],
};

export default function AdminPremiumPlacesPage() {
  const [draft, setDraft] = useState<SearchFilters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<SearchFilters>(EMPTY_FILTERS);
  const [places, setPlaces] = useState<PlaceRow[]>([]);
  const [categories, setCategories] = useState<{ code: string; name: string }[]>(
    []
  );

  const fetchPlaces = useCallback(async (filters: SearchFilters) => {
    const params = new URLSearchParams();
    if (filters.q.trim()) params.set("q", filters.q.trim());
    if (filters.categories.length > 0) {
      params.set("category", filters.categories.join(","));
    }
    if (filters.active.length > 0) {
      params.set("active", filters.active.join(","));
    }
    const res = await fetch(`/api/admin/premium-places?${params}`);
    if (res.ok) {
      const data = await res.json();
      setPlaces(data.places ?? []);
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
      void fetchPlaces(EMPTY_FILTERS);
    });
  }, [fetchPlaces]);

  const handleSearch = () => {
    setApplied(draft);
    void fetchPlaces(draft);
  };

  const handleReset = () => {
    setDraft(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
    void fetchPlaces(EMPTY_FILTERS);
  };

  return (
    <div>
      <AdminPageHeader title="프리미엄 장소 관리" />

      <AdminCard className="p-4 mb-4 space-y-4">
        <AdminInput
          label="가게명 검색"
          value={draft.q}
          onChange={(e) => setDraft({ ...draft, q: e.target.value })}
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
          <p className="text-sm font-medium text-gray-700 mb-2">활성화</p>
          <div className="flex flex-wrap gap-3">
            <label className="inline-flex items-center gap-1.5 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={draft.active.includes("true")}
                onChange={() =>
                  setDraft({
                    ...draft,
                    active: toggleValue(draft.active, "true"),
                  })
                }
              />
              활성
            </label>
            <label className="inline-flex items-center gap-1.5 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={draft.active.includes("false")}
                onChange={() =>
                  setDraft({
                    ...draft,
                    active: toggleValue(draft.active, "false"),
                  })
                }
              />
              비활성
            </label>
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
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-900">장소 목록</p>
          <Link href="/admin/premium-places/new">
            <AdminButton>추가</AdminButton>
          </Link>
        </div>
        <AdminTable headers={["가게명", "카테고리", "활성화", "등록일", ""]}>
          {places.map((p) => (
            <tr
              key={p.id}
              className="border-b border-gray-50 hover:bg-gray-50/50"
            >
              <td className="px-4 py-3 font-medium">{p.storeName}</td>
              <td className="px-4 py-3">
                {categories.find((c) => c.code === p.categoryCode)?.name ??
                  p.categoryCode}
              </td>
              <td className="px-4 py-3">{p.isActive ? "활성" : "비활성"}</td>
              <td className="px-4 py-3 text-gray-500">
                {formatActivityDate(p.createdAt)}
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/admin/premium-places/${p.id}`}
                  className="text-blue-600 text-sm font-medium"
                >
                  상세
                </Link>
              </td>
            </tr>
          ))}
        </AdminTable>
        {places.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-8">
            {applied.q ||
            applied.categories.length > 0 ||
            applied.active.length > 0
              ? "검색 결과가 없습니다."
              : "등록된 장소가 없습니다."}
          </p>
        )}
      </AdminCard>
    </div>
  );
}
