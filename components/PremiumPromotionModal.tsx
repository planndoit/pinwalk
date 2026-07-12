"use client";

import { useEffect, useState } from "react";

interface CommonCodeOption {
  code: string;
  name: string;
}

interface PremiumPromotionModalProps {
  open: boolean;
  onClose: () => void;
  selectedLocation: { lat: number; lng: number } | null;
  onSelectOnMap: () => void;
  onSuccess: (message: string) => void;
}

type FormFieldKey =
  | "storeName"
  | "contactPhone"
  | "contactEmail"
  | "contactName"
  | "address"
  | "promoText"
  | "promoLink";

const FORM_FIELDS: {
  key: FormFieldKey;
  label: string;
  required: boolean;
  placeholder?: string;
}[] = [
  { key: "storeName", label: "가게명", required: true },
  { key: "contactPhone", label: "연락처", required: true },
  { key: "contactEmail", label: "이메일", required: false },
  { key: "contactName", label: "담당자 이름", required: false },
  {
    key: "address",
    label: "도로명 주소",
    required: true,
    placeholder: "예: 서울특별시 강남구 테헤란로 123",
  },
  { key: "promoText", label: "홍보 문구", required: true },
  { key: "promoLink", label: "홍보 링크", required: false },
];

export default function PremiumPromotionModal({
  open,
  onClose,
  selectedLocation,
  onSelectOnMap,
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
    address: "",
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
        contactEmail: form.contactEmail || null,
        contactName: form.contactName || null,
        address: form.address,
        lat: selectedLocation?.lat ?? null,
        lng: selectedLocation?.lng ?? null,
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
          <button type="button" onClick={onClose} className="text-gray-400 text-xl">
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
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
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          {FORM_FIELDS.map(({ key, label, required, placeholder }) => (
            <label key={key} className="block text-sm">
              <span className="font-medium text-gray-700">
                {label}
                {!required && (
                  <span className="text-gray-400 font-normal"> (선택)</span>
                )}
              </span>
              <input
                className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5"
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                required={required}
                placeholder={placeholder}
              />
            </label>
          ))}

          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm font-semibold text-amber-800">
              지도 위치
              <span className="text-amber-700/70 font-normal"> (선택)</span>
            </p>
            <p className="text-sm text-amber-900 mt-1">
              {selectedLocation
                ? "지도에서 위치가 선택되었습니다."
                : "필요하면 지도에서 가게 위치를 선택할 수 있습니다."}
            </p>
            <button
              type="button"
              onClick={onSelectOnMap}
              className="mt-2 w-full py-2.5 rounded-xl bg-amber-500 text-white text-sm font-bold"
            >
              {selectedLocation ? "지도에서 위치 다시 선택" : "지도에서 위치 선택"}
            </button>
          </div>

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
