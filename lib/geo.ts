const EARTH_RADIUS_METERS = 6371000;

export function getDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

export function generateRandomPointWithinRadius(
  lat: number,
  lng: number,
  radiusMeters: number
): { lat: number; lng: number } {
  const angle = Math.random() * 2 * Math.PI;
  const distance = Math.sqrt(Math.random()) * radiusMeters;
  const latOffset = (distance * Math.cos(angle)) / EARTH_RADIUS_METERS;
  const lngOffset =
    (distance * Math.sin(angle)) /
    (EARTH_RADIUS_METERS * Math.cos((lat * Math.PI) / 180));

  return {
    lat: lat + (latOffset * 180) / Math.PI,
    lng: lng + (lngOffset * 180) / Math.PI,
  };
}

export function getBoundingBoxDelta(radiusMeters: number, lat: number) {
  const latDelta = radiusMeters / EARTH_RADIUS_METERS;
  const lngDelta =
    radiusMeters /
    (EARTH_RADIUS_METERS * Math.cos((lat * Math.PI) / 180));

  return {
    latDelta: (latDelta * 180) / Math.PI,
    lngDelta: (lngDelta * 180) / Math.PI,
  };
}

export function clampPointToRadius(
  anchorLat: number,
  anchorLng: number,
  lat: number,
  lng: number,
  radiusMeters: number
): { lat: number; lng: number } {
  const distance = getDistanceMeters(anchorLat, anchorLng, lat, lng);
  if (distance <= radiusMeters) {
    return { lat, lng };
  }
  return offsetPointMeters(anchorLat, anchorLng, lat, lng, radiusMeters);
}

export function offsetPointMeters(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  distanceMeters: number
): { lat: number; lng: number } {
  const bearing = Math.atan2(
    toLng - fromLng,
    toLat - fromLat
  );
  const latOffset =
    (distanceMeters * Math.cos(bearing)) / EARTH_RADIUS_METERS;
  const lngOffset =
    (distanceMeters * Math.sin(bearing)) /
    (EARTH_RADIUS_METERS * Math.cos((fromLat * Math.PI) / 180));

  return {
    lat: fromLat + (latOffset * 180) / Math.PI,
    lng: fromLng + (lngOffset * 180) / Math.PI,
  };
}
