import type { Landmark, SerializedLandmark } from "@/types/landmark";

export function serializeLandmark(
  row: Landmark,
  extra?: {
    titleHolderNickname?: string | null;
    titleHolderScore?: number | null;
  }
): SerializedLandmark {
  return {
    id: row.id,
    source: row.source,
    tourContentId: row.tour_content_id,
    tourContentTypeId: row.tour_content_type_id,
    name: row.name,
    lat: row.lat,
    lng: row.lng,
    address: row.address,
    imageUrl: row.image_url,
    tel: row.tel,
    overview: row.overview,
    areaCode: row.area_code,
    sigunguCode: row.sigungu_code,
    sourceModifiedAt: row.source_modified_at,
    radiusMeters: row.radius_meters,
    mapVisible: row.map_visible,
    isClosed: row.is_closed,
    adminNote: row.admin_note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    titleHolderNickname: extra?.titleHolderNickname ?? null,
    titleHolderScore: extra?.titleHolderScore ?? null,
  };
}
