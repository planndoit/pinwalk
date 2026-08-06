import { NextResponse } from "next/server";
import { AVATAR_MAX_BYTES } from "@/lib/auth/constants";
import { getAuthenticatedUser, jsonError } from "@/lib/api/auth";
import { encodeBytea } from "@/lib/bytea";
import { getActiveMembership, getCrewMemberCount } from "@/lib/crew/membership";
import { serializeCrew } from "@/lib/crew/serialize";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  validateCrewAreaCode,
  validateCrewDescription,
  validateCrewMaxMembers,
  validateCrewName,
} from "@/lib/validation/crew";
import type { Crew } from "@/types/crew";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return jsonError("로그인이 필요합니다.", 401);
  }

  const { id: crewId } = await params;
  const membership = await getActiveMembership(user.id);
  if (
    !membership ||
    membership.crew.id !== crewId ||
    membership.role !== "leader"
  ) {
    return jsonError("리더만 수정할 수 있습니다.", 403);
  }

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
    const memberCount = await getCrewMemberCount(crewId);
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
    patch.image_data = encodeBytea(imageData);
    patch.image_mime = imageMime;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("crews")
    .update(patch)
    .eq("id", crewId)
    .eq("status", "active")
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
      memberCount: await getCrewMemberCount(crewId),
      includeInviteToken: true,
    }),
  });
}
