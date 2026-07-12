import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api/auth";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { createAdminClient } from "@/lib/supabase/admin";

function mapCode(row: {
  id: string;
  group_code: string;
  code: string;
  name: string;
  sort_order: number;
  is_active: boolean;
}) {
  return {
    id: row.id,
    groupCode: row.group_code,
    code: row.code,
    name: row.name,
    sortOrder: row.sort_order,
    isActive: row.is_active,
  };
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const admin = createAdminClient();
  const { data: groups, error } = await admin
    .from("common_code_groups")
    .select("*")
    .order("group_code", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: "공통코드 그룹 조회에 실패했습니다." },
      { status: 500 }
    );
  }

  const { data: codes, error: codesError } = await admin.rpc(
    "admin_list_common_codes"
  );

  if (codesError) {
    // 마이그레이션 전이면 테이블 조회로 폴백
    const { data: fallbackCodes, error: fallbackError } = await admin
      .from("common_codes")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("code", { ascending: true });

    if (fallbackError) {
      return NextResponse.json(
        { error: "공통코드 조회에 실패했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      groups: (groups ?? []).map((g) => ({
        groupCode: g.group_code,
        groupName: g.group_name,
        description: g.description,
        isActive: g.is_active,
      })),
      codes: (fallbackCodes ?? []).map(mapCode),
    });
  }

  return NextResponse.json({
    groups: (groups ?? []).map((g) => ({
      groupCode: g.group_code,
      groupName: g.group_name,
      description: g.description,
      isActive: g.is_active,
    })),
    codes: (codes ?? []).map(mapCode),
  });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const { groupCode, code, name, sortOrder, isActive } = body as {
    groupCode?: string;
    code?: string;
    name?: string;
    sortOrder?: number;
    isActive?: boolean;
  };

  if (!groupCode || !code?.trim() || !name?.trim()) {
    return jsonError("그룹, 코드, 이름을 입력해주세요.");
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("admin_upsert_common_code_result", {
    p_id: null,
    p_group_code: groupCode,
    p_code: code,
    p_name: name,
    p_sort_order:
      typeof sortOrder === "number" && !Number.isNaN(sortOrder)
        ? sortOrder
        : null,
    p_is_active: isActive !== false,
    p_mode: "insert",
  });

  if (error) {
    if (error.message.includes("duplicate code")) {
      return jsonError("이미 같은 코드가 이 그룹에 있습니다.");
    }
    return jsonError(
      `공통코드 추가에 실패했습니다. (${error.message})`,
      500
    );
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return jsonError("공통코드 추가에 실패했습니다.", 500);
  }

  return NextResponse.json({ code: mapCode(row) });
}

export async function PUT(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const { groupCode, orderedIds } = body as {
    groupCode?: string;
    orderedIds?: string[];
  };

  if (!groupCode || !Array.isArray(orderedIds) || orderedIds.length === 0) {
    return jsonError("정렬할 코드 목록이 올바르지 않습니다.");
  }

  const admin = createAdminClient();
  const { error } = await admin.rpc("admin_reorder_common_codes", {
    p_group_code: groupCode,
    p_ordered_ids: orderedIds,
  });

  if (error) {
    return jsonError(
      `코드 순서 저장에 실패했습니다. (${error.message})`,
      500
    );
  }

  return NextResponse.json({ ok: true });
}
