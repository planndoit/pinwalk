"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import AdminLocationMap from "@/components/admin/AdminLocationMap";
import {
  AdminButton,
  AdminCard,
  AdminInput,
  AdminPageHeader,
  AdminSelect,
  AdminTextarea,
} from "@/components/admin/AdminUi";

function SectionTitle({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-4">
      <h3 className="text-sm font-bold text-gray-900">{title}</h3>
      <p className="text-xs text-gray-500 mt-1 leading-relaxed">{description}</p>
    </div>
  );
}

export default function AdminPremiumPlaceNewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestId = searchParams.get("requestId");
  const [categories, setCategories] = useState<{ code: string; name: string }[]>(
    []
  );
  const [form, setForm] = useState({
    categoryCode: "",
    storeName: "",
    contactPhone: "",
    contactEmail: "",
    contactName: "",
    address: "",
    placePhone: "",
    lat: null as number | null,
    lng: null as number | null,
    promoText: "",
    promoLink: "",
    isActive: false,
  });
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const codesRes = await fetch("/api/common-codes?group=PREMIUM_CATEGORY");
      if (codesRes.ok) {
        const data = await codesRes.json();
        setCategories(data.codes ?? []);
      }

      if (requestId) {
        const reqRes = await fetch(`/api/admin/promotion-requests/${requestId}`);
        if (reqRes.ok) {
          const data = await reqRes.json();
          const r = data.request;
          const lat =
            typeof r.lat === "number"
              ? r.lat
              : r.lat != null
                ? Number(r.lat)
                : null;
          const lng =
            typeof r.lng === "number"
              ? r.lng
              : r.lng != null
                ? Number(r.lng)
                : null;
          setForm({
            categoryCode: r.categoryCode ?? "",
            storeName: r.storeName ?? "",
            contactPhone: r.contactPhone ?? "",
            contactEmail: r.contactEmail ?? "",
            contactName: r.contactName ?? "",
            address: r.address ?? "",
            placePhone: r.placePhone ?? "",
            lat: lat != null && Number.isFinite(lat) ? lat : null,
            lng: lng != null && Number.isFinite(lng) ? lng : null,
            promoText: r.promoText ?? "",
            promoLink: r.promoLink ?? "",
            isActive: false,
          });
        }
      }
    })();
  }, [requestId]);

  const handlePick = useCallback((lat: number, lng: number) => {
    setForm((prev) => ({ ...prev, lat, lng }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.lat == null || form.lng == null) {
      setMessage("지도에서 위치를 선택해주세요.");
      return;
    }
    const res = await fetch("/api/admin/premium-places", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoryCode: form.categoryCode,
        storeName: form.storeName,
        contactPhone: form.contactPhone,
        contactEmail: form.contactEmail,
        contactName: form.contactName,
        address: form.address || null,
        placePhone: form.placePhone || null,
        lat: form.lat,
        lng: form.lng,
        promoText: form.promoText,
        promoLink: form.promoLink || null,
        isActive: form.isActive,
        promotionRequestId: requestId,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error);
      return;
    }
    router.push(`/admin/premium-places/${data.place.id}`);
  };

  return (
    <div>
      <AdminPageHeader title="프리미엄 장소 추가" backHref="/admin/premium-places" />
      {requestId && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
          홍보 요청 데이터로 미리 채워졌습니다. 담당자·깃발 홍보 정보를 확인한 뒤
          저장하세요.
        </p>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <AdminCard className="p-5">
          <SectionTitle
            title="담당자 정보"
            description="관리자가 컨택할 때 사용하는 정보입니다. 앱 화면에 공개되지 않습니다."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AdminInput
              label="담당자 이름"
              value={form.contactName}
              onChange={(e) =>
                setForm({ ...form, contactName: e.target.value })
              }
            />
            <AdminInput
              label="담당자 연락처"
              value={form.contactPhone}
              onChange={(e) =>
                setForm({ ...form, contactPhone: e.target.value })
              }
            />
            <div className="sm:col-span-2">
              <AdminInput
                label="이메일"
                value={form.contactEmail}
                onChange={(e) =>
                  setForm({ ...form, contactEmail: e.target.value })
                }
              />
            </div>
          </div>
        </AdminCard>

        <AdminCard className="p-5">
          <SectionTitle
            title="깃발 홍보 정보"
            description="지도의 프리미엄 깃발에 표시되는 내용입니다."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AdminSelect
              label="카테고리"
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
            </AdminSelect>
            <AdminInput
              label="장소명"
              value={form.storeName}
              onChange={(e) =>
                setForm({ ...form, storeName: e.target.value })
              }
              required
            />
            <AdminInput
              label="전화번호"
              value={form.placePhone}
              onChange={(e) =>
                setForm({ ...form, placePhone: e.target.value })
              }
              required
            />
            <div className="sm:col-span-2">
              <AdminInput
                label="도로명 주소"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <AdminTextarea
                label="홍보 문구"
                rows={3}
                value={form.promoText}
                onChange={(e) =>
                  setForm({ ...form, promoText: e.target.value })
                }
              />
            </div>
            <div className="sm:col-span-2">
              <AdminInput
                label="홍보 링크"
                value={form.promoLink}
                onChange={(e) =>
                  setForm({ ...form, promoLink: e.target.value })
                }
              />
            </div>
            <div className="sm:col-span-2 space-y-2">
              <p className="text-sm font-medium text-gray-700">지도 위치</p>
              <p className="text-xs text-gray-500">
                지도를 클릭해 깃발이 표시될 위치를 지정해주세요.
              </p>
              <AdminLocationMap
                lat={form.lat}
                lng={form.lng}
                pickable
                onPick={handlePick}
                height={360}
              />
            </div>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) =>
                  setForm({ ...form, isActive: e.target.checked })
                }
              />
              활성화 (지도에 표시)
            </label>
          </div>
        </AdminCard>

        <div className="flex gap-2">
          <AdminButton type="submit">저장</AdminButton>
          <AdminButton
            type="button"
            variant="secondary"
            onClick={() => router.back()}
          >
            취소
          </AdminButton>
        </div>
        {message && <p className="text-sm text-red-600">{message}</p>}
      </form>
    </div>
  );
}
