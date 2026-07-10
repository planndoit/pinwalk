import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api/auth";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { createAdminClient } from "@/lib/supabase/admin";
import { serializePromotionRequest } from "@/lib/premium/serialize";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("premium_promotion_requests")
    .select(
      "*, profiles!premium_promotion_requests_requester_user_id_fkey(nickname)"
    )
    .eq("id", id)
    .single();

  if (error || !data) {
    return jsonError("요청을 찾을 수 없습니다.", 404);
  }

  const { data: category } = await admin
    .from("common_codes")
    .select("name")
    .eq("group_code", "PREMIUM_CATEGORY")
    .eq("code", data.category_code)
    .maybeSingle();

  return NextResponse.json({
    request: serializePromotionRequest({
      ...data,
      requester_nickname:
        (data.profiles as { nickname?: string } | null)?.nickname ?? null,
      category_name: category?.name ?? data.category_code,
    }),
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
  const { status, adminNote } = body as {
    status?: string;
    adminNote?: string;
  };

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (status) {
    if (!["pending", "processing", "completed", "rejected"].includes(status)) {
      return jsonError("유효하지 않은 상태입니다.");
    }
    updates.status = status;
    if (status === "completed" || status === "rejected") {
      updates.processed_at = new Date().toISOString();
    }
  }

  if (typeof adminNote === "string") {
    updates.admin_note = adminNote;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("premium_promotion_requests")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    return jsonError("요청 수정에 실패했습니다.", 500);
  }

  return NextResponse.json({ request: serializePromotionRequest(data) });
}
