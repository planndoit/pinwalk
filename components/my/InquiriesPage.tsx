"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import MySubpageHeader from "@/components/my/MySubpageHeader";
import { formatActivityDate } from "@/lib/formatDate";
import type { SerializedInquiry } from "@/types/inquiry";

const STATUS_LABEL: Record<SerializedInquiry["status"], string> = {
  pending: "대기",
  answered: "답변완료",
  closed: "종료",
};

export default function InquiriesPage() {
  const { user, loading: authLoading, openAuthModal } = useAuth();
  const router = useRouter();
  const [inquiries, setInquiries] = useState<SerializedInquiry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInquiries = useCallback(async () => {
    const res = await fetch("/api/inquiries");
    if (res.ok) {
      const data = await res.json();
      setInquiries(data.inquiries ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authLoading || user) return;
    router.replace("/");
    openAuthModal("login");
  }, [authLoading, user, router, openAuthModal]);

  useEffect(() => {
    if (!user) return;
    queueMicrotask(() => {
      void fetchInquiries();
    });
  }, [user, fetchInquiries]);

  if (!user) return null;

  return (
    <div className="h-dvh overflow-y-auto bg-gray-50 pb-safe">
      <div className="max-w-lg mx-auto px-4 pt-page pb-6">
        <MySubpageHeader
          title="문의하기"
          action={
            <Link
              href="/my/inquiries/new"
              className="shrink-0 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold"
            >
              새 문의
            </Link>
          }
        />

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : inquiries.length === 0 ? (
          <p className="text-center text-sm text-gray-500 py-12">
            등록한 문의가 없습니다.
          </p>
        ) : (
          <div className="space-y-2">
            {inquiries.map((inquiry) => (
              <Link
                key={inquiry.id}
                href={`/my/inquiries/${inquiry.id}`}
                className="block bg-white border border-gray-100 rounded-2xl px-4 py-3.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-bold text-gray-900">{inquiry.title}</p>
                  <span className="text-[11px] font-semibold text-gray-500 shrink-0">
                    {STATUS_LABEL[inquiry.status]}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1.5">
                  {formatActivityDate(inquiry.createdAt)}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
