import { NextResponse } from "next/server";
import { getAuthenticatedUser, jsonError } from "@/lib/api/auth";
import {
  getActiveMembership,
  getCrewMemberCount,
  getPendingJoinRequestForUser,
} from "@/lib/crew/membership";
import { serializeCrew } from "@/lib/crew/serialize";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Crew } from "@/types/crew";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return jsonError("로그인이 필요합니다.", 401);
  }

  const membership = await getActiveMembership(user.id);
  if (!membership) {
    const pending = await getPendingJoinRequestForUser(user.id);
    let pendingCrew = null;
    if (pending) {
      const admin = createAdminClient();
      const { data } = await admin
        .from("crews")
        .select(
          "id, name, description, area_code, max_members, leader_id, invite_token, image_mime, status, dissolved_at, created_at, updated_at"
        )
        .eq("id", pending.crew_id)
        .maybeSingle();
      if (data) {
        pendingCrew = serializeCrew(data as Crew, {
          memberCount: await getCrewMemberCount(data.id),
        });
      }
    }

    return NextResponse.json({
      membership: null,
      pendingRequest: pending
        ? {
            id: pending.id,
            crewId: pending.crew_id,
            createdAt: pending.created_at,
            crew: pendingCrew,
          }
        : null,
    });
  }

  const memberCount = await getCrewMemberCount(membership.crew.id);

  return NextResponse.json({
    membership: {
      role: membership.role,
      crew: serializeCrew(membership.crew, {
        memberCount,
        includeInviteToken: membership.role === "leader",
      }),
    },
    pendingRequest: null,
  });
}
