import type { Pin } from "@/types/pin";

export interface LatLngPoint {
  lat: number;
  lng: number;
}

export interface GeoBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface ItemCluster<T extends LatLngPoint> {
  lat: number;
  lng: number;
  items: T[];
  count: number;
}

export interface PinCluster {
  lat: number;
  lng: number;
  pins: Pin[];
  count: number;
}

export interface ProjectedPoint<T extends LatLngPoint> {
  item: T;
  x: number;
  y: number;
}

interface MapProjection {
  fromCoordToOffset: (coord: { lat: () => number; lng: () => number }) => {
    x: number;
    y: number;
  };
}

export const PIN_TEXT_VISIBLE_ZOOM = 15;
export const PIN_TEXT_SPARSE_ZOOM = 13;
export const PIN_RADIUS_CIRCLE_ZOOM = 17;
export const SPARSE_NEARBY_RADIUS_PX = 110;
export const SPARSE_NEARBY_MAX_COUNT = 3;
export const VIEWPORT_BOUNDS_PAD_RATIO = 0.3;

export function shouldShowPinText(
  zoom: number,
  clusterCount: number,
  nearbyCount: number
): boolean {
  if (zoom >= PIN_TEXT_VISIBLE_ZOOM) {
    return true;
  }

  if (
    zoom >= PIN_TEXT_SPARSE_ZOOM &&
    clusterCount === 1 &&
    nearbyCount <= SPARSE_NEARBY_MAX_COUNT
  ) {
    return true;
  }

  return false;
}

/** nearby 개수가 shouldShowPinText 결과에 영향을 주는 줌 구간인지. */
export function needsSparseNearbyCount(zoom: number): boolean {
  return zoom >= PIN_TEXT_SPARSE_ZOOM && zoom < PIN_TEXT_VISIBLE_ZOOM;
}

export function padGeoBounds(
  bounds: GeoBounds,
  padRatio = VIEWPORT_BOUNDS_PAD_RATIO
): GeoBounds {
  const latPad = Math.max((bounds.maxLat - bounds.minLat) * padRatio, 0.0001);
  const lngPad = Math.max((bounds.maxLng - bounds.minLng) * padRatio, 0.0001);
  return {
    minLat: bounds.minLat - latPad,
    maxLat: bounds.maxLat + latPad,
    minLng: bounds.minLng - lngPad,
    maxLng: bounds.maxLng + lngPad,
  };
}

export function filterPointsInBounds<T extends LatLngPoint>(
  points: T[],
  bounds: GeoBounds
): T[] {
  const { minLat, maxLat, minLng, maxLng } = bounds;
  return points.filter(
    (point) =>
      point.lat >= minLat &&
      point.lat <= maxLat &&
      point.lng >= minLng &&
      point.lng <= maxLng
  );
}

export function projectPoints<T extends LatLngPoint>(
  points: T[],
  projection: MapProjection,
  createLatLng: (
    lat: number,
    lng: number
  ) => { lat: () => number; lng: () => number }
): ProjectedPoint<T>[] {
  return points.map((item) => {
    const offset = projection.fromCoordToOffset(
      createLatLng(item.lat, item.lng)
    );
    return { item, x: offset.x, y: offset.y };
  });
}

export function countNearbyProjected(
  center: { x: number; y: number },
  projected: Array<{ x: number; y: number }>,
  radiusPx: number
): number {
  const radiusSq = radiusPx * radiusPx;
  let count = 0;

  for (const other of projected) {
    const dx = other.x - center.x;
    const dy = other.y - center.y;
    if (dx * dx + dy * dy <= radiusSq) {
      count++;
    }
  }

  return count;
}

export function countNearbyPoints<T extends LatLngPoint>(
  point: T,
  points: T[],
  projection: MapProjection,
  createLatLng: (
    lat: number,
    lng: number
  ) => { lat: () => number; lng: () => number },
  radiusPx: number
): number {
  const projected = projectPoints(points, projection, createLatLng);
  const center = projection.fromCoordToOffset(
    createLatLng(point.lat, point.lng)
  );
  return countNearbyProjected(center, projected, radiusPx);
}

export function countNearbyPins(
  pin: Pin,
  pins: Pin[],
  projection: MapProjection,
  createLatLng: (
    lat: number,
    lng: number
  ) => { lat: () => number; lng: () => number },
  radiusPx: number
): number {
  return countNearbyPoints(pin, pins, projection, createLatLng, radiusPx);
}

