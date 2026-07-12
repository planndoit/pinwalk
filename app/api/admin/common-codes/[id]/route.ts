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

  if (
    typeof name !== "string" &&
    typeof sortOrder !== "number" &&
    typeof isActive !== "boolean"
  ) {
    return jsonError("수정할 항목이 없습니다.");
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("admin_upsert_common_code_result", {
    p_id: id,
    p_group_code: null,
    p_code: null,
    p_name: typeof name === "string" ? name : null,
    p_sort_order: typeof sortOrder === "number" ? sortOrder : null,
    p_is_active: typeof isActive === "boolean" ? isActive : null,
    p_mode: "update",
  });

  if (error) {
    if (error.message.includes("common code not found")) {
      return jsonError("수정할 코드를 찾을 수 없습니다.", 404);
    }
    return jsonError(
      `공통코드 수정에 실패했습니다. (${error.message})`,
      500
    );
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return jsonError("공통코드 수정에 실패했습니다.", 500);
  }

  return NextResponse.json({
    code: {
      id: row.id,
      groupCode: row.group_code,
      code: row.code,
      name: row.name,
      sortOrder: row.sort_order,
      isActive: row.is_active,
    },
  });
}
