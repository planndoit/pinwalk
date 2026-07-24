"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import AdminLocationMap from "@/components/admin/AdminLocationMap";
import {
  AdminButton,
  AdminCard,
  AdminInput,
  AdminPageHeader,
  AdminTextarea,
} from "@/components/admin/AdminUi";
import { LANDMARK_SOURCE_ATTRIBUTION, TOUR_CONTENT_TYPE_LABELS } from "@/lib/constants";

export default function AdminLandmarkDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [form, setForm] = useState({
    name: "",
    address: "",
    imageUrl: "",
    tel: "",
    overview: "",
    lat: null as number | null,
    lng: null as number | null,
    radiusMeters: "200",
    mapVisible: false,
    isClosed: false,
    adminNote: "",
    source: "manual",
    tourContentId: null as string | null,
    tourContentTypeId: null as string | null,
  });
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDetail = useCallback(async () => {
    const res = await fetch(`/api/admin/landmarks/${id}`);
    if (!res.ok) {
      setMessage("랜드마크를 불러오지 못했습니다.");
      return;
    }
    const data = await res.json();
    const p = data.landmark;
    setForm({
      name: p.name ?? "",
      address: p.address ?? "",
      imageUrl: p.imageUrl ?? "",
      tel: p.tel ?? "",
      overview: p.overview ?? "",
      lat: typeof p.lat === "number" ? p.lat : null,
      lng: typeof p.lng === "number" ? p.lng : null,
      radiusMeters: String(p.radiusMeters ?? 200),
      mapVisible: p.mapVisible === true,
      isClosed: p.isClosed === true,
      adminNote: p.adminNote ?? "",
      source: p.source ?? "manual",
      tourContentId: p.tourContentId ?? null,
      tourContentTypeId: p.tourContentTypeId ?? null,
    });
    setLoaded(true);
    setMessage(null);
  }, [id]);

  useEffect(() => {
    queueMicrotask(() => {
      void fetchDetail();
    });
  }, [fetchDetail]);

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
      const res = await fetch(`/api/admin/landmarks/${id}`, {
        method: "PATCH",
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
        setMessage(data.error ?? "저장에 실패했습니다.");
        return;
      }
      window.alert("저장되었습니다.");
      router.push("/admin/landmarks");
    } finally {
      setSaving(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/landmarks/${id}/refresh`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "TourAPI 새로고침에 실패했습니다.");
        return;
      }
      await fetchDetail();
      setMessage("TourAPI 상세 정보를 반영했습니다.");
    } finally {
      setRefreshing(false);
    }
  };

  if (!loaded) {
    return (
      <div>
        <AdminPageHeader title="랜드마크 상세" backHref="/admin/landmarks" />
        <p className="text-sm text-gray-500">불러오는 중...</p>
      </div>
    );
  }

  return (
    <div>
      <AdminPageHeader
        title="랜드마크 상세"
        backHref="/admin/landmarks"
        action={
          form.tourContentId ? (
            <AdminButton
              type="button"
              variant="secondary"
              onClick={() => void handleRefresh()}
              disabled={refreshing}
            >
              {refreshing ? "새로고침 중..." : "TourAPI 상세 새로고침"}
            </AdminButton>
          ) : undefined
        }
      />

      <AdminCard className="p-4 space-y-4 max-w-2xl">
        <p className="text-xs text-gray-500">
          출처: {form.source === "tourapi" ? LANDMARK_SOURCE_ATTRIBUTION : "수동"}
          {form.tourContentId ? ` · contentId ${form.tourContentId}` : ""}
          {form.tourContentTypeId
            ? ` · ${TOUR_CONTENT_TYPE_LABELS[form.tourContentTypeId] ?? form.tourContentTypeId}`
            : ""}
        </p>

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
          rows={5}
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
                name="operating"
                checked={!form.isClosed}
                onChange={() => setForm({ ...form, isClosed: false })}
              />
              운영
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input
                type="radio"
                name="operating"
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
              : "위치를 선택하세요."}
          </p>
        </div>

        {message ? <p className="text-sm text-gray-700">{message}</p> : null}

        <AdminButton type="button" onClick={() => void handleSave()} disabled={saving}>
          {saving ? "저장 중..." : "저장"}
        </AdminButton>
      </AdminCard>
    </div>
  );
}
