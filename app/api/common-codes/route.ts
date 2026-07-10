import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { serializeCommonCode } from "@/lib/premium/serialize";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const groupCode = searchParams.get("group");

  const admin = createAdminClient();
  let query = admin
    .from("common_codes")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (groupCode) {
    query = query.eq("group_code", groupCode);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: "공통코드 조회에 실패했습니다." }, { status: 500 });
  }

  return NextResponse.json({
    codes: (data ?? []).map(serializeCommonCode),
  });
}
