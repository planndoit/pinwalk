import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { jsonError } from "@/lib/api/auth";
import { dissolveCrew } from "@/lib/crew/actions";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const admin = createAdminClient();
  const { data: crew } = await admin
    .from("crews")
    .select("id, status, leader_id")
    .eq("id", id)
    .maybeSingle();

  if (!crew || crew.status !== "active") {
    return jsonError("활성 크루를 찾을 수 없습니다.", 404);
  }

  const result = await dissolveCrew(id, crew.leader_id as string);
  if (!result.ok) {
    return jsonError(result.error, 500);
  }

  return NextResponse.json({ message: "크루를 강제 해산했습니다." });
}
