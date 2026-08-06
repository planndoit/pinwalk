import { NextResponse } from "next/server";
import { getCrewByInviteToken } from "@/lib/crew/invite";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token) {
    return NextResponse.json(
      { error: "초대 링크가 올바르지 않습니다." },
      { status: 400 }
    );
  }

  const crew = await getCrewByInviteToken(token);
  if (!crew) {
    return NextResponse.json(
      { error: "크루를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  return NextResponse.json({ crew });
}
