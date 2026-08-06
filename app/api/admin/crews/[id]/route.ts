import { NextResponse } from "next/server";
import { AVATAR_MAX_BYTES } from "@/lib/auth/constants";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { jsonError } from "@/lib/api/auth";
import { getCrewMemberCount } from "@/lib/crew/membership";
import {
  getCombatPowersByUserIds,
  getLandmarkConquestCountsByUserIds,
} from "@/lib/crew/stats";
import { serializeCrew } from "@/lib/crew/serialize";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_NICKNAME } from "@/lib/constants";
import {
  validateCrewAreaCode,
  validateCrewDescription,
  validateCrewMaxMembers,
  validateCrewName,
} from "@/lib/validation/crew";
import type { Crew, SerializedCrewMember } from "@/types/crew";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("crews")
    .select(
      "id, name, description, area_code, max_members, leader_id, invite_token, image_mime, status, dissolved_at, created_at, updated_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return jsonError("크루를 찾을 수 없습니다.", 404);
  }

  const crew = data as Crew;
  const { data: members } = await admin
    .from("crew_members")
    .select("user_id, role, joined_at")
    .eq("crew_id", id)
    .order("joined_at", { ascending: true });

  const rows = members ?? [];
  const userIds = rows.map((row) => row.user_id as string);
  const [combatByUser, conquestByUser, profiles] = await Promise.all([
    getCombatPowersByUserIds(userIds),
    getLandmarkConquestCountsByUserIds(userIds),
    userIds.length > 0
      ? admin
          .from("profiles")
          .select("id, nickname, username, avatar_mime")
          .in("id", userIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
  ]);

  const profileById = new Map(
    (profiles.data ?? []).map((row) => [
      row.id as string,
      {
        nickname: (row.nickname as string) || DEFAULT_NICKNAME,
        username: (row.username as string | null) ?? null,
        hasAvatar: Boolean(row.avatar_mime),
      },
    ])
  );

  const serializedMembers: (SerializedCrewMember & {
    username: string | null;
  })[] = rows.map((row) => {
    const userId = row.user_id as string;
    const combatPower = combatByUser.get(userId) ?? 0;
    const profile = profileById.get(userId);
    return {
      userId,
      nickname: profile?.nickname ?? DEFAULT_NICKNAME,
      username: profile?.username ?? null,
      role: row.role as "leader" | "member",
      joinedAt: row.joined_at as string,
      combatPower,
      contributionPoints: combatPower,
      landmarkConquests: conquestByUser.get(userId) ?? 0,
      hasAvatar: profile?.hasAvatar ?? false,
    };
  });

  return NextResponse.json({
    crew: serializeCrew(crew, {
      memberCount: await getCrewMemberCount(id),
      leaderNickname:
        profileById.get(crew.leader_id)?.nickname ?? DEFAULT_NICKNAME,
      includeInviteToken: true,
      combatPower: serializedMembers.reduce((s, m) => s + m.combatPower, 0),
    }),
    members: serializedMembers,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json();
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (typeof body.name === "string") {
    const validation = validateCrewName(body.name);
    if (!validation.valid) return jsonError(validation.error!);
    patch.name = body.name.trim();
  }

  if (body.description !== undefined) {
    const validation = validateCrewDescription(
      typeof body.description === "string" ? body.description : null
    );
    if (!validation.valid) return jsonError(validation.error!);
    patch.description = validation.value;
  }

  if (typeof body.areaCode === "string") {
    const validation = validateCrewAreaCode(body.areaCode);
    if (!validation.valid) return jsonError(validation.error!);
    patch.area_code = body.areaCode;
  }

  if (typeof body.maxMembers === "number") {
    const validation = validateCrewMaxMembers(body.maxMembers);
    if (!validation.valid) return jsonError(validation.error!);
    const memberCount = await getCrewMemberCount(id);
    if (body.maxMembers < memberCount) {
      return jsonError(
        `현재 인원(${memberCount}명)보다 작은 상한은 설정할 수 없습니다.`
      );
    }
    patch.max_members = body.maxMembers;
  }

  if (body.removeImage === true) {
    patch.image_data = null;
    patch.image_mime = null;
  } else if (typeof body.imageBase64 === "string" && body.imageBase64) {
    const imageMime =
      typeof body.imageMime === "string" ? body.imageMime : "";
    if (!["image/jpeg", "image/webp", "image/png"].includes(imageMime)) {
      return jsonError("지원하지 않는 이미지 형식입니다.");
    }
    const imageData = Buffer.from(body.imageBase64, "base64");
    if (imageData.byteLength > AVATAR_MAX_BYTES) {
      return jsonError("크루 이미지는 50KB 이하여야 합니다.");
    }
    patch.image_data = imageData;
    patch.image_mime = imageMime;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("crews")
    .update(patch)
    .eq("id", id)
    .select(
      "id, name, description, area_code, max_members, leader_id, invite_token, image_mime, status, dissolved_at, created_at, updated_at"
    )
    .single();

  if (error || !data) {
    if (error?.code === "23505") {
      return jsonError("이미 사용 중인 크루명입니다.", 409);
    }
    return jsonError("크루 수정에 실패했습니다.", 500);
  }

  return NextResponse.json({
    crew: serializeCrew(data as Crew, {
      memberCount: await getCrewMemberCount(id),
      includeInviteToken: true,
    }),
  });
}
