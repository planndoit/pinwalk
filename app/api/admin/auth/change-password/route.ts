import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api/auth";
import { changeAdminPassword, isAdminAuthenticated } from "@/lib/admin/auth";

export async function POST(request: Request) {
  const authenticated = await isAdminAuthenticated();
  if (!authenticated) {
    return jsonError("관리자 인증이 필요합니다.", 401);
  }

  const body = await request.json();
  const { currentPassword, newPassword } = body as {
    currentPassword?: string;
    newPassword?: string;
  };

  if (!currentPassword || !newPassword) {
    return jsonError("현재 비밀번호와 새 비밀번호를 입력해주세요.");
  }

  const result = await changeAdminPassword(currentPassword, newPassword);
  if (!result.success) {
    return jsonError(result.error!);
  }

  return NextResponse.json({ message: "비밀번호가 변경되었습니다." });
}
