"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  AdminButton,
  AdminCard,
  AdminPageHeader,
  AdminSelect,
  AdminTextarea,
  StatusBadge,
} from "@/components/admin/AdminUi";
import { formatActivityDate } from "@/lib/formatDate";

export default function AdminPromotionRequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [request, setRequest] = useState<Record<string, unknown> | null>(null);
  const [status, setStatus] = useState("pending");
  const [adminNote, setAdminNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    const res = await fetch(`/api/admin/promotion-requests/${id}`);
    if (res.ok) {
      const data = await res.json();
      setRequest(data.request);
      setStatus(String(data.request.status));
      setAdminNote(String(data.request.adminNote ?? ""));
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

  if (!request) return <p className="text-sm text-gray-500">로딩 중...</p>;

  return (
    <div>
      <AdminPageHeader
        title="홍보 요청 상세"
        action={
          <AdminButton
            onClick={() =>
              router.push(
                `/admin/premium-places/new?requestId=${id}`
              )
            }
          >
            프리미엄 장소 생성
          </AdminButton>
        }
      />
      <AdminCard className="p-5 mb-4 space-y-2 text-sm">
        <p className="flex items-center gap-2"><span className="text-gray-500 w-24">상태</span> <StatusBadge status={status} /></p>
        <p><span className="text-gray-500 w-24 inline-block">가게명</span> {String(request.storeName)}</p>
        <p><span className="text-gray-500 w-24 inline-block">카테고리</span> {String(request.categoryName)}</p>
        <p><span className="text-gray-500 w-24 inline-block">담당자</span> {String(request.contactName)}</p>
        <p><span className="text-gray-500 w-24 inline-block">연락처</span> {String(request.contactPhone)}</p>
        <p><span className="text-gray-500 w-24 inline-block">이메일</span> {String(request.contactEmail)}</p>
        <p><span className="text-gray-500 w-24 inline-block">혜택</span> {String(request.benefit)}</p>
        <p><span className="text-gray-500 w-24 inline-block">홍보 문구</span> {String(request.promoText)}</p>
        <p><span className="text-gray-500 w-24 inline-block">홍보 링크</span> {String(request.promoLink ?? "-")}</p>
        <p><span className="text-gray-500 w-24 inline-block">위치</span> {Number(request.lat)}, {Number(request.lng)}</p>
        <p><span className="text-gray-500 w-24 inline-block">요청 회원</span> {String(request.requesterNickname ?? "-")}</p>
        <p><span className="text-gray-500 w-24 inline-block">요청일</span> {formatActivityDate(String(request.createdAt))}</p>
        {request.premiumPlaceId != null && request.premiumPlaceId !== "" && (
          <p>
            <Link href={`/admin/premium-places/${String(request.premiumPlaceId)}`} className="text-blue-600">
              연결된 프리미엄 장소 보기
            </Link>
          </p>
        )}
      </AdminCard>

      <AdminCard className="p-5 space-y-4">
        <AdminSelect label="처리 상태" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="pending">대기</option>
          <option value="processing">처리중</option>
          <option value="completed">완료</option>
          <option value="rejected">반려</option>
        </AdminSelect>
        <AdminTextarea label="관리자 메모" rows={4} value={adminNote} onChange={(e) => setAdminNote(e.target.value)} />
        <AdminButton onClick={handleSave}>저장</AdminButton>
        {message && <p className="text-sm text-gray-600">{message}</p>}
      </AdminCard>
    </div>
  );
}
