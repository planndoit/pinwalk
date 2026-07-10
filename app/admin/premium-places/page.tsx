"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  AdminButton,
  AdminCard,
  AdminInput,
  AdminPageHeader,
  AdminSelect,
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

export default function AdminPremiumPlacesPage() {
  const [q, setQ] = useState("");
  const [active, setActive] = useState("");
  const [places, setPlaces] = useState<PlaceRow[]>([]);
  const [categories, setCategories] = useState<{ code: string; name: string }[]>([]);

  const fetchPlaces = useCallback(async () => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (active) params.set("active", active);
    const res = await fetch(`/api/admin/premium-places?${params}`);
    if (res.ok) {
      const data = await res.json();
      setPlaces(data.places ?? []);
    }
  }, [q, active]);

  useEffect(() => {
    queueMicrotask(() => {
      void (async () => {
        const res = await fetch("/api/common-codes?group=PREMIUM_CATEGORY");
        if (res.ok) {
          const data = await res.json();
          setCategories(data.codes ?? []);
        }
      })();
      void fetchPlaces();
    });
  }, [fetchPlaces]);

  return (
    <div>
      <AdminPageHeader
        title="프리미엄 장소 관리"
        action={
          <Link href="/admin/premium-places/new">
            <AdminButton>추가</AdminButton>
          </Link>
        }
      />
      <AdminCard className="p-4 mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <AdminInput label="가게명 검색" value={q} onChange={(e) => setQ(e.target.value)} />
        <AdminSelect label="활성화" value={active} onChange={(e) => setActive(e.target.value)}>
          <option value="">전체</option>
          <option value="true">활성</option>
          <option value="false">비활성</option>
        </AdminSelect>
        <div className="self-end">
          <AdminButton onClick={fetchPlaces}>검색</AdminButton>
        </div>
      </AdminCard>
      <AdminCard>
        <AdminTable headers={["가게명", "카테고리", "활성화", "등록일", ""]}>
          {places.map((p) => (
            <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50">
              <td className="px-4 py-3 font-medium">{p.storeName}</td>
              <td className="px-4 py-3">
                {categories.find((c) => c.code === p.categoryCode)?.name ?? p.categoryCode}
              </td>
              <td className="px-4 py-3">{p.isActive ? "활성" : "비활성"}</td>
              <td className="px-4 py-3 text-gray-500">{formatActivityDate(p.createdAt)}</td>
              <td className="px-4 py-3 text-right">
                <Link href={`/admin/premium-places/${p.id}`} className="text-blue-600 text-sm font-medium">
                  상세
                </Link>
              </td>
            </tr>
          ))}
        </AdminTable>
      </AdminCard>
    </div>
  );
}