export function getItemsClusterBounds<T extends LatLngPoint>(
  items: T[]
): GeoBounds {
  let minLat = items[0].lat;
  let maxLat = items[0].lat;
  let minLng = items[0].lng;
  let maxLng = items[0].lng;

  for (const item of items) {
    minLat = Math.min(minLat, item.lat);
    maxLat = Math.max(maxLat, item.lat);
    minLng = Math.min(minLng, item.lng);
    maxLng = Math.max(maxLng, item.lng);
  }

  return { minLat, maxLat, minLng, maxLng };
}

export function getClusterBounds(cluster: PinCluster): GeoBounds {
  return getItemsClusterBounds(cluster.pins);
}

export function expandClusterBounds(
  bounds: GeoBounds,
  minSpanDegrees = 0.004
): GeoBounds {
  const latMid = (bounds.minLat + bounds.maxLat) / 2;
  const lngMid = (bounds.minLng + bounds.maxLng) / 2;
  const latSpan = Math.max(bounds.maxLat - bounds.minLat, minSpanDegrees);
  const lngSpan = Math.max(bounds.maxLng - bounds.minLng, minSpanDegrees);

  return {
    minLat: latMid - latSpan / 2,
    maxLat: latMid + latSpan / 2,
    minLng: lngMid - lngSpan / 2,
    maxLng: lngMid + lngSpan / 2,
  };
}

export function getClusterFocusZoom(
  currentZoom: number,
  clusterCount: number
): number {
  const zoomStep =
    currentZoom <= 10 ? 4 : currentZoom <= 12 ? 3 : currentZoom <= 14 ? 2 : 1;
  const steppedZoom = currentZoom + zoomStep;

  if (clusterCount >= 12) {
    return Math.min(Math.max(steppedZoom, 14), 16);
  }

  if (clusterCount >= 5) {
    return Math.min(Math.max(steppedZoom, PIN_TEXT_VISIBLE_ZOOM), 16);
  }

  return Math.min(Math.max(steppedZoom, PIN_TEXT_VISIBLE_ZOOM), 17);
}

export function getClusterGridSizePx(zoom: number): number | null {
  if (zoom >= 17) return null;
  if (zoom >= 15) return 55;
  if (zoom >= 13) return 80;
  if (zoom >= 11) return 110;
  return 140;
}

export function clusterProjectedByGrid<T extends LatLngPoint>(
  projected: ProjectedPoint<T>[],
  gridSizePx: number
): ItemCluster<T>[] {
  const cells = new Map<string, ProjectedPoint<T>[]>();

  for (const point of projected) {
    const cellX = Math.floor(point.x / gridSizePx);
    const cellY = Math.floor(point.y / gridSizePx);
    const key = `${cellX},${cellY}`;
    const existing = cells.get(key);
    if (existing) {
      existing.push(point);
    } else {
      cells.set(key, [point]);
    }
  }

  const clusters: ItemCluster<T>[] = [];

  for (const cellPoints of cells.values()) {
    const lat =
      cellPoints.reduce((sum, point) => sum + point.item.lat, 0) /
      cellPoints.length;
    const lng =
      cellPoints.reduce((sum, point) => sum + point.item.lng, 0) /
      cellPoints.length;

    clusters.push({
      lat,
      lng,
      items: cellPoints.map((point) => point.item),
      count: cellPoints.length,
    });
  }

  return clusters;
}

export function clusterItemsByGrid<T extends LatLngPoint>(
  items: T[],
  projection: MapProjection,
  createLatLng: (
    lat: number,
    lng: number
  ) => { lat: () => number; lng: () => number },
  gridSizePx: number
): ItemCluster<T>[] {
  return clusterProjectedByGrid(
    projectPoints(items, projection, createLatLng),
    gridSizePx
  );
}

export function clusterPinsByGrid(
  pins: Pin[],
  projection: MapProjection,
  createLatLng: (
    lat: number,
    lng: number
  ) => { lat: () => number; lng: () => number },
  gridSizePx: number
): PinCluster[] {
  return clusterItemsByGrid(pins, projection, createLatLng, gridSizePx).map(
    (cluster) => ({
      lat: cluster.lat,
      lng: cluster.lng,
      pins: cluster.items,
      count: cluster.count,
    })
  );
}

export function formatGeoBoundsKey(bounds: GeoBounds): string {
  return [
    bounds.minLat.toFixed(5),
    bounds.maxLat.toFixed(5),
    bounds.minLng.toFixed(5),
    bounds.maxLng.toFixed(5),
  ].join(",");
}
