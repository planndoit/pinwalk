"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  AdminCard,
  AdminInput,
  AdminPageHeader,
  AdminTable,
  StatusBadge,
} from "@/components/admin/AdminUi";
import { formatActivityDate } from "@/lib/formatDate";
import type { InquiryStatus } from "@/lib/constants";
import type { SerializedInquiry } from "@/types/inquiry";

const STATUS_OPTIONS: { value: InquiryStatus | "all"; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "pending", label: "대기" },
  { value: "answered", label: "답변완료" },
  { value: "closed", label: "종료" },
];

export default function AdminInquiriesPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<InquiryStatus | "all">("all");
  const [inquiries, setInquiries] = useState<SerializedInquiry[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchInquiries = useCallback(
    async (query = q, statusFilter = status) => {
      setLoading(true);
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/admin/inquiries?${params}`);
      if (res.ok) {
        const data = await res.json();
        setInquiries(data.inquiries ?? []);
      }
      setLoading(false);
    },
    [q, status]
  );

  useEffect(() => {
    queueMicrotask(() => {
      void fetchInquiries("", "all");
    });
  }, [fetchInquiries]);

  return (
    <div>
      <AdminPageHeader
        title="문의 관리"
        description="회원 문의를 확인하고 답변합니다."
      />
      <AdminCard className="p-4 mb-4">
        <form
          className="flex flex-wrap gap-2 items-end"
          onSubmit={(e) => {
            e.preventDefault();
            void fetchInquiries(q, status);
          }}
        >
          <div className="flex-1 min-w-[160px]">
            <AdminInput
              label="검색"
              placeholder="제목, 닉네임, 아이디"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <label className="text-sm">
            <span className="block text-gray-600 mb-1">상태</span>
            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as InquiryStatus | "all")
              }
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
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
        <AdminTable headers={["제목", "회원", "상태", "접수일", ""]}>
          {inquiries.map((inquiry) => (
            <tr
              key={inquiry.id}
              className="border-b border-gray-50 hover:bg-gray-50/50"
            >
              <td className="px-4 py-3 font-medium">{inquiry.title}</td>
              <td className="px-4 py-3 text-gray-600">
                {inquiry.nickname ?? "-"}
                {inquiry.username ? (
                  <span className="text-gray-400"> ({inquiry.username})</span>
                ) : null}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={inquiry.status} />
              </td>
              <td className="px-4 py-3 text-gray-500">
                {formatActivityDate(inquiry.createdAt)}
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/admin/inquiries/${inquiry.id}`}
                  className="text-blue-600 text-sm font-medium"
                >
                  상세
                </Link>
              </td>
            </tr>
          ))}
        </AdminTable>
        {!loading && inquiries.length === 0 && (
          <p className="p-6 text-center text-sm text-gray-500">
            문의가 없습니다.
          </p>
        )}
      </AdminCard>
    </div>
  );
}
