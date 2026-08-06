import { NextResponse } from "next/server";
import { AVATAR_MAX_BYTES } from "@/lib/auth/constants";
import { getAuthenticatedUser, jsonError } from "@/lib/api/auth";
import {
  CREW_CREATE_COST,
  CREW_MEMBERS_MAX,
} from "@/lib/constants";
import {
  generateCrewInviteToken,
  getActiveMembership,
} from "@/lib/crew/membership";
import { serializeCrew } from "@/lib/crew/serialize";
import { deductPoints } from "@/lib/pins";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  validateCrewAreaCode,
  validateCrewDescription,
  validateCrewMaxMembers,
  validateCrewName,
} from "@/lib/validation/crew";
import type { Crew } from "@/types/crew";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  const areaCode = searchParams.get("areaCode") ?? "";
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(
    50,
    Math.max(1, Number.parseInt(searchParams.get("limit") ?? "20", 10) || 20)
  );
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const admin = createAdminClient();
  let query = admin
    .from("crews")
    .select(
      "id, name, description, area_code, max_members, leader_id, invite_token, image_mime, status, dissolved_at, created_at, updated_at",
      { count: "exact" }
    )
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .range(from, to);

  if (q) {
    query = query.ilike("name", `%${q}%`);
  }
  if (areaCode) {
    query = query.eq("area_code", areaCode);
  }

  const { data, error, count } = await query;
  if (error) {
    return NextResponse.json(
      { error: "크루 목록 조회에 실패했습니다." },
      { status: 500 }
    );
  }

  const rows = (data ?? []) as Crew[];
  const crewIds = rows.map((row) => row.id);
  const memberCountByCrew = new Map<string, number>();
  const leaderNicknameById = new Map<string, string>();

  if (crewIds.length > 0) {
    const { data: members } = await admin
      .from("crew_members")
      .select("crew_id")
      .in("crew_id", crewIds);
    for (const member of members ?? []) {
      const id = member.crew_id as string;
      memberCountByCrew.set(id, (memberCountByCrew.get(id) ?? 0) + 1);
    }

    const leaderIds = [...new Set(rows.map((row) => row.leader_id))];
    const { data: leaders } = await admin
      .from("profiles")
      .select("id, nickname")
      .in("id", leaderIds);
    for (const leader of leaders ?? []) {
      leaderNicknameById.set(leader.id as string, leader.nickname as string);
    }
  }

  return NextResponse.json({
    crews: rows.map((row) =>
      serializeCrew(row, {
        memberCount: memberCountByCrew.get(row.id) ?? 0,
        leaderNickname: leaderNicknameById.get(row.leader_id) ?? null,
      })
    ),
    total: count ?? 0,
    page,
    limit,
  });
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return jsonError("로그인이 필요합니다.", 401);
  }

  const body = await request.json();
  const name = typeof body.name === "string" ? body.name : "";
  const areaCode = typeof body.areaCode === "string" ? body.areaCode : "";
  const maxMembers =
    typeof body.maxMembers === "number"
      ? body.maxMembers
      : CREW_MEMBERS_MAX;
  const descriptionRaw =
    typeof body.description === "string" ? body.description : null;
  const imageBase64 =
    typeof body.imageBase64 === "string" ? body.imageBase64 : null;
  const imageMime =
    typeof body.imageMime === "string" ? body.imageMime : null;

  const nameValidation = validateCrewName(name);
  if (!nameValidation.valid) {
    return jsonError(nameValidation.error!);
  }
  const areaValidation = validateCrewAreaCode(areaCode);
  if (!areaValidation.valid) {
    return jsonError(areaValidation.error!);
  }
  const maxValidation = validateCrewMaxMembers(maxMembers);
  if (!maxValidation.valid) {
    return jsonError(maxValidation.error!);
  }
  const descriptionValidation = validateCrewDescription(descriptionRaw);
  if (!descriptionValidation.valid) {
    return jsonError(descriptionValidation.error!);
  }

  let imageData: Buffer | null = null;
  let imageMimeFinal: string | null = null;
  if (imageBase64) {
    if (
      !imageMime ||
      !["image/jpeg", "image/webp", "image/png"].includes(imageMime)
    ) {
      return jsonError("지원하지 않는 이미지 형식입니다.");
    }
    imageData = Buffer.from(imageBase64, "base64");
    if (imageData.byteLength > AVATAR_MAX_BYTES) {
      return jsonError("크루 이미지는 50KB 이하여야 합니다.");
    }
    imageMimeFinal = imageMime;
  }

  const existing = await getActiveMembership(user.id);
  if (existing) {
    return jsonError("이미 다른 크루에 소속되어 있습니다.", 409);
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("points")
    .eq("id", user.id)
    .single();

  if (!profile || profile.points < CREW_CREATE_COST) {
    return jsonError("포인트가 부족합니다.");
  }

  const inviteToken = generateCrewInviteToken();
  const now = new Date().toISOString();

  const { data: crew, error: crewError } = await admin
    .from("crews")
    .insert({
      name: name.trim(),
      description: descriptionValidation.value,
      area_code: areaCode,
      max_members: maxMembers,
      leader_id: user.id,
      invite_token: inviteToken,
      image_data: imageData,
      image_mime: imageMimeFinal,
      status: "active",
      created_at: now,
      updated_at: now,
    })
    .select(
      "id, name, description, area_code, max_members, leader_id, invite_token, image_mime, status, dissolved_at, created_at, updated_at"
    )
    .single();

  if (crewError || !crew) {
    if (crewError?.code === "23505") {
      return jsonError("이미 사용 중인 크루명입니다.", 409);
    }
    return jsonError("크루 생성에 실패했습니다.", 500);
  }

  const { error: memberError } = await admin.from("crew_members").insert({
    crew_id: crew.id,
    user_id: user.id,
    role: "leader",
    joined_at: now,
  });

  if (memberError) {
    await admin.from("crews").delete().eq("id", crew.id);
    return jsonError("크루 생성에 실패했습니다.", 500);
  }

  const deduct = await deductPoints(
    user.id,
    CREW_CREATE_COST,
    "crew_create",
    `크루 생성 (${CREW_CREATE_COST}P)`,
    crew.id
  );

  if (!deduct.success) {
    await admin.from("crews").delete().eq("id", crew.id);
    return jsonError(deduct.error ?? "포인트 차감에 실패했습니다.");
  }

  return NextResponse.json({
    crew: serializeCrew(crew as Crew, {
      memberCount: 1,
      includeInviteToken: true,
    }),
    points: deduct.newPoints,
  });
}
