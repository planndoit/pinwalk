import { getNaverMapClientId, getNaverMapClientSecret } from "@/lib/env";

interface GeocodeResult {
  lat: number;
  lng: number;
  roadAddress: string;
  jibunAddress: string;
}

interface NaverGeocodeResponse {
  addresses?: Array<{
    x: string;
    y: string;
    roadAddress?: string;
    jibunAddress?: string;
  }>;
  errorMessage?: string;
}

export async function geocodeAddress(
  query: string
): Promise<{ success: true; result: GeocodeResult } | { success: false; error: string }> {
  const clientId = getNaverMapClientId();
  const clientSecret = getNaverMapClientSecret();

  if (!clientId || !clientSecret) {
    return {
      success: false,
      error: "주소 검색 API 설정이 완료되지 않았습니다.",
    };
  }

  const url = new URL("https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode");
  url.searchParams.set("query", query);

  const res = await fetch(url.toString(), {
    headers: {
      "X-NCP-APIGW-API-KEY-ID": clientId,
      "X-NCP-APIGW-API-KEY": clientSecret,
    },
  });

  if (!res.ok) {
    return { success: false, error: "주소 검색에 실패했습니다." };
  }

  const data = (await res.json()) as NaverGeocodeResponse;
  const first = data.addresses?.[0];

  if (!first) {
    return { success: false, error: "검색 결과가 없습니다. 도로명 주소를 확인해주세요." };
  }

  const lat = Number.parseFloat(first.y);
  const lng = Number.parseFloat(first.x);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { success: false, error: "주소 좌표 변환에 실패했습니다." };
  }

  return {
    success: true,
    result: {
      lat,
      lng,
      roadAddress: first.roadAddress ?? query,
      jibunAddress: first.jibunAddress ?? "",
    },
  };
}
