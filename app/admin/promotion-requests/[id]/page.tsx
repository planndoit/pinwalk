"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AdminLocationMapModal } from "@/components/admin/AdminLocationMap";
import {
  AdminButton,
  AdminCard,
  AdminPageHeader,
  AdminSelect,
  AdminTextarea,
  StatusBadge,
} from "@/components/admin/AdminUi";
import { formatActivityDate } from "@/lib/formatDate";

function displayText(value: unknown): string {
  if (value == null) return "";
  const text = String(value).trim();
  if (!text || text === "null" || text === "undefined") return "";
  return text;
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="text-gray-500 w-24 shrink-0 pt-0.5">{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export default function AdminPromotionRequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [request, setRequest] = useState<Record<string, unknown> | null>(null);
  const [status, setStatus] = useState("pending");
  const [adminNote, setAdminNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [mapOpen, setMapOpen] = useState(false);

  const fetchDetail = useCallback(async () => {
    const res = await fetch(`/api/admin/promotion-requests/${id}`);
    if (res.ok) {
      const data = await res.json();
      setRequest(data.request);
      setStatus(String(data.request.status));
      setAdminNote(displayText(data.request.adminNote));
    }
  }, [id]);

  useEffect(() => {
    queueMicrotask(() => {
      void fetchDetail();
    });
  }, [fetchDetail]);

  const handleSave = async () => {
    const res = await fetch(`/api/admin/promotion-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, adminNote }),
    });
    const data = await res.json();
    setMessage(res.ok ? "저장되었습니다." : data.error);
    if (res.ok) void fetchDetail();
  };

  if (!request) {
    return (
      <div>
        <AdminPageHeader
          title="홍보 요청 상세"
          backHref="/admin/promotion-requests"
        />
        <p className="text-sm text-gray-500">로딩 중...</p>
      </div>
    );
  }

  const lat =
    typeof request.lat === "number"
      ? request.lat
      : request.lat != null && request.lat !== ""
        ? Number(request.lat)
        : null;
  const lng =
    typeof request.lng === "number"
      ? request.lng
      : request.lng != null && request.lng !== ""
        ? Number(request.lng)
        : null;
  const hasLocation =
    lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng);

  return (
    <div>
      <AdminPageHeader
        title="홍보 요청 상세"
        backHref="/admin/promotion-requests"
        action={
          <AdminButton
            onClick={() =>
              router.push(`/admin/premium-places/new?requestId=${id}`)
            }
          >
            프리미엄 장소 생성
          </AdminButton>
        }
      />
      <AdminCard className="p-5 mb-4 space-y-3">
        <DetailRow label="상태">
          <StatusBadge status={status} />
        </DetailRow>
        <DetailRow label="가게명">{displayText(request.storeName)}</DetailRow>
        <DetailRow label="카테고리">{displayText(request.categoryName)}</DetailRow>
        <DetailRow label="담당자">{displayText(request.contactName)}</DetailRow>
        <DetailRow label="연락처">{displayText(request.contactPhone)}</DetailRow>
        <DetailRow label="이메일">{displayText(request.contactEmail)}</DetailRow>
        <DetailRow label="도로명 주소">{displayText(request.address)}</DetailRow>
        <DetailRow label="혜택">{displayText(request.benefit)}</DetailRow>
        <DetailRow label="홍보 문구">{displayText(request.promoText)}</DetailRow>
        <DetailRow label="홍보 링크">{displayText(request.promoLink)}</DetailRow>
        <DetailRow label="위치">
          {hasLocation ? (
            <AdminButton
              type="button"
              variant="secondary"
              onClick={() => setMapOpen(true)}
            >
              지도에서 보기
            </AdminButton>
          ) : (
            ""
          )}
        </DetailRow>
        <DetailRow label="요청 회원">
          {displayText(request.requesterNickname)}
        </DetailRow>
        <DetailRow label="요청일">
          {formatActivityDate(String(request.createdAt))}
        </DetailRow>
        {request.premiumPlaceId != null && request.premiumPlaceId !== "" && (
          <p>
            <Link
              href={`/admin/premium-places/${String(request.premiumPlaceId)}`}
              className="text-blue-600 text-sm"
            >
              연결된 프리미엄 장소 보기
            </Link>
          </p>
        )}
      </AdminCard>

      <AdminCard className="p-5 space-y-4">
        <AdminSelect
          label="처리 상태"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="pending">대기</option>
          <option value="processing">처리중</option>
          <option value="completed">완료</option>
          <option value="rejected">반려</option>
        </AdminSelect>
        <AdminTextarea
          label="관리자 메모"
          rows={4}
          value={adminNote}
          onChange={(e) => setAdminNote(e.target.value)}
        />
        <AdminButton onClick={handleSave}>저장</AdminButton>
        {message && <p className="text-sm text-gray-600">{message}</p>}
      </AdminCard>

      {hasLocation && (
        <AdminLocationMapModal
          open={mapOpen}
          lat={lat}
          lng={lng}
          onClose={() => setMapOpen(false)}
        />
      )}
    </div>
  );
}
