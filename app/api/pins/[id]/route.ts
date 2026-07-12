import { NextResponse } from "next/server";
import { getAuthenticatedUser, jsonError } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { validatePinText } from "@/lib/validation";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return jsonError("로그인이 필요합니다.", 401);
  }

  const { id } = await params;
  const body = await request.json();
  const { text } = body as { text?: string };

  if (typeof text !== "string") {
    return jsonError("핀 문구를 입력해주세요.");
  }

  const validation = validatePinText(text);
  if (!validation.valid) {
    return jsonError(validation.error!);
  }

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
    return jsonError("내 깃발만 수정할 수 있습니다.", 403);
  }

  if (pin.status !== "active") {
    return jsonError("활성 깃발만 수정할 수 있습니다.");
  }

  const { data: updated, error } = await admin
    .from("pins")
    .update({
      text: text.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("status", "active")
    .select("*, profiles!pins_user_id_fkey(nickname)")
    .single();

  if (error || !updated) {
    return jsonError("깃발 수정에 실패했습니다.", 500);
  }

  return NextResponse.json({
    pin: {
      ...updated,
      nickname: updated.profiles?.nickname ?? "익명의 워커",
      profiles: undefined,
    },
  });
}

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

  return NextResponse.json({ message: "깃발을 삭제했습니다." });
}
