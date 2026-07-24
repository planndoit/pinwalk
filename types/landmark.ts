export type LandmarkSource = "tourapi" | "manual";

export interface Landmark {
  id: string;
  source: LandmarkSource;
  tour_content_id: string | null;
  tour_content_type_id: string | null;
  name: string;
  lat: number;
  lng: number;
  address: string | null;
  image_url: string | null;
  tel: string | null;
  overview: string | null;
  area_code: string | null;
  sigungu_code: string | null;
  source_modified_at: string | null;
  radius_meters: number;
  map_visible: boolean;
  is_closed: boolean;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface SerializedLandmark {
  id: string;
  source: LandmarkSource;
  tourContentId: string | null;
  tourContentTypeId: string | null;
  name: string;
  lat: number;
  lng: number;
  address: string | null;
  imageUrl: string | null;
  tel: string | null;
  overview: string | null;
  areaCode: string | null;
  sigunguCode: string | null;
  sourceModifiedAt: string | null;
  radiusMeters: number;
  mapVisible: boolean;
  isClosed: boolean;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
  titleHolderNickname?: string | null;
  titleHolderScore?: number | null;
}

export interface LandmarkRankingEntry {
  rank: number;
  userId: string;
  nickname: string;
  score: number;
  scoreReachedAt: string;
}

export interface TourApiLandmarkCandidate {
  contentId: string;
  contentTypeId: string;
  name: string;
  lat: number;
  lng: number;
  address: string | null;
  imageUrl: string | null;
  tel: string | null;
  areaCode: string | null;
  sigunguCode: string | null;
  modifiedTime: string | null;
}
