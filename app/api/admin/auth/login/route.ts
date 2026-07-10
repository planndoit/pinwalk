import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api/auth";
import { loginAdmin } from "@/lib/admin/auth";

export async function POST(request: Request) {
  const body = await request.json();
  const { username, password } = body as {
    username?: string;
    password?: string;
  };

  if (!username || !password) {
    return jsonError("아이디와 비밀번호를 입력해주세요.");
  }

  const result = await loginAdmin(username, password);
  if (!result.success) {
    return jsonError(result.error!, 401);
  }

  return NextResponse.json({ message: "로그인되었습니다." });
}
