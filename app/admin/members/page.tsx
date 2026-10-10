"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
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

function visiblePages(current: number, totalPages: number): Array<number | "gap"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const start = Math.max(2, current - 2);
  const end = Math.min(totalPages - 1, current + 2);
  const pages: Array<number | "gap"> = [1];
  if (start > 2) pages.push("gap");
  for (let pageNo = start; pageNo <= end; pageNo += 1) pages.push(pageNo);
  if (end < totalPages - 1) pages.push("gap");
  pages.push(totalPages);
  return pages;
}

export default function AdminMembersPage() {
  const [q, setQ] = useState("");
  const [appliedQ, setAppliedQ] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);
  const [loadedPage, setLoadedPage] = useState(1);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [settled, setSettled] = useState(false);
  const requestId = useRef(0);

  const fetchMembers = useCallback(async (query: string, pageNo: number) => {
    const id = requestId.current + 1;
    requestId.current = id;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      params.set("page", String(pageNo));
      const res = await fetch(`/api/admin/members?${params}`);
      if (id !== requestId.current) return;
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members ?? []);
        setTotal(typeof data.total === "number" ? data.total : 0);
        setLoadedPage(typeof data.page === "number" && data.page >= 1 ? data.page : pageNo);
        if (typeof data.limit === "number" && data.limit > 0) {
          setLimit(data.limit);
        }
      }
    } finally {
      if (id === requestId.current) {
        setLoading(false);
        setSettled(true);
      }
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void fetchMembers(appliedQ, page);
    });
  }, [appliedQ, page, fetchMembers]);

  const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;
  const rangeStart = total === 0 ? 0 : (loadedPage - 1) * limit + 1;
  const rangeEnd = Math.min(loadedPage * limit, total);

  const goToPage = (nextPage: number) => {
    if (loading || nextPage < 1 || nextPage > totalPages || nextPage === page) return;
    setPage(nextPage);
  };

  return (
    <div>
      <AdminPageHeader title="회원관리" description="회원 목록을 검색하고 상세를 확인합니다." />
      <AdminCard className="p-4 mb-4">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const nextQuery = q.trim();
            if (nextQuery === appliedQ && page === 1) {
              void fetchMembers(nextQuery, 1);
              return;
            }
            setAppliedQ(nextQuery);
            setPage(1);
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
        {settled && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              {total === 0
                ? "전체 0명"
                : `전체 ${total.toLocaleString()}명 중 ${rangeStart.toLocaleString()}–${rangeEnd.toLocaleString()}명`}
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => goToPage(page - 1)}
                  disabled={loading || page <= 1}
                  className="px-3 h-8 rounded-lg text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  이전
                </button>
                {visiblePages(page, totalPages).map((item, index) =>
                  item === "gap" ? (
                    <span key={`gap-${index}`} className="px-1 text-sm text-gray-400">
                      …
                    </span>
                  ) : (
                    <button
                      key={item}
                      type="button"
                      onClick={() => goToPage(item)}
                      disabled={loading}
                      aria-current={item === page ? "page" : undefined}
                      className={`min-w-8 h-8 px-2 rounded-lg text-sm disabled:opacity-40 ${
                        item === page
                          ? "bg-blue-600 text-white font-medium"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      {item}
                    </button>
                  )
                )}
                <button
                  type="button"
                  onClick={() => goToPage(page + 1)}
                  disabled={loading || page >= totalPages}
                  className="px-3 h-8 rounded-lg text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  다음
                </button>
              </div>
            )}
          </div>
        )}
      </AdminCard>
    </div>
  );
}
