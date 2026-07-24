import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { serializeLandmark } from "@/lib/landmark/serialize";
import { absorbPinsIntoLandmark } from "@/lib/landmark/zone";
import { recomputeLandmarkScores } from "@/lib/landmark/scores";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Landmark } from "@/types/landmark";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("landmarks")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "랜드마크를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  return NextResponse.json({ landmark: serializeLandmark(data as Landmark) });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json();
  const admin = createAdminClient();

  const { data: previous } = await admin
    .from("landmarks")
    .select("*")
    .eq("id", id)
    .single();

  if (!previous) {
    return NextResponse.json(
      { error: "랜드마크를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (typeof body.name === "string" && body.name.trim()) {
    patch.name = body.name.trim();
  }
  if (typeof body.lat === "number") patch.lat = body.lat;
  if (typeof body.lng === "number") patch.lng = body.lng;
  if (body.address !== undefined) patch.address = body.address || null;
  if (body.imageUrl !== undefined) patch.image_url = body.imageUrl || null;
  if (body.tel !== undefined) patch.tel = body.tel || null;
  if (body.overview !== undefined) patch.overview = body.overview || null;
  if (typeof body.radiusMeters === "number" && body.radiusMeters > 0) {
    patch.radius_meters = Math.floor(body.radiusMeters);
  }
  if (typeof body.mapVisible === "boolean") patch.map_visible = body.mapVisible;
  if (typeof body.isClosed === "boolean") patch.is_closed = body.isClosed;
  if (body.adminNote !== undefined) patch.admin_note = body.adminNote || null;

  const { data, error } = await admin
    .from("landmarks")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "랜드마크 저장에 실패했습니다." },
      { status: 500 }
    );
  }

  const landmark = data as Landmark;
  const becameVisible =
    previous.map_visible !== true && landmark.map_visible === true;
  const geometryChanged =
    typeof body.radiusMeters === "number" ||
    typeof body.lat === "number" ||
    typeof body.lng === "number";

  if (becameVisible || (landmark.map_visible && geometryChanged)) {
    await absorbPinsIntoLandmark(landmark);
    await recomputeLandmarkScores(landmark.id);
  }

  return NextResponse.json({ landmark: serializeLandmark(landmark) });
}
