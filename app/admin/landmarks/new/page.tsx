"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import AdminLocationMap from "@/components/admin/AdminLocationMap";
import {
  AdminButton,
  AdminCard,
  AdminInput,
  AdminPageHeader,
  AdminTextarea,
} from "@/components/admin/AdminUi";
import { DEFAULT_LANDMARK_RADIUS_METERS } from "@/lib/constants";

export default function AdminLandmarkNewPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    address: "",
    imageUrl: "",
    tel: "",
    overview: "",
    lat: null as number | null,
    lng: null as number | null,
    radiusMeters: String(DEFAULT_LANDMARK_RADIUS_METERS),
    mapVisible: false,
    isClosed: false,
    adminNote: "",
  });
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handlePick = useCallback((lat: number, lng: number) => {
    setForm((prev) => ({ ...prev, lat, lng }));
  }, []);

  const handleSave = async () => {
    if (!form.name.trim()) {
      setMessage("이름을 입력해주세요.");
      return;
    }
    if (form.lat == null || form.lng == null) {
      setMessage("지도에서 위치를 선택해주세요.");
      return;
    }
    const radiusMeters = Number.parseInt(form.radiusMeters, 10);
    if (!Number.isFinite(radiusMeters) || radiusMeters <= 0) {
      setMessage("반경은 1 이상의 정수여야 합니다.");
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/landmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          address: form.address || null,
          imageUrl: form.imageUrl || null,
          tel: form.tel || null,
          overview: form.overview || null,
          lat: form.lat,
          lng: form.lng,
          radiusMeters,
          mapVisible: form.mapVisible,
          isClosed: form.isClosed,
          adminNote: form.adminNote || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "등록에 실패했습니다.");
        return;
      }
      router.push(`/admin/landmarks/${data.landmark.id}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <AdminPageHeader title="랜드마크 수동 추가" backHref="/admin/landmarks" />

      <AdminCard className="p-4 space-y-4 max-w-2xl">
        <AdminInput
          label="이름"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <AdminInput
          label="주소"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />
        <AdminInput
          label="이미지 URL"
          value={form.imageUrl}
          onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
        />
        <AdminInput
          label="전화"
          value={form.tel}
          onChange={(e) => setForm({ ...form, tel: e.target.value })}
        />
        <AdminTextarea
          label="개요"
          value={form.overview}
          onChange={(e) => setForm({ ...form, overview: e.target.value })}
          rows={4}
        />
        <AdminInput
          label="반경(m)"
          value={form.radiusMeters}
          onChange={(e) => setForm({ ...form, radiusMeters: e.target.value })}
        />
        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={form.mapVisible}
            onChange={(e) =>
              setForm({ ...form, mapVisible: e.target.checked })
            }
          />
          지도에 노출
        </label>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">운영 여부</p>
          <div className="flex flex-wrap gap-4">
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input
                type="radio"
                name="operating-new"
                checked={!form.isClosed}
                onChange={() => setForm({ ...form, isClosed: false })}
              />
              운영
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input
                type="radio"
                name="operating-new"
                checked={form.isClosed}
                onChange={() => setForm({ ...form, isClosed: true })}
              />
              미운영
            </label>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            미운영이면 유저 상세에 「현재 운영되지 않는 랜드마크」안내가 표시됩니다.
          </p>
        </div>
        <AdminTextarea
          label="운영 메모"
          value={form.adminNote}
          onChange={(e) => setForm({ ...form, adminNote: e.target.value })}
          rows={2}
        />

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">위치</p>
          <AdminLocationMap
            lat={form.lat}
            lng={form.lng}
            pickable
            onPick={handlePick}
          />
          <p className="text-xs text-gray-500 mt-2">
            {form.lat != null && form.lng != null
              ? `${form.lat.toFixed(6)}, ${form.lng.toFixed(6)}`
              : "지도를 클릭해 위치를 선택하세요."}
          </p>
        </div>

        {message ? <p className="text-sm text-red-600">{message}</p> : null}

        <AdminButton type="button" onClick={() => void handleSave()} disabled={saving}>
          {saving ? "저장 중..." : "등록"}
        </AdminButton>
      </AdminCard>
    </div>
  );
}
