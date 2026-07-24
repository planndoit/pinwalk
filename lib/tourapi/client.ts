import { SERVICE_NAME, TOUR_LANDMARK_CONTENT_TYPE_IDS } from "@/lib/constants";
import { getTourApiMobileApp, getTourApiServiceKey } from "@/lib/env";
import type { TourApiLandmarkCandidate } from "@/types/landmark";

const TOUR_API_BASE = "https://apis.data.go.kr/B551011/KorService2";

type TourApiItem = Record<string, unknown>;

export class TourApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TourApiError";
  }
}

function requireServiceKey(): string {
  const key = getTourApiServiceKey();
  if (!key) {
    throw new TourApiError(
      "TOUR_API_SERVICE_KEY가 설정되지 않았습니다. .env.local에 공공데이터포털 인증키를 넣어주세요."
    );
  }
  return key;
}

function asArray(item: unknown): TourApiItem[] {
  if (item == null) return [];
  if (Array.isArray(item)) return item as TourApiItem[];
  if (typeof item === "object") return [item as TourApiItem];
  return [];
}

function str(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function num(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number.parseFloat(String(value));
  return Number.isFinite(n) ? n : null;
}

function mapCandidate(item: TourApiItem): TourApiLandmarkCandidate | null {
  const contentId = str(item.contentid ?? item.contentId);
  const contentTypeId = str(item.contenttypeid ?? item.contentTypeId);
  const name = str(item.title);
  const lat = num(item.mapy ?? item.mapY);
  const lng = num(item.mapx ?? item.mapX);
  if (!contentId || !contentTypeId || !name || lat == null || lng == null) {
    return null;
  }

  const addr1 = str(item.addr1);
  const addr2 = str(item.addr2);
  const address = [addr1, addr2].filter(Boolean).join(" ") || null;

  return {
    contentId,
    contentTypeId,
    name,
    lat,
    lng,
    address,
    imageUrl: str(item.firstimage ?? item.firstImage),
    tel: str(item.tel),
    areaCode: str(item.areacode ?? item.areaCode),
    sigunguCode: str(item.sigungucode ?? item.sigunguCode),
    modifiedTime: str(item.modifiedtime ?? item.modifiedTime),
  };
}

async function tourGet(
  endpoint: string,
  params: Record<string, string | number | undefined>
): Promise<{ items: TourApiItem[]; totalCount: number; pageNo: number; numOfRows: number }> {
  const serviceKey = requireServiceKey();
  const search = new URLSearchParams();
  search.set("MobileOS", "ETC");
  search.set("MobileApp", getTourApiMobileApp() || SERVICE_NAME);
  search.set("_type", "json");

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    search.set(key, String(value));
  }

  // serviceKey는 포털 발급값(인코딩 포함)을 이중 인코딩하지 않도록 따로 붙인다.
  const url = `${TOUR_API_BASE}/${endpoint}?serviceKey=${serviceKey}&${search.toString()}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new TourApiError(`TourAPI HTTP ${res.status}`);
  }

  const json = (await res.json()) as Record<string, unknown>;

  const openApiError = json as {
    OpenAPI_ServiceResponse?: { cmmMsgHeader?: { returnAuthMsg?: string; errMsg?: string } };
  };
  const authMsg =
    openApiError.OpenAPI_ServiceResponse?.cmmMsgHeader?.returnAuthMsg ??
    openApiError.OpenAPI_ServiceResponse?.cmmMsgHeader?.errMsg;
  if (authMsg) {
    throw new TourApiError(`TourAPI 인증 오류: ${authMsg}`);
  }

  const response = json.response as
    | {
        header?: { resultCode?: string; resultMsg?: string };
        body?: {
          items?: { item?: unknown };
          totalCount?: number | string;
          pageNo?: number | string;
          numOfRows?: number | string;
        };
      }
    | undefined;

  const resultCode = response?.header?.resultCode;
  if (resultCode && resultCode !== "0000") {
    throw new TourApiError(
      `TourAPI 오류(${resultCode}): ${response?.header?.resultMsg ?? "unknown"}`
    );
  }

  const body = response?.body;
  const items = asArray(body?.items?.item);
  return {
    items,
    totalCount: Number(body?.totalCount ?? items.length) || 0,
    pageNo: Number(body?.pageNo ?? 1) || 1,
    numOfRows: Number(body?.numOfRows ?? items.length) || 0,
  };
}

function defaultContentTypeIds(contentTypeId?: string): string[] {
  if (contentTypeId) return [contentTypeId];
  return [...TOUR_LANDMARK_CONTENT_TYPE_IDS];
}

async function searchLandmarkCandidates(
  endpoint: string,
  baseParams: Record<string, string | number | undefined>,
  contentTypeId?: string
): Promise<{
  candidates: TourApiLandmarkCandidate[];
  totalCount: number;
  pageNo: number;
  numOfRows: number;
  hasMore: boolean;
}> {
  const typeIds = defaultContentTypeIds(contentTypeId);
  const byId = new Map<string, TourApiLandmarkCandidate>();
  let totalCount = 0;
  let pageNo = Number(baseParams.pageNo ?? 1) || 1;
  const requestedRows = Number(baseParams.numOfRows ?? 20) || 20;
  let numOfRows = requestedRows;
  let hasMore = false;

  for (const typeId of typeIds) {
    const result = await tourGet(endpoint, {
      ...baseParams,
      contentTypeId: typeId,
    });
    totalCount += result.totalCount;
    pageNo = result.pageNo;
    numOfRows = result.numOfRows || requestedRows;
    if (pageNo * requestedRows < result.totalCount) {
      hasMore = true;
    }
    for (const item of result.items) {
      const candidate = mapCandidate(item);
      if (candidate) byId.set(candidate.contentId, candidate);
    }
  }

  return {
    candidates: [...byId.values()],
    totalCount,
    pageNo,
    numOfRows,
    hasMore,
  };
}

export async function searchTourByKeyword(params: {
  keyword: string;
  pageNo?: number;
  numOfRows?: number;
  contentTypeId?: string;
}): Promise<{
  candidates: TourApiLandmarkCandidate[];
  totalCount: number;
  pageNo: number;
  numOfRows: number;
  hasMore: boolean;
}> {
  const keyword = params.keyword.trim();
  if (!keyword) {
    throw new TourApiError("검색어를 입력해주세요.");
  }

  return searchLandmarkCandidates(
    "searchKeyword2",
    {
      keyword,
      pageNo: params.pageNo ?? 1,
      numOfRows: params.numOfRows ?? 20,
      arrange: "A",
    },
    params.contentTypeId
  );
}

export async function searchTourByArea(params: {
  areaCode: string;
  sigunguCode?: string;
  pageNo?: number;
  numOfRows?: number;
  contentTypeId?: string;
}): Promise<{
  candidates: TourApiLandmarkCandidate[];
  totalCount: number;
  pageNo: number;
  numOfRows: number;
  hasMore: boolean;
}> {
  if (!params.areaCode) {
    throw new TourApiError("지역을 선택해주세요.");
  }

  return searchLandmarkCandidates(
    "areaBasedList2",
    {
      areaCode: params.areaCode,
      sigunguCode: params.sigunguCode,
      pageNo: params.pageNo ?? 1,
      numOfRows: params.numOfRows ?? 20,
      arrange: "A",
    },
    params.contentTypeId
  );
}

export async function searchTourByLocation(params: {
  lat: number;
  lng: number;
  radiusMeters?: number;
  pageNo?: number;
  numOfRows?: number;
  contentTypeId?: string;
}): Promise<{
  candidates: TourApiLandmarkCandidate[];
  totalCount: number;
  pageNo: number;
  numOfRows: number;
  hasMore: boolean;
}> {
  if (!Number.isFinite(params.lat) || !Number.isFinite(params.lng)) {
    throw new TourApiError("유효한 좌표가 필요합니다.");
  }

  const radius = Math.min(Math.max(params.radiusMeters ?? 3000, 1), 20000);

  return searchLandmarkCandidates(
    "locationBasedList2",
    {
      mapX: params.lng,
      mapY: params.lat,
      radius,
      pageNo: params.pageNo ?? 1,
      numOfRows: params.numOfRows ?? 20,
      arrange: "E",
    },
    params.contentTypeId
  );
}

export async function fetchTourDetailCommon(contentId: string): Promise<{
  contentId: string;
  contentTypeId: string | null;
  name: string | null;
  lat: number | null;
  lng: number | null;
  address: string | null;
  imageUrl: string | null;
  tel: string | null;
  overview: string | null;
  areaCode: string | null;
  sigunguCode: string | null;
  modifiedTime: string | null;
}> {
  const result = await tourGet("detailCommon2", { contentId });
  const item = result.items[0];
  if (!item) {
    throw new TourApiError("상세 정보를 찾을 수 없습니다.");
  }

  const addr1 = str(item.addr1);
  const addr2 = str(item.addr2);

  return {
    contentId: str(item.contentid ?? item.contentId) ?? contentId,
    contentTypeId: str(item.contenttypeid ?? item.contentTypeId),
    name: str(item.title),
    lat: num(item.mapy ?? item.mapY),
    lng: num(item.mapx ?? item.mapX),
    address: [addr1, addr2].filter(Boolean).join(" ") || null,
    imageUrl: str(item.firstimage ?? item.firstImage),
    tel: str(item.tel),
    overview: str(item.overview),
    areaCode: str(item.areacode ?? item.areaCode),
    sigunguCode: str(item.sigungucode ?? item.sigunguCode),
    modifiedTime: str(item.modifiedtime ?? item.modifiedTime),
  };
}
