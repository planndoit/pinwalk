import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api/auth";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json();
  const { name, sortOrder, isActive } = body as {
    name?: string;
    sortOrder?: number;
    isActive?: boolean;
  };

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (typeof name === "string") updates.name = name.trim();
  if (typeof sortOrder === "number") updates.sort_order = sortOrder;
  if (typeof isActive === "boolean") updates.is_active = isActive;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("common_codes")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    return jsonError("공통코드 수정에 실패했습니다.", 500);
  }

  return NextResponse.json({
    code: {
      id: data.id,
      groupCode: data.group_code,
      code: data.code,
      name: data.name,
      sortOrder: data.sort_order,
      isActive: data.is_active,
    },
  });
}
