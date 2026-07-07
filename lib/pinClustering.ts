import type { Pin } from "@/types/pin";

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
  cluster: PinCluster,
  nearbyCount: number
): boolean {
  if (zoom >= PIN_TEXT_VISIBLE_ZOOM) {
    return true;
  }

  if (
    zoom >= PIN_TEXT_SPARSE_ZOOM &&
    cluster.count === 1 &&
    nearbyCount <= SPARSE_NEARBY_MAX_COUNT
  ) {
    return true;
  }

  return false;
}

export function countNearbyPins(
  pin: Pin,
  pins: Pin[],
  projection: MapProjection,
  createLatLng: (lat: number, lng: number) => { lat: () => number; lng: () => number },
  radiusPx: number
): number {
  const centerOffset = projection.fromCoordToOffset(
    createLatLng(pin.lat, pin.lng)
  );
  const radiusSq = radiusPx * radiusPx;
  let count = 0;

  for (const other of pins) {
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

export function getClusterBounds(cluster: PinCluster): {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
} {
  let minLat = cluster.pins[0].lat;
  let maxLat = cluster.pins[0].lat;
  let minLng = cluster.pins[0].lng;
  let maxLng = cluster.pins[0].lng;

  for (const pin of cluster.pins) {
    minLat = Math.min(minLat, pin.lat);
    maxLat = Math.max(maxLat, pin.lat);
    minLng = Math.min(minLng, pin.lng);
    maxLng = Math.max(maxLng, pin.lng);
  }

  return { minLat, maxLat, minLng, maxLng };
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
  cluster: PinCluster
): number {
  const zoomStep =
    currentZoom <= 10 ? 4 : currentZoom <= 12 ? 3 : currentZoom <= 14 ? 2 : 1;
  const steppedZoom = currentZoom + zoomStep;

  if (cluster.count >= 12) {
    return Math.min(Math.max(steppedZoom, 14), 16);
  }

  if (cluster.count >= 5) {
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

export function clusterPinsByGrid(
  pins: Pin[],
  projection: MapProjection,
  createLatLng: (lat: number, lng: number) => { lat: () => number; lng: () => number },
  gridSizePx: number
): PinCluster[] {
  const cells = new Map<string, Pin[]>();

  for (const pin of pins) {
    const offset = projection.fromCoordToOffset(
      createLatLng(pin.lat, pin.lng)
    );
    const cellX = Math.floor(offset.x / gridSizePx);
    const cellY = Math.floor(offset.y / gridSizePx);
    const key = `${cellX},${cellY}`;
    const existing = cells.get(key);
    if (existing) {
      existing.push(pin);
    } else {
      cells.set(key, [pin]);
    }
  }

  const clusters: PinCluster[] = [];

  for (const cellPins of cells.values()) {
    const lat =
      cellPins.reduce((sum, pin) => sum + pin.lat, 0) / cellPins.length;
    const lng =
      cellPins.reduce((sum, pin) => sum + pin.lng, 0) / cellPins.length;

    clusters.push({
      lat,
      lng,
      pins: cellPins,
      count: cellPins.length,
    });
  }

  return clusters;
}
