"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { formatActivityDate } from "@/lib/formatDate";
import type { SerializedUserCoupon } from "@/types/premiumClient";

export default function CouponsPage() {
  const { user, loading: authLoading, openAuthModal } = useAuth();
  const router = useRouter();
  const [coupons, setCoupons] = useState<SerializedUserCoupon[]>([]);
  const [selected, setSelected] = useState<SerializedUserCoupon | null>(null);
  const [confirmUse, setConfirmUse] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchCoupons = useCallback(async () => {
    const res = await fetch("/api/my/coupons");
    if (res.ok) {
      const data = await res.json();
      setCoupons(data.coupons ?? []);
    }
  }, []);

  useEffect(() => {
    if (authLoading || user) return;
    router.replace("/");
    openAuthModal("login");
  }, [authLoading, user, router, openAuthModal]);

  useEffect(() => {
    if (!user) return;
    queueMicrotask(() => {
      void fetchCoupons();
    });
  }, [user, fetchCoupons]);

  const handleUse = async () => {
    if (!selected) return;
    setLoading(true);
    const res = await fetch(`/api/my/coupons/${selected.id}/use`, {
      method: "POST",
    });
    const data = await res.json();
    setMessage(res.ok ? data.message : data.error);
    setConfirmUse(false);
    setSelected(null);
    setLoading(false);
    if (res.ok) void fetchCoupons();
  };

  if (!user) return null;

  return (
    <div className="h-dvh overflow-y-auto bg-gray-50 pb-safe">
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-start gap-2 mb-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="mt-0.5 -ml-1 w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-gray-700 hover:bg-gray-200/70 active:bg-gray-200"
            aria-label="뒤로 가기"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900">쿠폰함</h1>
            <p className="text-sm text-gray-500 mt-0.5">프리미엄 장소에서 획득한 쿠폰입니다.</p>
          </div>
        </div>

        {message && (
          <p className="mb-4 text-sm bg-gray-900 text-white rounded-xl px-4 py-2">{message}</p>
        )}

        <div className="space-y-3">
          {coupons.map((coupon) => (
            <button
              key={coupon.id}
              type="button"
              onClick={() => setSelected(coupon)}
              className="w-full text-left bg-white border border-gray-200 rounded-2xl p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-bold text-gray-900">{coupon.title}</p>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    coupon.status === "available"
                      ? "bg-violet-100 text-violet-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {coupon.status === "available" ? "사용가능" : "사용완료"}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1">{coupon.storeName}</p>
              <p className="text-xs text-gray-400 mt-2">{formatActivityDate(coupon.claimedAt)} 획득</p>
            </button>
          ))}
          {coupons.length === 0 && (
            <p className="text-center text-sm text-gray-500 py-12">보유한 쿠폰이 없습니다.</p>
          )}
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl p-5">
            <h3 className="text-lg font-bold">{selected.title}</h3>
            <p className="text-sm text-gray-500 mt-1">{selected.storeName}</p>
            <p className="text-sm text-gray-700 mt-3">{selected.description}</p>
            <p className="text-sm font-semibold text-violet-700 mt-2">{selected.benefit}</p>

            {selected.status === "available" && !confirmUse && (
              <button
                type="button"
                onClick={() => setConfirmUse(true)}
                className="w-full mt-5 py-3 rounded-xl bg-violet-600 text-white font-bold"
              >
                사용하기
              </button>
            )}

            {confirmUse && (
              <div className="mt-5 space-y-3">
                <p className="text-sm text-red-600 font-medium">
                  사용 후에는 되돌릴 수 없습니다. 매장에서 직원에게 보여주고 사용하세요.
                </p>
                <button
                  type="button"
                  onClick={handleUse}
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-red-600 text-white font-bold disabled:opacity-50"
                >
                  {loading ? "처리 중..." : "사용 확인"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmUse(false)}
                  className="w-full py-2 text-sm text-gray-500"
                >
                  취소
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setSelected(null);
                setConfirmUse(false);
              }}
              className="w-full mt-3 py-2 text-sm text-gray-500"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
