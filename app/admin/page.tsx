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
  processingPromotionRequests: number;
  completedPromotionRequests: number;
  rejectedPromotionRequests: number;
  activePremiumPlaces: number;
  inactivePremiumPlaces: number;
  todayConquerAttempts: number;
  todayConquerSuccess: number;
  todayConquerFail: number;
  totalConquerAttempts: number;
  todayAttendance: number;
  totalAttendance: number;
  todayPointEarnCount: number;
  totalPointEarnCount: number;
  todayPremiumMarkerClicks: number;
  todayPremiumDetailOpens: number;
  todayPremiumPhoneClicks: number;
  todayPremiumLinkClicks: number;
  todayPremiumCouponClaims: number;
  todayPremiumCouponUses: number;
  todayPremiumEventsTotal: number;
  period30PremiumMarkerClicks: number;
  period30PremiumDetailOpens: number;
  period30PremiumCouponClaims: number;
  period30PremiumCouponUses: number;
  period30PremiumEventsTotal: number;
  totalPremiumEvents: number;
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

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6">
      <h2 className="text-sm font-semibold text-gray-900 mb-2.5">{title}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {children}
      </div>
    </section>
  );
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

      <Section title="전체 상태">
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

            <StatCard href="/admin/premium-places">
              <p className="text-xs text-gray-500">프리미엄 장소</p>
              <p className="text-xl font-bold text-gray-900 mt-1">
                {stats.activePremiumPlaces.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                비활성{" "}
                <span className="font-semibold text-gray-700">
                  {stats.inactivePremiumPlaces.toLocaleString()}
                </span>
              </p>
            </StatCard>

            <StatCard href="/admin/promotion-requests">
              <p className="text-xs text-gray-500">미처리 홍보 요청</p>
              <p className="text-xl font-bold text-gray-900 mt-1">
                {stats.pendingPromotionRequests.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                처리중{" "}
                <span className="font-semibold text-blue-600">
                  {stats.processingPromotionRequests.toLocaleString()}
                </span>
                <span className="mx-1 text-gray-300">·</span>
                완료{" "}
                <span className="font-semibold text-emerald-600">
                  {stats.completedPromotionRequests.toLocaleString()}
                </span>
                <span className="mx-1 text-gray-300">·</span>
                반려{" "}
                <span className="font-semibold text-red-500">
                  {stats.rejectedPromotionRequests.toLocaleString()}
                </span>
              </p>
            </StatCard>
          </>
        ) : (
          Array.from({ length: 4 }).map((_, i) => (
            <AdminCard key={i} className="p-3.5 h-20 animate-pulse bg-gray-100" />
          ))
        )}
      </Section>

      <Section title="오늘 활동 지표">
        {stats ? (
          <>
            <StatCard>
              <p className="text-xs text-gray-500">출석</p>
              <p className="text-xl font-bold text-gray-900 mt-1">
                {stats.todayAttendance.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                누적{" "}
                <span className="font-semibold text-gray-700">
                  {stats.totalAttendance.toLocaleString()}
                </span>
              </p>
            </StatCard>

            <StatCard>
              <p className="text-xs text-gray-500">포인트 획득 수</p>
              <p className="text-xl font-bold text-gray-900 mt-1">
                {stats.todayPointEarnCount.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                누적{" "}
                <span className="font-semibold text-gray-700">
                  {stats.totalPointEarnCount.toLocaleString()}
                </span>
              </p>
            </StatCard>

            <StatCard>
              <p className="text-xs text-gray-500">점령 시도</p>
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
          </>
        ) : (
          Array.from({ length: 3 }).map((_, i) => (
            <AdminCard key={i} className="p-3.5 h-20 animate-pulse bg-gray-100" />
          ))
        )}
      </Section>

      <Section title="프리미엄 광고 성과">
        {stats ? (
          <>
            <StatCard href="/admin/premium-places">
              <p className="text-xs text-gray-500">오늘 이벤트</p>
              <p className="text-xl font-bold text-gray-900 mt-1">
                {stats.todayPremiumEventsTotal.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                마커{" "}
                <span className="font-semibold text-amber-600">
                  {stats.todayPremiumMarkerClicks.toLocaleString()}
                </span>
                <span className="mx-1 text-gray-300">·</span>
                상세{" "}
                <span className="font-semibold text-amber-600">
                  {stats.todayPremiumDetailOpens.toLocaleString()}
                </span>
              </p>
            </StatCard>

            <StatCard href="/admin/premium-places">
              <p className="text-xs text-gray-500">오늘 전환</p>
              <p className="text-xl font-bold text-gray-900 mt-1">
                {(
                  stats.todayPremiumPhoneClicks +
                  stats.todayPremiumLinkClicks +
                  stats.todayPremiumCouponClaims +
                  stats.todayPremiumCouponUses
                ).toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                전화{" "}
                <span className="font-semibold text-gray-700">
                  {stats.todayPremiumPhoneClicks.toLocaleString()}
                </span>
                <span className="mx-1 text-gray-300">·</span>
                링크{" "}
                <span className="font-semibold text-gray-700">
                  {stats.todayPremiumLinkClicks.toLocaleString()}
                </span>
                <span className="mx-1 text-gray-300">·</span>
                쿠폰획득{" "}
                <span className="font-semibold text-violet-600">
                  {stats.todayPremiumCouponClaims.toLocaleString()}
                </span>
              </p>
            </StatCard>

            <StatCard href="/admin/premium-places">
              <p className="text-xs text-gray-500">최근 30일 이벤트</p>
              <p className="text-xl font-bold text-gray-900 mt-1">
                {stats.period30PremiumEventsTotal.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                마커{" "}
                <span className="font-semibold text-amber-600">
                  {stats.period30PremiumMarkerClicks.toLocaleString()}
                </span>
                <span className="mx-1 text-gray-300">·</span>
                쿠폰획득{" "}
                <span className="font-semibold text-violet-600">
                  {stats.period30PremiumCouponClaims.toLocaleString()}
                </span>
              </p>
            </StatCard>

            <StatCard href="/admin/premium-places">
              <p className="text-xs text-gray-500">누적 이벤트</p>
              <p className="text-xl font-bold text-gray-900 mt-1">
                {stats.totalPremiumEvents.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                30일 쿠폰사용{" "}
                <span className="font-semibold text-emerald-600">
                  {stats.period30PremiumCouponUses.toLocaleString()}
                </span>
              </p>
            </StatCard>
          </>
        ) : (
          Array.from({ length: 4 }).map((_, i) => (
            <AdminCard key={`premium-${i}`} className="p-3.5 h-20 animate-pulse bg-gray-100" />
          ))
        )}
      </Section>

      <AdminCard className="p-4 sm:p-5">
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
