export type LandmarkSource = "tourapi" | "manual" | "park";

export interface Landmark {
  id: string;
  source: LandmarkSource;
  tour_content_id: string | null;
  tour_content_type_id: string | null;
  park_manage_no: string | null;
  park_source_name: string | null;
  park_type: string | null;
  park_area_sqm: number | null;
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
  parkManageNo: string | null;
  parkType: string | null;
  parkAreaSqm: number | null;
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
  subjectType: "user" | "crew";
  subjectId: string;
  userId?: string | null;
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

export interface ParkFacilities {
  sports: string | null;
  play: string | null;
  convenience: string | null;
  culture: string | null;
  etc: string | null;
}

export interface ParkLandmarkCandidate {
  /** manageNo + 원본 공원명. 관리번호만으로는 중복된다. */
  key: string;
  manageNo: string;
  name: string;
  parkType: string | null;
  lat: number;
  lng: number;
  address: string | null;
  areaSquareMeters: number | null;
  facilities: ParkFacilities;
  providerName: string | null;
  referenceDate: string | null;
}
