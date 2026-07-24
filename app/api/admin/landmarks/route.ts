import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { DEFAULT_LANDMARK_RADIUS_METERS } from "@/lib/constants";
import { getLandmarkRadiusMeters } from "@/lib/env";
import { serializeLandmark } from "@/lib/landmark/serialize";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Landmark } from "@/types/landmark";

function splitCsv(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const address = searchParams.get("address")?.trim() ?? "";
  const visibleValues = splitCsv(searchParams.get("visible"));
  const closedValues = splitCsv(searchParams.get("closed"));
  const areaCodes = splitCsv(searchParams.get("areaCode"));
  const contentTypeIds = splitCsv(searchParams.get("contentTypeId"));
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(
    100,
    Math.max(1, Number.parseInt(searchParams.get("limit") ?? "50", 10))
  );
  const offset = (page - 1) * limit;

  const admin = createAdminClient();
  let query = admin
    .from("landmarks")
    .select("*", { count: "exact" })
    .order("updated_at", { ascending: false })
    .order("id", { ascending: false })
    .range(offset, offset + limit - 1);

  if (q) {
    query = query.ilike("name", `%${q}%`);
  }

  if (address) {
    query = query.ilike("address", `%${address}%`);
  }

  if (areaCodes.length === 1) {
    query = query.eq("area_code", areaCodes[0]);
  } else if (areaCodes.length > 1) {
    query = query.in("area_code", areaCodes);
  }

  if (contentTypeIds.length === 1) {
    query = query.eq("tour_content_type_id", contentTypeIds[0]);
  } else if (contentTypeIds.length > 1) {
    query = query.in("tour_content_type_id", contentTypeIds);
  }

  const wantsVisible = visibleValues.includes("true");
  const wantsHidden = visibleValues.includes("false");
  if (wantsVisible && !wantsHidden) {
    query = query.eq("map_visible", true);
  } else if (!wantsVisible && wantsHidden) {
    query = query.eq("map_visible", false);
  }

  const wantsClosed = closedValues.includes("true");
  const wantsOpen = closedValues.includes("false");
  if (wantsClosed && !wantsOpen) {
    query = query.eq("is_closed", true);
  } else if (!wantsClosed && wantsOpen) {
    query = query.eq("is_closed", false);
  }

  const { data, error, count } = await query;
  if (error) {
    return NextResponse.json(
      { error: "랜드마크 조회에 실패했습니다." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    landmarks: ((data ?? []) as Landmark[]).map((row) => serializeLandmark(row)),
    total: count ?? 0,
    page,
    limit,
    hasMore: offset + (data?.length ?? 0) < (count ?? 0),
    defaultRadiusMeters: getLandmarkRadiusMeters(),
  });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const {
    name,
    lat,
    lng,
    address,
    imageUrl,
    tel,
    overview,
    radiusMeters,
    mapVisible,
    isClosed,
    adminNote,
  } = body;

  if (!name || typeof lat !== "number" || typeof lng !== "number") {
    return NextResponse.json(
      { error: "이름과 지도 위치가 필요합니다." },
      { status: 400 }
    );
  }

  const radius =
    typeof radiusMeters === "number" && radiusMeters > 0
      ? Math.floor(radiusMeters)
      : getLandmarkRadiusMeters() || DEFAULT_LANDMARK_RADIUS_METERS;

  const now = new Date().toISOString();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("landmarks")
    .insert({
      source: "manual",
      tour_content_id: null,
      tour_content_type_id: null,
      name: String(name).trim(),
      lat,
      lng,
      address: address ?? null,
      image_url: imageUrl ?? null,
      tel: tel ?? null,
      overview: overview ?? null,
      area_code: null,
      sigungu_code: null,
      source_modified_at: null,
      radius_meters: radius,
      map_visible: mapVisible === true,
      is_closed: isClosed === true,
      admin_note: adminNote ?? null,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "랜드마크 등록에 실패했습니다." },
      { status: 500 }
    );
  }

  return NextResponse.json({ landmark: serializeLandmark(data as Landmark) });
}
