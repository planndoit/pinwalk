import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api/auth";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const admin = createAdminClient();
  const { data: groups, error } = await admin
    .from("common_code_groups")
    .select("*")
    .order("group_code", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "공통코드 그룹 조회에 실패했습니다." }, { status: 500 });
  }

  const { data: codes } = await admin
    .from("common_codes")
    .select("*")
    .order("sort_order", { ascending: true });

  return NextResponse.json({
    groups: (groups ?? []).map((g) => ({
      groupCode: g.group_code,
      groupName: g.group_name,
      description: g.description,
      isActive: g.is_active,
    })),
    codes: (codes ?? []).map((c) => ({
      id: c.id,
      groupCode: c.group_code,
      code: c.code,
      name: c.name,
      sortOrder: c.sort_order,
      isActive: c.is_active,
    })),
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
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("common_codes")
    .insert({
      group_code: groupCode,
      code: code.trim().toUpperCase(),
      name: name.trim(),
      sort_order: sortOrder ?? 0,
      is_active: isActive !== false,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error) {
    return jsonError("공통코드 추가에 실패했습니다.");
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
