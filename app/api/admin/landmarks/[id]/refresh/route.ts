import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { TourApiError, fetchTourDetailCommon } from "@/lib/tourapi/client";
import { serializeLandmark } from "@/lib/landmark/serialize";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Landmark } from "@/types/landmark";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const admin = createAdminClient();
  const { data: existing, error: loadError } = await admin
    .from("landmarks")
    .select("*")
    .eq("id", id)
    .single();

  if (loadError || !existing) {
    return NextResponse.json(
      { error: "랜드마크를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  const landmark = existing as Landmark;
  if (!landmark.tour_content_id) {
    return NextResponse.json(
      { error: "TourAPI contentId가 없는 수동 등록 랜드마크입니다." },
      { status: 400 }
    );
  }

  try {
    const detail = await fetchTourDetailCommon(landmark.tour_content_id);
    const patch = {
      name: detail.name ?? landmark.name,
      lat: detail.lat ?? landmark.lat,
      lng: detail.lng ?? landmark.lng,
      address: detail.address ?? landmark.address,
      image_url: detail.imageUrl ?? landmark.image_url,
      tel: detail.tel ?? landmark.tel,
      overview: detail.overview ?? landmark.overview,
      tour_content_type_id:
        detail.contentTypeId ?? landmark.tour_content_type_id,
      area_code: detail.areaCode ?? landmark.area_code,
      sigungu_code: detail.sigunguCode ?? landmark.sigungu_code,
      source_modified_at: detail.modifiedTime ?? landmark.source_modified_at,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await admin
      .from("landmarks")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "상세 정보 반영에 실패했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json({ landmark: serializeLandmark(data as Landmark) });
  } catch (error) {
    const message =
      error instanceof TourApiError
        ? error.message
        : "TourAPI 상세 조회에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
