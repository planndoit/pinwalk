export interface VisitRegion {
  code: string;
  name: string;
  sido_code: string;
  sido_name: string;
  first_visited_at: string;
  pin_count: number;
}

export interface VisitStats {
  visited_count: number;
  total_count: number;
  sido_visited_count: number;
  sido_total_count: number;
  regions: VisitRegion[];
}

export interface SigunguProperties {
  SIG_CD: string;
  SIG_KOR_NM: string;
  CTPRVN_CD: string;
  CTP_KOR_NM: string;
}

export interface SigunguFeature {
  type: "Feature";
  properties: SigunguProperties;
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
}

export interface SigunguCollection {
  type: "FeatureCollection";
  features: SigunguFeature[];
}
