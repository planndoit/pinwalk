import { NextResponse } from "next/server";
import { getCrewMemberCount } from "@/lib/crew/membership";
import { serializeCrew } from "@/lib/crew/serialize";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Crew } from "@/types/crew";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token) {
    return NextResponse.json(
      { error: "초대 링크가 올바르지 않습니다." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("crews")
    .select(
      "id, name, description, area_code, max_members, leader_id, invite_token, image_mime, status, dissolved_at, created_at, updated_at"
    )
    .eq("invite_token", token)
    .eq("status", "active")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      { error: "크루를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  const { data: leader } = await admin
    .from("profiles")
    .select("nickname")
    .eq("id", data.leader_id)
    .maybeSingle();

  return NextResponse.json({
    crew: serializeCrew(data as Crew, {
      memberCount: await getCrewMemberCount(data.id),
      leaderNickname: leader?.nickname ?? null,
    }),
  });
}
