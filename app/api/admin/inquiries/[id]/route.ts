import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { jsonError } from "@/lib/api/auth";
import { isInquiryStatus } from "@/lib/constants";
import { serializeInquiry } from "@/lib/inquiry/serialize";
import { notifyInquiryReply } from "@/lib/notifications/events";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateInquiryReply } from "@/lib/validation/inquiry";
import type { Inquiry } from "@/types/inquiry";

function profileFromRow(row: Record<string, unknown>): {
  nickname: string | null;
  username: string | null;
} {
  const profile = row.profiles as
    | { nickname?: string; username?: string }
    | { nickname?: string; username?: string }[]
    | null;
  const profileRow = Array.isArray(profile) ? profile[0] : profile;
  return {
    nickname: profileRow?.nickname ?? null,
    username: profileRow?.username ?? null,
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("inquiries")
    .select("*, profiles!inquiries_user_id_fkey(nickname, username)")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return jsonError("문의 조회에 실패했습니다.", 500);
  }
  if (!data) {
    return jsonError("문의를 찾을 수 없습니다.", 404);
  }

  const profile = profileFromRow(data as Record<string, unknown>);
  return NextResponse.json({
    inquiry: serializeInquiry({
      ...(data as Inquiry),
      nickname: profile.nickname,
      username: profile.username,
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
  const { status, adminReply } = body as {
    status?: string;
    adminReply?: string;
  };

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  const hasReply =
    typeof adminReply === "string" && adminReply.trim().length > 0;

  if (hasReply) {
    const replyValidation = validateInquiryReply(adminReply);
    if (!replyValidation.valid) {
      return jsonError(replyValidation.error!);
    }
    updates.admin_reply = replyValidation.value;
    updates.replied_at = new Date().toISOString();
  }

  if (typeof status === "string") {
    if (!isInquiryStatus(status)) {
      return jsonError("유효하지 않은 상태입니다.");
    }
    updates.status =
      hasReply && status === "pending" ? "answered" : status;
  } else if (hasReply) {
    updates.status = "answered";
  }

  if (Object.keys(updates).length === 1) {
    return jsonError("변경할 내용이 없습니다.");
  }

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("inquiries")
    .select("user_id, title, admin_reply")
    .eq("id", id)
    .maybeSingle();

  if (!existing) {
    return jsonError("문의를 찾을 수 없습니다.", 404);
  }

  const { data, error } = await admin
    .from("inquiries")
    .update(updates)
    .eq("id", id)
    .select("*, profiles!inquiries_user_id_fkey(nickname, username)")
    .maybeSingle();

  if (error || !data) {
    return jsonError("문의 수정에 실패했습니다.", 500);
  }

  const hadReplyBefore = Boolean(existing.admin_reply);
  if (hasReply && !hadReplyBefore) {
    await notifyInquiryReply({
      userId: existing.user_id as string,
      inquiryId: id,
      title: existing.title as string,
    });
  }

  const profile = profileFromRow(data as Record<string, unknown>);
  return NextResponse.json({
    inquiry: serializeInquiry({
      ...(data as Inquiry),
      nickname: profile.nickname,
      username: profile.username,
    }),
  });
}
