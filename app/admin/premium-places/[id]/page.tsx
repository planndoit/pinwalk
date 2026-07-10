"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  AdminButton,
  AdminCard,
  AdminInput,
  AdminPageHeader,
  AdminSelect,
  AdminTextarea,
} from "@/components/admin/AdminUi";

export default function AdminPremiumPlaceDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [categories, setCategories] = useState<{ code: string; name: string }[]>([]);
  const [coupons, setCoupons] = useState<Record<string, unknown>[]>([]);
  const [form, setForm] = useState({
    categoryCode: "",
    storeName: "",
    contactPhone: "",
    contactEmail: "",
    contactName: "",
    lat: "",
    lng: "",
    benefit: "",
    promoText: "",
    promoLink: "",
    isActive: false,
    promotionRequestId: null as string | null,
  });
  const [couponForm, setCouponForm] = useState({
    title: "",
    description: "",
    benefit: "",
    expiresAt: "",
  });
  const [message, setMessage] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    const res = await fetch(`/api/admin/premium-places/${id}`);
    if (res.ok) {
      const data = await res.json();
      const p = data.place;
      setForm({
        categoryCode: p.categoryCode,
        storeName: p.storeName,
        contactPhone: p.contactPhone ?? "",
        contactEmail: p.contactEmail ?? "",
        contactName: p.contactName ?? "",
        lat: String(p.lat),
        lng: String(p.lng),
        benefit: p.benefit,
        promoText: p.promoText,
        promoLink: p.promoLink ?? "",
        isActive: p.isActive,
        promotionRequestId: p.promotionRequestId,
      });
      setCoupons(data.coupons ?? []);
    }
  }, [id]);

  useEffect(() => {
    void (async () => {
      const codesRes = await fetch("/api/common-codes?group=PREMIUM_CATEGORY");
      if (codesRes.ok) {
        const data = await codesRes.json();
        setCategories(data.codes ?? []);
      }
      void fetchDetail();
    })();
  }, [fetchDetail]);

  const handleSave = async () => {
    const res = await fetch(`/api/admin/premium-places/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoryCode: form.categoryCode,
        storeName: form.storeName,
        contactPhone: form.contactPhone,
        contactEmail: form.contactEmail,
        contactName: form.contactName,
        lat: Number(form.lat),
        lng: Number(form.lng),
        benefit: form.benefit,
        promoText: form.promoText,
        promoLink: form.promoLink || null,
        isActive: form.isActive,
        promotionRequestId: form.promotionRequestId,
      }),
    });
    const data = await res.json();
    setMessage(res.ok ? "저장되었습니다." : data.error);
  };

  const handleCreateCoupon = async () => {
    const res = await fetch(`/api/admin/premium-places/${id}/coupons`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: couponForm.title,
        description: couponForm.description,
        benefit: couponForm.benefit,
        expiresAt: couponForm.expiresAt || null,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setCouponForm({ title: "", description: "", benefit: "", expiresAt: "" });
      void fetchDetail();
    } else {
      setMessage(data.error);
    }
  };

  return (
    <div>
      <AdminPageHeader title="프리미엄 장소 상세" />
      <AdminCard className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <AdminSelect label="카테고리" value={form.categoryCode} onChange={(e) => setForm({ ...form, categoryCode: e.target.value })}>
          {categories.map((c) => (
            <option key={c.code} value={c.code}>{c.name}</option>
          ))}
        </AdminSelect>
        <AdminInput label="가게명" value={form.storeName} onChange={(e) => setForm({ ...form, storeName: e.target.value })} />
        <AdminInput label="연락처" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />
        <AdminInput label="이메일" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
        <AdminInput label="담당자" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
        <AdminInput label="위도" value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} />
        <AdminInput label="경도" value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} />
        <div className="sm:col-span-2"><AdminTextarea label="혜택" rows={2} value={form.benefit} onChange={(e) => setForm({ ...form, benefit: e.target.value })} /></div>
        <div className="sm:col-span-2"><AdminTextarea label="홍보 문구" rows={3} value={form.promoText} onChange={(e) => setForm({ ...form, promoText: e.target.value })} /></div>
        <div className="sm:col-span-2"><AdminInput label="홍보 링크" value={form.promoLink} onChange={(e) => setForm({ ...form, promoLink: e.target.value })} /></div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
          활성화
        </label>
        <AdminButton onClick={handleSave}>저장</AdminButton>
      </AdminCard>

      <AdminCard className="p-5">
        <h3 className="font-semibold mb-4">쿠폰 관리</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <AdminInput label="쿠폰 제목" value={couponForm.title} onChange={(e) => setCouponForm({ ...couponForm, title: e.target.value })} />
          <AdminInput label="만료일" type="datetime-local" value={couponForm.expiresAt} onChange={(e) => setCouponForm({ ...couponForm, expiresAt: e.target.value })} />
          <div className="sm:col-span-2"><AdminTextarea label="설명" rows={2} value={couponForm.description} onChange={(e) => setCouponForm({ ...couponForm, description: e.target.value })} /></div>
          <div className="sm:col-span-2"><AdminInput label="혜택" value={couponForm.benefit} onChange={(e) => setCouponForm({ ...couponForm, benefit: e.target.value })} /></div>
        </div>
        <AdminButton onClick={handleCreateCoupon}>쿠폰 추가</AdminButton>
        <div className="mt-4 space-y-2">
          {coupons.map((c) => (
            <div key={String(c.id)} className="text-sm border border-gray-100 rounded-lg p-3">
              <p className="font-medium">{String(c.title)}</p>
              <p className="text-gray-500">{String(c.benefit)}</p>
              <p className="text-xs text-gray-400">{c.isActive ? "활성" : "비활성"}</p>
            </div>
          ))}
        </div>
      </AdminCard>
      {message && <p className="text-sm text-gray-600 mt-2">{message}</p>}
    </div>
  );
}
