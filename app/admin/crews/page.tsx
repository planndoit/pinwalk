"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  AdminCard,
  AdminInput,
  AdminPageHeader,
  AdminTable,
} from "@/components/admin/AdminUi";
import type { SerializedCrew } from "@/types/crew";

export default function AdminCrewsPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"active" | "dissolved" | "all">("active");
  const [crews, setCrews] = useState<SerializedCrew[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCrews = useCallback(
    async (query = q, statusFilter = status) => {
      setLoading(true);
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (statusFilter !== "all") params.set("status", statusFilter);
      else params.set("status", "");
      const res = await fetch(`/api/admin/crews?${params}`);
      if (res.ok) {
        const data = await res.json();
        setCrews(data.crews ?? []);
      }
      setLoading(false);
    },
    [q, status]
  );

  useEffect(() => {
    queueMicrotask(() => {
      void fetchCrews("", "active");
    });
  }, [fetchCrews]);

  return (
    <div>
      <AdminPageHeader
        title="크루 관리"
        description="크루 목록을 검색하고 상세·강제 해산을 처리합니다."
      />
      <AdminCard className="p-4 mb-4">
        <form
          className="flex flex-wrap gap-2 items-end"
          onSubmit={(e) => {
            e.preventDefault();
            void fetchCrews(q, status);
          }}
        >
          <div className="flex-1 min-w-[160px]">
            <AdminInput
              label="검색"
              placeholder="크루명"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <label className="text-sm">
            <span className="block text-gray-600 mb-1">상태</span>
            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as "active" | "dissolved" | "all")
              }
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
            >
              <option value="active">활성</option>
              <option value="dissolved">해산</option>
              <option value="all">전체</option>
            </select>
          </label>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium"
          >
            검색
          </button>
        </form>
      </AdminCard>
      <AdminCard>
        <AdminTable
          headers={["이름", "지역", "인원", "리더", "상태", ""]}
        >
          {crews.map((crew) => (
            <tr
              key={crew.id}
              className="border-b border-gray-50 hover:bg-gray-50/50"
            >
              <td className="px-4 py-3 font-medium">{crew.name}</td>
              <td className="px-4 py-3 text-gray-600">{crew.areaLabel}</td>
              <td className="px-4 py-3">
                {crew.memberCount}/{crew.maxMembers}
              </td>
              <td className="px-4 py-3 text-gray-600">
                {crew.leaderNickname ?? "-"}
              </td>
              <td className="px-4 py-3">
                {crew.status === "active" ? "활성" : "해산"}
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/admin/crews/${crew.id}`}
                  className="text-blue-600 text-sm font-medium"
                >
                  상세
                </Link>
              </td>
            </tr>
          ))}
        </AdminTable>
        {!loading && crews.length === 0 && (
          <p className="p-6 text-center text-sm text-gray-500">
            크루가 없습니다.
          </p>
        )}
      </AdminCard>
    </div>
  );
}
