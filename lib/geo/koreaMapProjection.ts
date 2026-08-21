export const KOREA_MAP_BOUNDS = {
  minLng: 124.4,
  maxLng: 132.1,
  minLat: 32.95,
  maxLat: 38.75,
} as const;

const MEAN_LAT_COS = Math.cos((36 * Math.PI) / 180);

export const KOREA_MAP_SIZE = {
  width:
    (KOREA_MAP_BOUNDS.maxLng - KOREA_MAP_BOUNDS.minLng) * MEAN_LAT_COS,
  height: KOREA_MAP_BOUNDS.maxLat - KOREA_MAP_BOUNDS.minLat,
};

export function projectKoreaLngLat(
  lng: number,
  lat: number
): { x: number; y: number } {
  return {
    x: (lng - KOREA_MAP_BOUNDS.minLng) * MEAN_LAT_COS,
    y: KOREA_MAP_BOUNDS.maxLat - lat,
  };
}
