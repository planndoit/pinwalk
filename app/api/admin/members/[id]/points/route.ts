import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api/auth";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { addPoints } from "@/lib/pins";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json();
  const { amount, reason } = body as { amount?: number; reason?: string };

  if (typeof amount !== "number" || amount <= 0 || !Number.isInteger(amount)) {
    return jsonError("지급 포인트는 1 이상의 정수여야 합니다.");
  }
  if (!reason?.trim()) {
    return jsonError("지급 명목을 입력해주세요.");
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (!profile) {
    return jsonError("회원을 찾을 수 없습니다.", 404);
  }

  const result = await addPoints(
    id,
    amount,
    "admin_adjust",
    `관리자 지급: ${reason.trim()}`
  );

  if (!result.success) {
    return jsonError(result.error!, 500);
  }

  return NextResponse.json({
    message: "포인트가 지급되었습니다.",
    newPoints: result.newPoints,
  });
}
