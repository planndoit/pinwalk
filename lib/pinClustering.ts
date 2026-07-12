import type { Pin } from "@/types/pin";

export interface LatLngPoint {
  lat: number;
  lng: number;
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

export function countNearbyPoints<T extends LatLngPoint>(
  point: T,
  points: T[],
  projection: MapProjection,
  createLatLng: (lat: number, lng: number) => { lat: () => number; lng: () => number },
  radiusPx: number
): number {
  const centerOffset = projection.fromCoordToOffset(
    createLatLng(point.lat, point.lng)
  );
  const radiusSq = radiusPx * radiusPx;
  let count = 0;

  for (const other of points) {
    const offset = projection.fromCoordToOffset(
      createLatLng(other.lat, other.lng)
    );
    const dx = offset.x - centerOffset.x;
    const dy = offset.y - centerOffset.y;
    if (dx * dx + dy * dy <= radiusSq) {
      count++;
    }
  }

  return count;
}

export function countNearbyPins(
  pin: Pin,
  pins: Pin[],
  projection: MapProjection,
  createLatLng: (lat: number, lng: number) => { lat: () => number; lng: () => number },
  radiusPx: number
): number {
  return countNearbyPoints(pin, pins, projection, createLatLng, radiusPx);
}

export function getItemsClusterBounds<T extends LatLngPoint>(
  items: T[]
): {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
} {
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

export function getClusterBounds(cluster: PinCluster): {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
} {
  return getItemsClusterBounds(cluster.pins);
}

export function expandClusterBounds(
  bounds: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  },
  minSpanDegrees = 0.004
): {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
} {
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

export function clusterItemsByGrid<T extends LatLngPoint>(
  items: T[],
  projection: MapProjection,
  createLatLng: (lat: number, lng: number) => { lat: () => number; lng: () => number },
  gridSizePx: number
): ItemCluster<T>[] {
  const cells = new Map<string, T[]>();

  for (const item of items) {
    const offset = projection.fromCoordToOffset(
      createLatLng(item.lat, item.lng)
    );
    const cellX = Math.floor(offset.x / gridSizePx);
    const cellY = Math.floor(offset.y / gridSizePx);
    const key = `${cellX},${cellY}`;
    const existing = cells.get(key);
    if (existing) {
      existing.push(item);
    } else {
      cells.set(key, [item]);
    }
  }

  const clusters: ItemCluster<T>[] = [];

  for (const cellItems of cells.values()) {
    const lat =
      cellItems.reduce((sum, item) => sum + item.lat, 0) / cellItems.length;
    const lng =
      cellItems.reduce((sum, item) => sum + item.lng, 0) / cellItems.length;

    clusters.push({
      lat,
      lng,
      items: cellItems,
      count: cellItems.length,
    });
  }

  return clusters;
}

export function clusterPinsByGrid(
  pins: Pin[],
  projection: MapProjection,
  createLatLng: (lat: number, lng: number) => { lat: () => number; lng: () => number },
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
