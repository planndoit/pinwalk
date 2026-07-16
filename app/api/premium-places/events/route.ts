import { NextResponse } from "next/server";
import { getAuthenticatedUser, jsonError } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  isClientPremiumPlaceEventType,
  recordPremiumPlaceEvent,
} from "@/lib/premium/events";

export async function POST(request: Request) {
  const body = await request.json();
  const { premium_place_id, event_type, metadata } = body as {
    premium_place_id?: string;
    event_type?: string;
    metadata?: Record<string, unknown>;
  };

  if (!premium_place_id) {
    return jsonError("장소 정보가 필요합니다.");
  }
  if (!event_type || !isClientPremiumPlaceEventType(event_type)) {
    return jsonError("유효하지 않은 이벤트 유형입니다.");
  }

  const admin = createAdminClient();
  const { data: place, error: placeError } = await admin
    .from("premium_places")
    .select("id")
    .eq("id", premium_place_id)
    .maybeSingle();

  if (placeError || !place) {
    return jsonError("프리미엄 장소를 찾을 수 없습니다.", 404);
  }

  const user = await getAuthenticatedUser();

  await recordPremiumPlaceEvent({
    premiumPlaceId: premium_place_id,
    eventType: event_type,
    userId: user?.id ?? null,
    metadata: metadata ?? {},
  });

  return NextResponse.json({ ok: true });
}
