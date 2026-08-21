import { readFileSync } from "node:fs";
import path from "node:path";
import type {
  SigunguCollection,
  SigunguFeature,
  SigunguProperties,
} from "@/types/visit";

type LngLat = readonly [number, number];
type Ring = LngLat[];
type PolygonRings = Ring[];

interface PreparedFeature {
  properties: SigunguProperties;
  polygons: PolygonRings[];
  minLng: number;
  maxLng: number;
  minLat: number;
  maxLat: number;
}

function asCollection(value: unknown): SigunguCollection {
  const collection = value as SigunguCollection;
  if (
    collection.type !== "FeatureCollection" ||
    !Array.isArray(collection.features)
  ) {
    throw new Error("시군구 GeoJSON이 올바르지 않습니다.");
  }
  return collection;
}

function asLngLat(value: unknown): LngLat | null {
  if (!Array.isArray(value) || value.length < 2) return null;
  const lng = value[0];
  const lat = value[1];
  if (typeof lng !== "number" || typeof lat !== "number") return null;
  return [lng, lat];
}

function asRing(value: unknown): Ring | null {
  if (!Array.isArray(value) || value.length < 4) return null;
  const ring: LngLat[] = [];
  for (const point of value) {
    const lngLat = asLngLat(point);
    if (!lngLat) return null;
    ring.push(lngLat);
  }
  return ring;
}

function asPolygon(value: unknown): PolygonRings | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const rings: Ring[] = [];
  for (const ringValue of value) {
    const ring = asRing(ringValue);
    if (!ring) return null;
    rings.push(ring);
  }
  return rings;
}

function polygonsFromFeature(feature: SigunguFeature): PolygonRings[] {
  if (feature.geometry.type === "Polygon") {
    const polygon = asPolygon(feature.geometry.coordinates);
    return polygon ? [polygon] : [];
  }
  if (feature.geometry.type === "MultiPolygon") {
    const polygons: PolygonRings[] = [];
    if (!Array.isArray(feature.geometry.coordinates)) return [];
    for (const coordinates of feature.geometry.coordinates) {
      const polygon = asPolygon(coordinates);
      if (polygon) polygons.push(polygon);
    }
    return polygons;
  }
  return [];
}

function bboxOfPolygons(polygons: PolygonRings[]) {
  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  for (const polygon of polygons) {
    for (const ring of polygon) {
      for (const [lng, lat] of ring) {
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      }
    }
  }
  return { minLng, maxLng, minLat, maxLat };
}

function pointInRing(lng: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersects =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function pointInPolygon(
  lng: number,
  lat: number,
  polygon: PolygonRings
): boolean {
  const outer = polygon[0];
  if (!outer || !pointInRing(lng, lat, outer)) return false;
  for (let i = 1; i < polygon.length; i++) {
    const hole = polygon[i];
    if (hole && pointInRing(lng, lat, hole)) return false;
  }
  return true;
}

interface SigunguIndex {
  features: PreparedFeature[];
  propertiesByCode: Map<string, SigunguProperties>;
  sidoCodes: Set<string>;
}

let sigunguIndex: SigunguIndex | null = null;

function loadSigunguIndex(): SigunguIndex {
  if (sigunguIndex) return sigunguIndex;

  const filePath = path.join(process.cwd(), "public/geo/korea-sigungu.json");
  const collection = asCollection(
    JSON.parse(readFileSync(filePath, "utf8")) as unknown
  );
  const features = collection.features.map((feature) => {
    const polygons = polygonsFromFeature(feature);
    return {
      properties: feature.properties,
      polygons,
      ...bboxOfPolygons(polygons),
    };
  });

  sigunguIndex = {
    features,
    propertiesByCode: new Map(
      features.map((feature) => [feature.properties.SIG_CD, feature.properties])
    ),
    sidoCodes: new Set(features.map((feature) => feature.properties.CTPRVN_CD)),
  };
  return sigunguIndex;
}

export function getSigunguTotalCount(): number {
  return loadSigunguIndex().features.length;
}

export function getSidoTotalCount(): number {
  return loadSigunguIndex().sidoCodes.size;
}

export function getSigunguByCode(code: string): SigunguProperties | null {
  return loadSigunguIndex().propertiesByCode.get(code) ?? null;
}

export function findSigunguByLatLng(
  lat: number,
  lng: number
): SigunguProperties | null {
  for (const feature of loadSigunguIndex().features) {
    if (
      lng < feature.minLng ||
      lng > feature.maxLng ||
      lat < feature.minLat ||
      lat > feature.maxLat
    ) {
      continue;
    }
    for (const polygon of feature.polygons) {
      if (pointInPolygon(lng, lat, polygon)) {
        return feature.properties;
      }
    }
  }
  return null;
}
