"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import MySubpageHeader from "@/components/my/MySubpageHeader";
import { formatActivityDate } from "@/lib/formatDate";
import type { SerializedInquiry } from "@/types/inquiry";

const STATUS_LABEL: Record<SerializedInquiry["status"], string> = {
  pending: "대기",
  answered: "답변완료",
  closed: "종료",
};

export default function InquiryDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { user, loading: authLoading, openAuthModal } = useAuth();
  const [inquiry, setInquiry] = useState<SerializedInquiry | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchInquiry = useCallback(async () => {
    const res = await fetch(`/api/inquiries/${id}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "문의를 불러오지 못했습니다.");
      return;
    }
    setInquiry(data.inquiry);
  }, [id]);

  useEffect(() => {
    if (authLoading || user) return;
    router.replace("/");
    openAuthModal("login");
  }, [authLoading, user, router, openAuthModal]);

  useEffect(() => {
    if (!user) return;
    queueMicrotask(() => {
      void fetchInquiry();
    });
  }, [user, fetchInquiry]);

  if (!user) return null;

  return (
    <div className="h-dvh overflow-y-auto bg-gray-50 pb-safe">
      <div className="max-w-lg mx-auto px-4 py-6">
        <MySubpageHeader title="문의 상세" />

        {error ? (
          <p className="text-sm text-red-500">{error}</p>
        ) : !inquiry ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-white rounded-2xl border border-gray-100 px-4 py-4">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-base font-extrabold text-gray-900">
                  {inquiry.title}
                </h2>
                <span className="text-[11px] font-semibold text-gray-500 shrink-0">
                  {STATUS_LABEL[inquiry.status]}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1.5">
                {formatActivityDate(inquiry.createdAt)}
              </p>
              <p className="text-sm text-gray-800 mt-3 whitespace-pre-wrap">
                {inquiry.content}
              </p>
            </div>

            {inquiry.adminReply ? (
              <div className="bg-blue-50 rounded-2xl border border-blue-100 px-4 py-4">
                <p className="text-xs font-bold text-blue-700">관리자 답변</p>
                {inquiry.repliedAt ? (
                  <p className="text-xs text-blue-400 mt-1">
                    {formatActivityDate(inquiry.repliedAt)}
                  </p>
                ) : null}
                <p className="text-sm text-gray-800 mt-2 whitespace-pre-wrap">
                  {inquiry.adminReply}
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-400 px-1">아직 답변이 없습니다.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
