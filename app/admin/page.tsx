"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminCard, AdminPageHeader } from "@/components/admin/AdminUi";
import MemberTrendChart, {
  type MemberTrendPoint,
} from "@/components/admin/MemberTrendChart";

interface DashboardStats {
  totalMembers: number;
  todayMembers: number;
  activePins: number;
  totalPins: number;
  pendingPromotionRequests: number;
  activePremiumPlaces: number;
  todayConquerAttempts: number;
  todayConquerSuccess: number;
  todayConquerFail: number;
  totalConquerAttempts: number;
  todayPointVolume: number;
  todayAttendance: number;
  todayPointEarnCount: number;
}

function StatCard({
  href,
  children,
}: {
  href?: string;
  children: React.ReactNode;
}) {
  const className =
    "p-3.5 h-full block transition-colors " +
    (href ? "hover:border-blue-300 hover:bg-blue-50/40 cursor-pointer" : "");

  if (href) {
    return (
      <Link href={href}>
        <AdminCard className={className}>{children}</AdminCard>
      </Link>
    );
  }

  return <AdminCard className={className}>{children}</AdminCard>;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [memberTrend, setMemberTrend] = useState<MemberTrendPoint[]>([]);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/admin/dashboard");
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setMemberTrend(data.memberTrend ?? []);
      }
    })();
  }, []);

  return (
    <div>
      <AdminPageHeader
        title="대시보드"
        description="서비스 주요 지표를 한눈에 확인합니다."
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {stats ? (
          <>
            <StatCard href="/admin/members">
              <p className="text-xs text-gray-500">회원</p>
              <p className="text-xl font-bold text-gray-900 mt-1">
                {stats.totalMembers.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                오늘 가입{" "}
                <span className="font-semibold text-blue-600">
                  +{stats.todayMembers.toLocaleString()}
                </span>
              </p>
            </StatCard>

            <StatCard>
              <p className="text-xs text-gray-500">현재 깃발</p>
              <p className="text-xl font-bold text-gray-900 mt-1">
                {stats.activePins.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                누적{" "}
                <span className="font-semibold text-gray-700">
                  {stats.totalPins.toLocaleString()}
                </span>
              </p>
            </StatCard>

            <StatCard>
              <p className="text-xs text-gray-500">오늘 점령 시도</p>
              <p className="text-xl font-bold text-gray-900 mt-1">
                {stats.todayConquerAttempts.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                성공{" "}
                <span className="font-semibold text-emerald-600">
                  {stats.todayConquerSuccess.toLocaleString()}
                </span>
                <span className="mx-1 text-gray-300">·</span>
                실패{" "}
                <span className="font-semibold text-red-500">
                  {stats.todayConquerFail.toLocaleString()}
                </span>
                <span className="mx-1 text-gray-300">·</span>
                누적{" "}
                <span className="font-semibold text-gray-700">
                  {stats.totalConquerAttempts.toLocaleString()}
                </span>
              </p>
            </StatCard>

            <StatCard href="/admin/promotion-requests">
              <p className="text-xs text-gray-500">미처리 홍보 요청</p>
              <p className="text-xl font-bold text-gray-900 mt-1">
                {stats.pendingPromotionRequests.toLocaleString()}
              </p>
            </StatCard>

            <StatCard href="/admin/premium-places">
              <p className="text-xs text-gray-500">활성 프리미엄 장소</p>
              <p className="text-xl font-bold text-gray-900 mt-1">
                {stats.activePremiumPlaces.toLocaleString()}
              </p>
            </StatCard>

            <StatCard>
              <p className="text-xs text-gray-500">오늘 출석</p>
              <p className="text-xl font-bold text-gray-900 mt-1">
                {stats.todayAttendance.toLocaleString()}
              </p>
            </StatCard>

            <StatCard>
              <p className="text-xs text-gray-500">오늘 포인트 획득 수</p>
              <p className="text-xl font-bold text-gray-900 mt-1">
                {stats.todayPointEarnCount.toLocaleString()}
              </p>
            </StatCard>

            <StatCard>
              <p className="text-xs text-gray-500">오늘 포인트 거래량</p>
              <p className="text-xl font-bold text-gray-900 mt-1">
                {stats.todayPointVolume.toLocaleString()}
              </p>
            </StatCard>
          </>
        ) : (
          Array.from({ length: 8 }).map((_, i) => (
            <AdminCard key={i} className="p-3.5 h-20 animate-pulse bg-gray-100" />
          ))
        )}
      </div>

      <AdminCard className="mt-5 p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">회원 추세</h2>
        <p className="text-xs text-gray-500 mb-3">
          일별 가입 수(막대)와 전체 회원 수(선)의 최근 14일 추이입니다.
        </p>
        {stats ? (
          <MemberTrendChart data={memberTrend} />
        ) : (
          <div className="h-52 animate-pulse bg-gray-100 rounded-lg" />
        )}
      </AdminCard>
    </div>
  );
}
