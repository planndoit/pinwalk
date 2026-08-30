"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import MySubpageHeader from "@/components/my/MySubpageHeader";
import {
  INQUIRY_CONTENT_MAX_LENGTH,
  INQUIRY_TITLE_MAX_LENGTH,
} from "@/lib/constants";
import { useSubmitLock } from "@/lib/useSubmitLock";

export default function InquiryNewPage() {
  const router = useRouter();
  const { user, loading: authLoading, openAuthModal } = useAuth();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { locked: submitting, run } = useSubmitLock();

  useEffect(() => {
    if (authLoading || user) return;
    router.replace("/");
    openAuthModal("login");
  }, [authLoading, user, router, openAuthModal]);

  const handleSubmit = () => {
    void run(async () => {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "문의 등록에 실패했습니다.");
        return "release";
      }
      router.replace(`/my/inquiries/${data.inquiry.id}`);
      return "keep";
    });
  };

  if (!user) return null;

  return (
    <div className="h-dvh overflow-y-auto bg-gray-50 pb-safe">
      <div className="max-w-lg mx-auto px-4 pt-page pb-6">
        <MySubpageHeader title="새 문의" />

        <label className="block text-sm">
          <span className="text-gray-700 font-medium">제목</span>
          <input
            value={title}
            maxLength={INQUIRY_TITLE_MAX_LENGTH}
            onChange={(e) => setTitle(e.target.value)}
            disabled={submitting}
            className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white disabled:opacity-60"
            placeholder="제목을 입력하세요"
          />
        </label>

        <label className="block text-sm mt-4">
          <span className="text-gray-700 font-medium">내용</span>
          <textarea
            value={content}
            maxLength={INQUIRY_CONTENT_MAX_LENGTH}
            rows={8}
            onChange={(e) => setContent(e.target.value)}
            disabled={submitting}
            className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white resize-none disabled:opacity-60"
            placeholder="문의 내용을 입력하세요"
          />
          <span className="mt-1 block text-right text-[11px] text-gray-400 tabular-nums">
            {content.length}/{INQUIRY_CONTENT_MAX_LENGTH}
          </span>
        </label>

        {error ? <p className="mt-3 text-sm text-red-500">{error}</p> : null}

        <button
          type="button"
          disabled={submitting || !title.trim() || !content.trim()}
          onClick={handleSubmit}
          className="mt-4 w-full py-3.5 rounded-2xl bg-blue-600 text-white text-sm font-bold disabled:opacity-40"
        >
          {submitting ? "등록 중..." : "문의 등록"}
        </button>
      </div>
    </div>
  );
}
