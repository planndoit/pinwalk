"use client";

import { useEffect, useState } from "react";
import {
  AdminCard,
  AdminSelect,
} from "@/components/admin/AdminUi";
import type { PremiumPlaceEventCounts } from "@/lib/premium/analytics";
import {
  PREMIUM_PLACE_EVENT_LABELS,
  type PremiumPlaceEventType,
} from "@/lib/premium/events";

const DISPLAY_EVENT_TYPES: PremiumPlaceEventType[] = [
  "marker_click",
  "detail_open",
  "phone_click",
  "link_click",
  "coupon_issue",
  "coupon_spawn_click",
  "coupon_claim",
  "coupon_use",
  "view_from_coupons",
];

const PERIOD_OPTIONS = [
  { value: "7", label: "최근 7일" },
  { value: "30", label: "최근 30일" },
  { value: "90", label: "최근 90일" },
];

interface AnalyticsResponse {
  periodDays: number;
  totals: PremiumPlaceEventCounts;
  dailyTrend: { date: string; counts: PremiumPlaceEventCounts }[];
}

interface PremiumPlaceAnalyticsPanelProps {
  placeId?: string;
  title?: string;
  compact?: boolean;
}

function sumCounts(counts: PremiumPlaceEventCounts, keys: PremiumPlaceEventType[]) {
  return keys.reduce((sum, key) => sum + (counts[key] ?? 0), 0);
}

export default function PremiumPlaceAnalyticsPanel({
  placeId,
  title = "광고 성과",
  compact = false,
}: PremiumPlaceAnalyticsPanelProps) {
  const [days, setDays] = useState("30");
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    void (async () => {
      const params = new URLSearchParams({ days });
      if (placeId) params.set("placeId", placeId);
      const res = await fetch(`/api/admin/premium-places/analytics?${params}`);
      if (res.ok) {
        const json = (await res.json()) as AnalyticsResponse;
        setData(json);
      } else {
        setData(null);
      }
      setLoading(false);
    })();
  }, [days, placeId]);

  if (loading) {
    return (
      <AdminCard className="p-5">
        <p className="text-sm text-gray-500">성과 데이터를 불러오는 중...</p>
      </AdminCard>
    );
  }

  if (!data) {
    return (
      <AdminCard className="p-5">
        <p className="text-sm text-gray-500">성과 데이터를 불러오지 못했습니다.</p>
      </AdminCard>
    );
  }

  const totals = data.totals;
  const engagementTotal = sumCounts(totals, [
    "marker_click",
    "detail_open",
    "phone_click",
    "link_click",
    "view_from_coupons",
  ]);
  const couponTotal = sumCounts(totals, [
    "coupon_issue",
    "coupon_spawn_click",
    "coupon_claim",
    "coupon_use",
  ]);

  return (
    <AdminCard className="p-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-bold text-gray-900">{title}</h3>
          <p className="text-xs text-gray-500 mt-1">
            최근 {data.periodDays}일 기준 · 노출 {engagementTotal.toLocaleString()}건 ·
            쿠폰 {couponTotal.toLocaleString()}건
          </p>
        </div>
        <div className="w-full sm:w-40">
          <AdminSelect
            label="기간"
            value={days}
            onChange={(e) => setDays(e.target.value)}
          >
            {PERIOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </AdminSelect>
        </div>
      </div>

      <div
        className={
          compact
            ? "grid grid-cols-2 sm:grid-cols-4 gap-2"
            : "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3"
        }
      >
        {DISPLAY_EVENT_TYPES.map((eventType) => (
          <div
            key={eventType}
            className="rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2.5"
          >
            <p className="text-[11px] text-gray-500">
              {PREMIUM_PLACE_EVENT_LABELS[eventType]}
            </p>
            <p className="text-lg font-bold text-gray-900 mt-0.5 tabular-nums">
              {(totals[eventType] ?? 0).toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      {!compact && data.dailyTrend.length > 0 && (
        <div className="mt-5">
          <p className="text-xs font-semibold text-gray-700 mb-2">일별 추이</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-left text-gray-500">
                  <th className="py-2 pr-3 font-medium">날짜</th>
                  <th className="py-2 pr-3 font-medium">마커</th>
                  <th className="py-2 pr-3 font-medium">상세</th>
                  <th className="py-2 pr-3 font-medium">전화</th>
                  <th className="py-2 pr-3 font-medium">링크</th>
                  <th className="py-2 pr-3 font-medium">쿠폰획득</th>
                  <th className="py-2 font-medium">쿠폰사용</th>
                </tr>
              </thead>
              <tbody>
                {data.dailyTrend.map((row) => (
                  <tr key={row.date} className="border-b border-gray-50">
                    <td className="py-2 pr-3 text-gray-700">{row.date}</td>
                    <td className="py-2 pr-3 tabular-nums">
                      {row.counts.marker_click}
                    </td>
                    <td className="py-2 pr-3 tabular-nums">
                      {row.counts.detail_open}
                    </td>
                    <td className="py-2 pr-3 tabular-nums">
                      {row.counts.phone_click}
                    </td>
                    <td className="py-2 pr-3 tabular-nums">
                      {row.counts.link_click}
                    </td>
                    <td className="py-2 pr-3 tabular-nums">
                      {row.counts.coupon_claim}
                    </td>
                    <td className="py-2 tabular-nums">{row.counts.coupon_use}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminCard>
  );
}
