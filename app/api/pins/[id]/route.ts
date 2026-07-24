import { NextResponse } from "next/server";
import { getAuthenticatedUser, jsonError } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { refreshUserLandmarkScore } from "@/lib/landmark/scores";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return jsonError("로그인이 필요합니다.", 401);
  }

  const { id } = await params;
  const admin = createAdminClient();

  const { data: pin, error: pinError } = await admin
    .from("pins")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (pinError || !pin) {
    return jsonError("깃발을 찾을 수 없습니다.", 404);
  }

  if (pin.user_id !== user.id) {
    return jsonError("내 깃발만 삭제할 수 있습니다.", 403);
  }

  if (pin.status !== "active") {
    return jsonError("활성 깃발만 삭제할 수 있습니다.");
  }

  const { data: updated, error } = await admin
    .from("pins")
    .update({
      status: "hidden",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("status", "active")
    .select("id")
    .single();

  if (error || !updated) {
    return jsonError("깃발 삭제에 실패했습니다.", 500);
  }

  if (typeof pin.landmark_id === "string" && pin.landmark_id) {
    await refreshUserLandmarkScore(pin.landmark_id, user.id);
  }

  return NextResponse.json({ message: "깃발을 삭제했습니다." });
}
