"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AdminButton,
  AdminCard,
  AdminInput,
  AdminPageHeader,
  AdminSelect,
  AdminTextarea,
} from "@/components/admin/AdminUi";

export default function AdminPremiumPlaceNewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestId = searchParams.get("requestId");
  const [categories, setCategories] = useState<{ code: string; name: string }[]>([]);
  const [form, setForm] = useState({
    categoryCode: "",
    storeName: "",
    contactPhone: "",
    contactEmail: "",
    contactName: "",
    address: "",
    lat: "",
    lng: "",
    benefit: "",
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
          setForm({
            categoryCode: r.categoryCode,
            storeName: r.storeName,
            contactPhone: r.contactPhone,
            contactEmail: r.contactEmail ?? "",
            contactName: r.contactName ?? "",
            address: r.address ?? "",
            lat: r.lat != null ? String(r.lat) : "",
            lng: r.lng != null ? String(r.lng) : "",
            benefit: r.benefit,
            promoText: r.promoText,
            promoLink: r.promoLink ?? "",
            isActive: false,
          });
        }
      }
    })();
  }, [requestId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        lat: Number(form.lat),
        lng: Number(form.lng),
        benefit: form.benefit,
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
      <AdminPageHeader title="프리미엄 장소 추가" />
      <form onSubmit={handleSubmit}>
        <AdminCard className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AdminSelect
            label="카테고리"
            value={form.categoryCode}
            onChange={(e) => setForm({ ...form, categoryCode: e.target.value })}
            required
          >
            <option value="">선택</option>
            {categories.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </AdminSelect>
          <AdminInput label="가게명" value={form.storeName} onChange={(e) => setForm({ ...form, storeName: e.target.value })} required />
          <AdminInput label="연락처" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />
          <AdminInput label="이메일" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
          <AdminInput label="담당자" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
          <div className="sm:col-span-2">
            <AdminInput label="도로명 주소" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <AdminInput label="위도" value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} required />
          <AdminInput label="경도" value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} required />
          <div className="sm:col-span-2">
            <AdminTextarea label="혜택" rows={2} value={form.benefit} onChange={(e) => setForm({ ...form, benefit: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <AdminTextarea label="홍보 문구" rows={3} value={form.promoText} onChange={(e) => setForm({ ...form, promoText: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <AdminInput label="홍보 링크" value={form.promoLink} onChange={(e) => setForm({ ...form, promoLink: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
            활성화 (지도에 표시)
          </label>
        </AdminCard>
        <div className="mt-4 flex gap-2">
          <AdminButton type="submit">저장</AdminButton>
          <AdminButton type="button" variant="secondary" onClick={() => router.back()}>취소</AdminButton>
        </div>
        {message && <p className="text-sm text-red-600 mt-2">{message}</p>}
      </form>
    </div>
  );
}
