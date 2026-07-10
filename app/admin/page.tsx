"use client";

import { useEffect, useState } from "react";
import { AdminCard, AdminPageHeader } from "@/components/admin/AdminUi";

interface DashboardStats {
  totalMembers: number;
  todayMembers: number;
  activePins: number;
  pendingPromotionRequests: number;
  activePremiumPlaces: number;
  todayConquerAttempts: number;
  todayPointVolume: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/admin/dashboard");
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
      }
    })();
  }, []);

  const cards = stats
    ? [
        { label: "전체 회원", value: stats.totalMembers },
        { label: "오늘 가입", value: stats.todayMembers },
        { label: "활성 깃발", value: stats.activePins },
        { label: "미처리 홍보 요청", value: stats.pendingPromotionRequests },
        { label: "활성 프리미엄 장소", value: stats.activePremiumPlaces },
        { label: "오늘 점령 시도", value: stats.todayConquerAttempts },
        { label: "오늘 포인트 거래량", value: stats.todayPointVolume.toLocaleString() },
      ]
    : [];

  return (
    <div>
      <AdminPageHeader
        title="대시보드"
        description="서비스 주요 지표를 한눈에 확인합니다."
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <AdminCard key={card.label} className="p-5">
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{card.value}</p>
          </AdminCard>
        ))}
        {!stats &&
          Array.from({ length: 6 }).map((_, i) => (
            <AdminCard key={i} className="p-5 h-24 animate-pulse bg-gray-100" />
          ))}
      </div>
    </div>
  );
}
