import { NextResponse } from "next/server";
import { getAuthenticatedUser, jsonError } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { serializeInquiry } from "@/lib/inquiry/serialize";
import type { Inquiry } from "@/types/inquiry";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return jsonError("로그인이 필요합니다.", 401);
  }

  const { id } = await params;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("inquiries")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return jsonError("문의 조회에 실패했습니다.", 500);
  }
  if (!data) {
    return jsonError("문의를 찾을 수 없습니다.", 404);
  }

  return NextResponse.json({
    inquiry: serializeInquiry(data as Inquiry),
  });
}
