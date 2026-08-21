"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import MySubpageHeader from "@/components/my/MySubpageHeader";
import { useSubmitLock } from "@/lib/useSubmitLock";

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading: authLoading, logout, openAuthModal } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { locked: withdrawing, run } = useSubmitLock();

  useEffect(() => {
    if (authLoading || user) return;
    router.replace("/");
    openAuthModal("login");
  }, [authLoading, user, router, openAuthModal]);

  const handleWithdraw = () => {
    void run(async () => {
      const res = await fetch("/api/auth/withdraw", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "회원 탈퇴에 실패했습니다.");
        setConfirming(false);
        return "release";
      }
      await logout();
      router.replace("/");
      return "keep";
    });
  };

  if (!user) return null;

  return (
    <div className="h-dvh overflow-y-auto bg-gray-50 pb-safe">
      <div className="max-w-lg mx-auto px-4 py-6 min-h-full flex flex-col">
        <MySubpageHeader title="설정" />

        <section>
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

        <section className="mt-6">
          <h2 className="text-sm font-bold text-gray-800 mb-3">알림</h2>
          <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-100">
            <Link
              href="/my/notifications"
              className="flex items-center justify-between px-4 py-3.5"
            >
              <span className="text-sm text-gray-800">알림함</span>
              <span className="text-xs text-gray-400">보기</span>
            </Link>
            <Link
              href="/my/settings/notifications"
              className="flex items-center justify-between px-4 py-3.5"
            >
              <span className="text-sm text-gray-800">알림 설정</span>
              <span className="text-xs text-gray-400">보기</span>
            </Link>
          </div>
        </section>

        <section className="mt-6">
          <div className="bg-white rounded-2xl border border-gray-100">
            <Link
              href="/my/inquiries"
              className="flex items-center justify-between px-4 py-3.5"
            >
              <span className="text-sm text-gray-800">문의하기</span>
              <span className="text-xs text-gray-400">보기</span>
            </Link>
          </div>
        </section>

        <div className="mt-auto pt-16 pb-6 text-center">
          {error ? (
            <p className="text-sm text-red-500 mb-3">{error}</p>
          ) : null}
          {confirming ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                탈퇴하면 계정과 데이터가 삭제되며 복구할 수 없습니다.
              </p>
              <div className="flex items-center justify-center gap-4">
                <button
                  type="button"
                  disabled={withdrawing}
                  onClick={() => setConfirming(false)}
                  className="text-sm text-gray-400"
                >
                  취소
                </button>
                <button
                  type="button"
                  disabled={withdrawing}
                  onClick={() => void handleWithdraw()}
                  className="text-sm text-red-500"
                >
                  {withdrawing ? "처리 중..." : "탈퇴 확인"}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setError(null);
                setConfirming(true);
              }}
              className="text-sm text-red-500"
            >
              회원탈퇴
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
