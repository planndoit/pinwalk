"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  AdminButton,
  AdminCard,
  AdminInput,
  AdminPageHeader,
} from "@/components/admin/AdminUi";
import { formatActivityDate } from "@/lib/formatDate";
import type { TimelineEvent, UserStats } from "@/types/ranking";

type AdminMemberStats = UserStats & {
  attendance_count: number;
  attended_today: boolean;
};

export default function AdminMemberDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [member, setMember] = useState<Record<string, unknown> | null>(null);
  const [stats, setStats] = useState<AdminMemberStats | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    const res = await fetch(`/api/admin/members/${id}`);
    if (res.ok) {
      const data = await res.json();
      setMember(data.member);
      setStats(data.stats);
      setTimeline(data.timeline ?? []);
    }
  }, [id]);

  useEffect(() => {
    queueMicrotask(() => {
      void fetchDetail();
    });
  }, [fetchDetail]);

  const handleGrantPoints = async () => {
    const res = await fetch(`/api/admin/members/${id}/points`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(amount), reason }),
    });
    const data = await res.json();
    setMessage(res.ok ? data.message : data.error);
    if (res.ok) {
      setAmount("");
      setReason("");
      void fetchDetail();
    }
  };

  if (!member) {
    return (
      <div>
        <AdminPageHeader title="회원 상세" backHref="/admin/members" />
        <p className="text-sm text-gray-500">로딩 중...</p>
      </div>
    );
  }

  return (
    <div>
      <AdminPageHeader title="회원 상세" backHref="/admin/members" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <AdminCard className="p-5 space-y-2 text-sm">
          <p><span className="text-gray-500">닉네임:</span> {String(member.nickname)}</p>
          <p><span className="text-gray-500">아이디:</span> {String(member.username ?? "-")}</p>
          <p><span className="text-gray-500">포인트:</span> {Number(member.points).toLocaleString()}P</p>
          <p><span className="text-gray-500">가입일:</span> {formatActivityDate(String(member.createdAt))}</p>
          <p><span className="text-gray-500">마지막 접속:</span> {member.lastSeenAt ? formatActivityDate(String(member.lastSeenAt)) : "-"}</p>
          <p><span className="text-gray-500">마지막 출석:</span> {member.lastDailyBonusAt ? formatActivityDate(String(member.lastDailyBonusAt)) : "-"}</p>
        </AdminCard>
        <AdminCard className="p-5">
          <h3 className="font-semibold mb-3">활동 통계</h3>
          {stats ? (
            <div className="grid grid-cols-2 gap-2 text-sm">
              <p>
                누적 획득:{" "}
                <span className="font-semibold">
                  {stats.total_earned.toLocaleString()}P
                </span>
              </p>
              <p>
                포인트 획득:{" "}
                <span className="font-semibold">
                  {stats.earn_count.toLocaleString()}회
                </span>
              </p>
              <p>
                현재 깃발:{" "}
                <span className="font-semibold">
                  {stats.active_pins.toLocaleString()}개
                </span>
              </p>
              <p>
                누적 깃발:{" "}
                <span className="font-semibold">
                  {stats.total_pins.toLocaleString()}개
                </span>
              </p>
              <p>
                점령 수:{" "}
                <span className="font-semibold">
                  {stats.conquers.toLocaleString()}회
                </span>
              </p>
              <p>
                출석:{" "}
                <span className="font-semibold">
                  {stats.attendance_count.toLocaleString()}회
                </span>
                {stats.attended_today ? (
                  <span className="ml-1.5 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                    오늘 출석
                  </span>
                ) : null}
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-500">통계를 불러오지 못했습니다.</p>
          )}
        </AdminCard>
      </div>

      <AdminCard className="p-5 mb-6">
        <h3 className="font-semibold mb-3">포인트 지급</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <AdminInput label="지급 포인트" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <AdminInput label="지급 명목" value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <AdminButton onClick={handleGrantPoints}>포인트 지급</AdminButton>
        {message && <p className="text-sm mt-2 text-gray-600">{message}</p>}
      </AdminCard>

      <AdminCard className="p-5">
        <h3 className="font-semibold mb-3">활동 내역</h3>
        <div className="space-y-2">
          {timeline.map((event) => (
            <div key={event.id} className="text-sm border-b border-gray-50 pb-2">
              <p className="font-medium">{event.title}</p>
              <p className="text-gray-500 text-xs">{formatActivityDate(event.created_at)}</p>
            </div>
          ))}
          {timeline.length === 0 && <p className="text-sm text-gray-500">활동 내역이 없습니다.</p>}
        </div>
      </AdminCard>
    </div>
  );
}
