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

function FieldLabel({
  children,
  optional,
}: {
  children: React.ReactNode;
  optional?: boolean;
}) {
  return (
    <span className="font-medium text-gray-700">
      {children}
      {optional && (
        <span className="text-gray-400 font-normal"> (선택)</span>
      )}
    </span>
  );
}

const inputClassName =
  "mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-300";

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
    placePhone: "",
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
        placePhone: form.placePhone,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg bg-white rounded-2xl shadow-xl max-h-[85dvh] flex flex-col overflow-hidden"
      >
        <div className="shrink-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">프리미엄 깃발 홍보 요청</h2>
          <button type="button" onClick={onClose} className="text-gray-400 text-xl">
            ×
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-5">
          <section className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4 space-y-3">
            <div>
              <h3 className="text-sm font-bold text-gray-900">담당자 정보</h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                관리자가 요청을 검토한 뒤 연락드릴 때 사용합니다. 앱 화면에
                공개되지 않습니다.
              </p>
            </div>

            <label className="block text-sm">
              <FieldLabel optional>담당자 이름</FieldLabel>
              <input
                className={inputClassName}
                value={form.contactName}
                onChange={(e) =>
                  setForm({ ...form, contactName: e.target.value })
                }
                placeholder="홍길동"
              />
            </label>

            <label className="block text-sm">
              <FieldLabel>담당자 연락처</FieldLabel>
              <input
                className={inputClassName}
                value={form.contactPhone}
                onChange={(e) =>
                  setForm({ ...form, contactPhone: e.target.value })
                }
                required
                placeholder="010-1234-5678"
                inputMode="tel"
              />
            </label>

            <label className="block text-sm">
              <FieldLabel optional>이메일</FieldLabel>
              <input
                type="email"
                className={inputClassName}
                value={form.contactEmail}
                onChange={(e) =>
                  setForm({ ...form, contactEmail: e.target.value })
                }
                placeholder="contact@example.com"
              />
            </label>
          </section>

          <section className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 space-y-3">
            <div>
              <h3 className="text-sm font-bold text-gray-900">깃발 홍보 정보</h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                승인되면 지도의 프리미엄 깃발에 표시되는 내용입니다.
                <br />
                이용자가 보게 될 정보를 입력해 주세요.
              </p>
            </div>

            <label className="block text-sm">
              <FieldLabel>카테고리</FieldLabel>
              <select
                className={inputClassName}
                value={form.categoryCode}
                onChange={(e) =>
                  setForm({ ...form, categoryCode: e.target.value })
                }
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

            <label className="block text-sm">
              <FieldLabel>장소명</FieldLabel>
              <input
                className={inputClassName}
                value={form.storeName}
                onChange={(e) =>
                  setForm({ ...form, storeName: e.target.value })
                }
                required
                placeholder="이땅카페"
              />
            </label>

            <label className="block text-sm">
              <FieldLabel>전화번호</FieldLabel>
              <input
                className={inputClassName}
                value={form.placePhone}
                onChange={(e) =>
                  setForm({ ...form, placePhone: e.target.value })
                }
                required
                placeholder="02-1234-5678"
                inputMode="tel"
              />
            </label>

            <label className="block text-sm">
              <FieldLabel>도로명 주소</FieldLabel>
              <input
                className={inputClassName}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                required
                placeholder="예: 서울특별시 강남구 테헤란로 123"
              />
            </label>

            <label className="block text-sm">
              <FieldLabel>홍보 문구</FieldLabel>
              <textarea
                className={`${inputClassName} resize-none h-24`}
                value={form.promoText}
                onChange={(e) =>
                  setForm({ ...form, promoText: e.target.value })
                }
                required
                placeholder="방문 고객에게 보여줄 홍보 내용과 제공할 혜택 등을 적어 주세요"
              />
            </label>

            <label className="block text-sm">
              <FieldLabel optional>홍보 링크</FieldLabel>
              <input
                className={inputClassName}
                value={form.promoLink}
                onChange={(e) =>
                  setForm({ ...form, promoLink: e.target.value })
                }
                placeholder="https://"
              />
            </label>

            <div className="rounded-xl border border-amber-200 bg-white/80 px-4 py-3">
              <p className="text-sm font-semibold text-amber-900">
                지도 위치
                <span className="text-amber-700/70 font-normal"> (선택)</span>
              </p>
              <p className="text-xs text-amber-800/80 mt-1 leading-relaxed">
                {selectedLocation
                  ? "지도에서 위치가 선택되었습니다. 깃발이 꽂힐 위치를 더 정확히 지정할 수 있습니다."
                  : "주소를 보완해 깃발이 표시될 위치를 지도에서 지정할 수 있습니다."}
              </p>
              <button
                type="button"
                onClick={onSelectOnMap}
                className="mt-2.5 w-full py-2.5 rounded-xl bg-amber-500 text-white text-sm font-bold active:scale-98 transition-transform"
              >
                {selectedLocation
                  ? "지도에서 위치 다시 선택"
                  : "지도에서 위치 선택"}
              </button>
            </div>
          </section>
        </div>

        <div className="shrink-0 border-t border-gray-100 bg-white px-5 py-4 space-y-2">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-amber-500 text-white font-bold disabled:opacity-50"
          >
            {loading ? "접수 중..." : "홍보 요청하기"}
          </button>
        </div>
      </form>
    </div>
  );
}
