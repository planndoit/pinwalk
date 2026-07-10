"use client";

import { useEffect, useState } from "react";

interface CommonCodeOption {
  code: string;
  name: string;
}

interface PremiumPromotionModalProps {
  open: boolean;
  onClose: () => void;
  selectedLocation: { lat: number; lng: number };
  selectedAddress: string | null;
  onReselectLocation: () => void;
  onSuccess: (message: string) => void;
}

export default function PremiumPromotionModal({
  open,
  onClose,
  selectedLocation,
  selectedAddress,
  onReselectLocation,
  onSuccess,
}: PremiumPromotionModalProps) {
  const [categories, setCategories] = useState<CommonCodeOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    categoryCode: "",
    storeName: "",
    contactPhone: "",
    contactEmail: "",
    contactName: "",
    benefit: "",
    promoText: "",
    promoLink: "",
  });

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      void (async () => {
        const res = await fetch("/api/common-codes?group=PREMIUM_CATEGORY");
        if (res.ok) {
          const data = await res.json();
          setCategories(data.codes ?? []);
        }
      })();
    });
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/premium-promotion-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoryCode: form.categoryCode,
        storeName: form.storeName,
        contactPhone: form.contactPhone,
        contactEmail: form.contactEmail,
        contactName: form.contactName,
        lat: selectedLocation.lat,
        lng: selectedLocation.lng,
        benefit: form.benefit,
        promoText: form.promoText,
        promoLink: form.promoLink || null,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error);
      setLoading(false);
      return;
    }

    onSuccess(data.message);
    onClose();
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl max-h-[85dvh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">프리미엄 깃발 홍보 요청</h2>
          <button type="button" onClick={onClose} className="text-gray-400 text-xl">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm font-semibold text-amber-800">선택한 가게 위치</p>
            <p className="text-sm text-amber-900 mt-1">
              {selectedAddress ?? "지도에서 선택한 위치"}
            </p>
            <button
              type="button"
              onClick={onReselectLocation}
              className="mt-2 text-xs font-semibold text-amber-700 underline"
            >
              위치 다시 선택
            </button>
          </div>
          <label className="block text-sm">
            <span className="font-medium text-gray-700">카테고리</span>
            <select
              className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5"
              value={form.categoryCode}
              onChange={(e) => setForm({ ...form, categoryCode: e.target.value })}
              required
            >
              <option value="">선택</option>
              {categories.map((c) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </label>
          {[
            ["storeName", "가게명"],
            ["contactPhone", "연락처"],
            ["contactEmail", "이메일"],
            ["contactName", "담당자 이름"],
            ["benefit", "혜택"],
            ["promoText", "홍보 문구"],
            ["promoLink", "홍보 링크 (선택)"],
          ].map(([key, label]) => (
            <label key={key} className="block text-sm">
              <span className="font-medium text-gray-700">{label}</span>
              <input
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5"
                value={form[key as keyof typeof form]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                required={key !== "promoLink"}
              />
            </label>
          ))}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-amber-500 text-white font-bold disabled:opacity-50"
          >
            {loading ? "접수 중..." : "홍보 요청하기"}
          </button>
        </form>
      </div>
    </div>
  );
}
