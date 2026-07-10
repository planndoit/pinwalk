"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  AdminCard,
  AdminInput,
  AdminPageHeader,
  AdminTable,
} from "@/components/admin/AdminUi";
import { formatActivityDate } from "@/lib/formatDate";

interface MemberRow {
  id: string;
  username: string | null;
  nickname: string;
  points: number;
  createdAt: string;
  lastSeenAt: string | null;
}

export default function AdminMembersPage() {
  const [q, setQ] = useState("");
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMembers = useCallback(async (query = q) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    const res = await fetch(`/api/admin/members?${params}`);
    if (res.ok) {
      const data = await res.json();
      setMembers(data.members ?? []);
    }
    setLoading(false);
  }, [q]);

  useEffect(() => {
    queueMicrotask(() => {
      void fetchMembers("");
    });
  }, [fetchMembers]);

  return (
    <div>
      <AdminPageHeader title="회원관리" description="회원 목록을 검색하고 상세를 확인합니다." />
      <AdminCard className="p-4 mb-4">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void fetchMembers(q);
          }}
        >
          <div className="flex-1">
            <AdminInput
              label="검색"
              placeholder="아이디 또는 닉네임"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="self-end">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium"
            >
              검색
            </button>
          </div>
        </form>
      </AdminCard>
      <AdminCard>
        <AdminTable headers={["닉네임", "아이디", "포인트", "가입일", "마지막 접속", ""]}>
          {members.map((m) => (
            <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50/50">
              <td className="px-4 py-3 font-medium">{m.nickname}</td>
              <td className="px-4 py-3 text-gray-600">{m.username ?? "-"}</td>
              <td className="px-4 py-3">{m.points.toLocaleString()}P</td>
              <td className="px-4 py-3 text-gray-500">{formatActivityDate(m.createdAt)}</td>
              <td className="px-4 py-3 text-gray-500">
                {m.lastSeenAt ? formatActivityDate(m.lastSeenAt) : "-"}
              </td>
              <td className="px-4 py-3 text-right">
                <Link href={`/admin/members/${m.id}`} className="text-blue-600 text-sm font-medium">
                  상세
                </Link>
              </td>
            </tr>
          ))}
        </AdminTable>
        {!loading && members.length === 0 && (
          <p className="p-6 text-center text-sm text-gray-500">회원이 없습니다.</p>
        )}
      </AdminCard>
    </div>
  );
}
