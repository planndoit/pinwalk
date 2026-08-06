import { NextResponse } from "next/server";
import { getAuthenticatedUser, jsonError } from "@/lib/api/auth";
import { dissolveCrew } from "@/lib/crew/actions";
import { getActiveMembership } from "@/lib/crew/membership";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return jsonError("로그인이 필요합니다.", 401);
  }

  const { id: crewId } = await params;
  const membership = await getActiveMembership(user.id);
  if (
    !membership ||
    membership.crew.id !== crewId ||
    membership.role !== "leader"
  ) {
    return jsonError("리더만 해산할 수 있습니다.", 403);
  }

  const result = await dissolveCrew(crewId, user.id);
  if (!result.ok) {
    return jsonError(result.error, 500);
  }

  return NextResponse.json({ message: "크루를 해산했습니다." });
}
