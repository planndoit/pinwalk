import { NextResponse } from "next/server";
import { getAuthenticatedUser, jsonError } from "@/lib/api/auth";
import {
  getSidoTotalCount,
  getSigunguByCode,
  getSigunguTotalCount,
} from "@/lib/geo/koreaSigungu";
import { createAdminClient } from "@/lib/supabase/admin";
import { backfillRegionVisits } from "@/lib/visits/recordVisit";
import type { VisitRegion } from "@/types/visit";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return jsonError("로그인이 필요합니다.", 401);
  }

  try {
    await backfillRegionVisits(user.id);
  } catch (error) {
    console.error("backfillRegionVisits failed:", error);
    return jsonError("방문 기록 정리에 실패했습니다.", 500);
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_region_visits")
    .select("region_code, first_visited_at, pin_count")
    .eq("user_id", user.id);

  if (error) {
    return jsonError("방문 통계 조회에 실패했습니다.", 500);
  }

  const regions: VisitRegion[] = [];
  const visitedSido = new Set<string>();

  for (const row of data ?? []) {
    const properties = getSigunguByCode(String(row.region_code));
    if (!properties) continue;
    visitedSido.add(properties.CTPRVN_CD);
    regions.push({
      code: properties.SIG_CD,
      name: properties.SIG_KOR_NM,
      sido_code: properties.CTPRVN_CD,
      sido_name: properties.CTP_KOR_NM,
      first_visited_at: String(row.first_visited_at),
      pin_count: Number(row.pin_count),
    });
  }

  regions.sort((a, b) => {
    if (a.sido_code !== b.sido_code) {
      return a.sido_code.localeCompare(b.sido_code);
    }
    return a.name.localeCompare(b.name, "ko");
  });

  return NextResponse.json({
    visited_count: regions.length,
    total_count: getSigunguTotalCount(),
    sido_visited_count: visitedSido.size,
    sido_total_count: getSidoTotalCount(),
    regions,
  });
}
