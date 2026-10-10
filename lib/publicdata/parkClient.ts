import { getTourApiServiceKey } from "@/lib/env";
import type { ParkLandmarkCandidate } from "@/types/landmark";

const PARK_API_URL =
  "https://api.data.go.kr/openapi/tn_pubr_public_cty_park_info_api";

const PARK_API_MAX_ROWS = 1000;
const PARK_API_NODATA_CODE = "03";

type ParkApiItem = Record<string, unknown>;

export class ParkApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ParkApiError";
  }
}

export interface ParkSearchParams {
  provider?: string;
  name?: string;
  parkType?: string;
  pageNo?: number;
  numOfRows?: number;
}

export interface ParkSearchResult {
  candidates: ParkLandmarkCandidate[];
  totalCount: number;
  pageNo: number;
  numOfRows: number;
  hasMore: boolean;
}

function requireServiceKey(): string {
  const key = getTourApiServiceKey();
  if (!key) {
    throw new ParkApiError(
      "TOUR_API_SERVICE_KEY가 설정되지 않았습니다. .env.local에 공공데이터포털 인증키를 넣어주세요."
    );
  }
  return key;
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

export function getParkCandidateKey(manageNo: string, name: string): string {
  return `${manageNo}:${name}`;
}

function mapCandidate(item: ParkApiItem): ParkLandmarkCandidate | null {
  const manageNo = str(item.manageNo);
  const name = str(item.parkNm);
  const lat = num(item.latitude);
  const lng = num(item.longitude);
  if (!manageNo || !name || lat == null || lng == null) {
    return null;
  }

  return {
    key: getParkCandidateKey(manageNo, name),
    manageNo,
    name,
    parkType: str(item.parkSe),
    lat,
    lng,
    address: str(item.rdnmadr) ?? str(item.lnmadr),
    areaSquareMeters: num(item.parkAr),
    facilities: {
      sports: str(item.mvmFclty),
      play: str(item.amsmtFclty),
      convenience: str(item.cnvnncFclty),
      culture: str(item.cltrFclty),
      etc: str(item.etcFclty),
    },
    providerName: str(item.insttNm),
    referenceDate: str(item.referenceDate),
  };
}

/** 같은 공원이 여러 제공기관으로 중복 등록되므로 기준일자가 최신인 것만 남긴다. */
export function dedupeParkCandidates(
  candidates: ParkLandmarkCandidate[]
): ParkLandmarkCandidate[] {
  const byKey = new Map<string, ParkLandmarkCandidate>();
  for (const candidate of candidates) {
    const current = byKey.get(candidate.key);
    if (
      !current ||
      (candidate.referenceDate ?? "") > (current.referenceDate ?? "")
    ) {
      byKey.set(candidate.key, candidate);
    }
  }
  return [...byKey.values()];
}

export async function searchParks(
  params: ParkSearchParams
): Promise<ParkSearchResult> {
  const serviceKey = requireServiceKey();
  const pageNo = Math.max(1, params.pageNo ?? 1);
  const numOfRows = Math.min(
    PARK_API_MAX_ROWS,
    Math.max(1, params.numOfRows ?? 50)
  );

  const search = new URLSearchParams({
    type: "json",
    pageNo: String(pageNo),
    numOfRows: String(numOfRows),
  });
  const provider = params.provider?.trim();
  const name = params.name?.trim();
  const parkType = params.parkType?.trim();
  if (provider) search.set("instt_nm", provider);
  if (name) search.set("PARK_NM", name);
  if (parkType) search.set("PARK_SE", parkType);

  // serviceKey는 포털 발급값(인코딩 포함)을 이중 인코딩하지 않도록 따로 붙인다.
  const url = `${PARK_API_URL}?serviceKey=${serviceKey}&${search.toString()}`;
  const res = await fetch(url, { cache: "no-store" });

  let json: Record<string, unknown>;
  try {
    json = (await res.json()) as Record<string, unknown>;
  } catch {
    throw new ParkApiError(`공원 API HTTP ${res.status}`);
  }

  const openApiError = json as {
    OpenAPI_ServiceResponse?: {
      cmmMsgHeader?: { returnAuthMsg?: string; errMsg?: string };
    };
  };
  const authMsg =
    openApiError.OpenAPI_ServiceResponse?.cmmMsgHeader?.returnAuthMsg ??
    openApiError.OpenAPI_ServiceResponse?.cmmMsgHeader?.errMsg;
  if (authMsg) {
    throw new ParkApiError(`공원 API 인증 오류: ${authMsg}`);
  }
  if (!res.ok) {
    throw new ParkApiError(`공원 API HTTP ${res.status}`);
  }

  const header = json.header as
    | { resultCode?: string; resultMsg?: string }
    | undefined;
  const resultCode = header?.resultCode;
  if (resultCode === PARK_API_NODATA_CODE) {
    return { candidates: [], totalCount: 0, pageNo, numOfRows, hasMore: false };
  }
  if (resultCode !== "00") {
    throw new ParkApiError(
      `공원 API 오류(${resultCode ?? "unknown"}): ${header?.resultMsg ?? "unknown"}`
    );
  }

  const body = json.body as
    | {
        items?: { item?: unknown };
        totalCount?: number | string;
      }
    | undefined;
  const rawItems = body?.items?.item;
  const items: ParkApiItem[] = Array.isArray(rawItems)
    ? (rawItems as ParkApiItem[])
    : rawItems && typeof rawItems === "object"
      ? [rawItems as ParkApiItem]
      : [];
  const totalCount = Number(body?.totalCount ?? items.length) || 0;

  const candidates = dedupeParkCandidates(
    items
      .map(mapCandidate)
      .filter((c): c is ParkLandmarkCandidate => c !== null)
  );

  return {
    candidates,
    totalCount,
    pageNo,
    numOfRows,
    hasMore: pageNo * numOfRows < totalCount,
  };
}
