"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import GuideModal from "@/components/guide/GuideModal";
import MySubpageHeader from "@/components/my/MySubpageHeader";

export default function SupportPage() {
  const router = useRouter();
  const { requireAuth } = useAuth();
  const [guideOpen, setGuideOpen] = useState(false);
  const closeGuide = useCallback(() => setGuideOpen(false), []);

  return (
    <div className="h-dvh overflow-y-auto bg-gray-50 pb-safe">
      <div className="max-w-lg mx-auto px-4 pt-page pb-6 min-h-full flex flex-col">
        <MySubpageHeader title="고객센터" />

        <section>
          <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-100">
            <Link
              href="/support/notices"
              className="flex items-center justify-between px-4 py-3.5"
            >
              <span className="text-sm text-gray-800">공지사항</span>
              <span className="text-xs text-gray-400">보기</span>
            </Link>
            <button
              type="button"
              onClick={() => setGuideOpen(true)}
              className="w-full flex items-center justify-between px-4 py-3.5 text-left"
            >
              <span className="text-sm text-gray-800">이용 가이드</span>
              <span className="text-xs text-gray-400">보기</span>
            </button>
            <button
              type="button"
              onClick={() => requireAuth(() => router.push("/my/inquiries"))}
              className="w-full flex items-center justify-between px-4 py-3.5 text-left"
            >
              <span className="text-sm text-gray-800">문의하기</span>
              <span className="text-xs text-gray-400">보기</span>
            </button>
          </div>
        </section>

        <section className="mt-6">
          <h2 className="text-sm font-bold text-gray-800 mb-3">약관</h2>
          <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-100">
            <Link
              href="/legal/privacy"
              className="flex items-center justify-between px-4 py-3.5"
            >
              <span className="text-sm text-gray-800">개인정보처리방침</span>
              <span className="text-xs text-gray-400">보기</span>
            </Link>
            <Link
              href="/legal/location-terms"
              className="flex items-center justify-between px-4 py-3.5"
            >
              <span className="text-sm text-gray-800">위치기반서비스 이용약관</span>
              <span className="text-xs text-gray-400">보기</span>
            </Link>
            <Link
              href="/legal/location-consent"
              className="flex items-center justify-between px-4 py-3.5"
            >
              <span className="text-sm text-gray-800">개인위치정보 수집·이용 안내</span>
              <span className="text-xs text-gray-400">보기</span>
            </Link>
          </div>
        </section>
      </div>

      <GuideModal
        open={guideOpen}
        title="이용 가이드"
        scope="full"
        onClose={closeGuide}
      />
    </div>
  );
}
