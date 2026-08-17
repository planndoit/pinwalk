"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  AdminButton,
  AdminCard,
  AdminPageHeader,
  AdminSelect,
  AdminTextarea,
  StatusBadge,
} from "@/components/admin/AdminUi";
import { formatActivityDate } from "@/lib/formatDate";
import { INQUIRY_REPLY_MAX_LENGTH, type InquiryStatus } from "@/lib/constants";
import { useSubmitLock } from "@/lib/useSubmitLock";
import type { SerializedInquiry } from "@/types/inquiry";

export default function AdminInquiryDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [inquiry, setInquiry] = useState<SerializedInquiry | null>(null);
  const [status, setStatus] = useState<InquiryStatus>("pending");
  const [adminReply, setAdminReply] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const { locked: saving, run } = useSubmitLock();

  const fetchDetail = useCallback(async () => {
    const res = await fetch(`/api/admin/inquiries/${id}`);
    if (res.ok) {
      const data = await res.json();
      const next = data.inquiry as SerializedInquiry;
      setInquiry(next);
      setStatus(next.status);
      setAdminReply(next.adminReply ?? "");
    }
  }, [id]);

  useEffect(() => {
    queueMicrotask(() => {
      void fetchDetail();
    });
  }, [fetchDetail]);

  const handleSave = () => {
    void run(async () => {
      setMessage(null);
      const res = await fetch(`/api/admin/inquiries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, adminReply }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "저장에 실패했습니다.");
        return "release";
      }
      const next = data.inquiry as SerializedInquiry;
      setInquiry(next);
      setStatus(next.status);
      setAdminReply(next.adminReply ?? "");
      setMessage("저장했습니다.");
      return "release";
    });
  };

  if (!inquiry) {
    return (
      <div>
        <AdminPageHeader title="문의 상세" backHref="/admin/inquiries" />
        <p className="text-sm text-gray-500">불러오는 중...</p>
      </div>
    );
  }

  return (
    <div>
      <AdminPageHeader title="문의 상세" backHref="/admin/inquiries" />

      {message ? (
        <p className="mb-4 text-sm text-gray-700">{message}</p>
      ) : null}

      <AdminCard className="p-5 mb-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">{inquiry.title}</h2>
          <StatusBadge status={inquiry.status} />
        </div>
        <p className="text-sm text-gray-600">
          {inquiry.nickname ?? "-"}
          {inquiry.username ? ` (${inquiry.username})` : ""}
          {" · "}
          <Link
            href={`/admin/members/${inquiry.userId}`}
            className="text-blue-600"
          >
            회원 상세
          </Link>
        </p>
        <p className="text-xs text-gray-400">
          접수 {formatActivityDate(inquiry.createdAt)}
          {inquiry.repliedAt
            ? ` · 답변 ${formatActivityDate(inquiry.repliedAt)}`
            : ""}
        </p>
        <p className="text-sm text-gray-800 whitespace-pre-wrap pt-2 border-t border-gray-100">
          {inquiry.content}
        </p>
      </AdminCard>

      <AdminCard className="p-5 space-y-4">
        <AdminSelect
          label="상태"
          value={status}
          onChange={(e) => setStatus(e.target.value as InquiryStatus)}
        >
          <option value="pending">대기</option>
          <option value="answered">답변완료</option>
          <option value="closed">종료</option>
        </AdminSelect>
        <AdminTextarea
          label="답변"
          rows={6}
          maxLength={INQUIRY_REPLY_MAX_LENGTH}
          value={adminReply}
          onChange={(e) => setAdminReply(e.target.value)}
        />
        <AdminButton
          type="button"
          disabled={saving}
          onClick={() => void handleSave()}
        >
          {saving ? "저장 중..." : "저장"}
        </AdminButton>
      </AdminCard>
    </div>
  );
}
