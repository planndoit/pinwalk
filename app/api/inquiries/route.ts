import { NextResponse } from "next/server";
import { getAuthenticatedUser, jsonError } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { serializeInquiry } from "@/lib/inquiry/serialize";
import {
  validateInquiryContent,
  validateInquiryTitle,
} from "@/lib/validation/inquiry";
import {
  buildInquiryEmailHtml,
  sendAdminNotificationEmail,
} from "@/lib/email/send";
import { SERVICE_NAME } from "@/lib/constants";
import type { Inquiry } from "@/types/inquiry";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return jsonError("로그인이 필요합니다.", 401);
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("inquiries")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return jsonError("문의 목록 조회에 실패했습니다.", 500);
  }

  return NextResponse.json({
    inquiries: ((data ?? []) as Inquiry[]).map((row) => serializeInquiry(row)),
  });
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return jsonError("로그인이 필요합니다.", 401);
  }

  const body = await request.json();
  const titleValidation = validateInquiryTitle(
    typeof body.title === "string" ? body.title : ""
  );
  if (!titleValidation.valid) {
    return jsonError(titleValidation.error!);
  }

  const contentValidation = validateInquiryContent(
    typeof body.content === "string" ? body.content : ""
  );
  if (!contentValidation.valid) {
    return jsonError(contentValidation.error!);
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data: profile } = await admin
    .from("profiles")
    .select("nickname, username")
    .eq("id", user.id)
    .maybeSingle();

  const { data, error } = await admin
    .from("inquiries")
    .insert({
      user_id: user.id,
      title: titleValidation.value,
      content: contentValidation.value,
      status: "pending",
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error || !data) {
    return jsonError("문의 등록에 실패했습니다.", 500);
  }

  const nickname = (profile?.nickname as string | undefined) ?? "회원";
  const username =
    typeof profile?.username === "string" ? profile.username : null;

  void sendAdminNotificationEmail({
    subject: `[${SERVICE_NAME}] 문의 접수: ${titleValidation.value}`,
    html: buildInquiryEmailHtml({
      title: titleValidation.value,
      content: contentValidation.value,
      nickname,
      username,
    }),
  });

  return NextResponse.json({
    inquiry: serializeInquiry(data as Inquiry),
  });
}
