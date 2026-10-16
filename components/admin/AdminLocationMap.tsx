"use client";

import { useEffect, useRef } from "react";
import { ADMIN_LANDMARK_NEARBY_RADIUS_METERS } from "@/lib/constants";
import { getNaverMapScriptUrl } from "@/lib/naverMap";
import type { AdminNearbyLandmark } from "@/types/landmark";

const SCRIPT_ID = "naver-maps-sdk-script";
const DEFAULT_CENTER = { lat: 37.5665, lng: 126.978 };
const NEARBY_FETCH_DEBOUNCE_MS = 300;

declare global {
  interface Window {
    naver?: typeof naver;
  }
}

function loadNaverMaps(): Promise<typeof naver> {
  return new Promise((resolve, reject) => {
    if (window.naver?.maps) {
      resolve(window.naver);
      return;
    }
    const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID ?? "";
    if (!clientId) {
      reject(new Error("지도 API 키가 없습니다."));
      return;
    }
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => {
        if (window.naver?.maps) resolve(window.naver);
        else reject(new Error("지도 로드 실패"));
      });
      return;
    }
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = getNaverMapScriptUrl(clientId);
    script.async = true;
    script.onload = () => {
      if (window.naver?.maps) resolve(window.naver);
      else reject(new Error("지도 로드 실패"));
    };
    script.onerror = () => reject(new Error("지도 스크립트 로드 실패"));
    document.head.appendChild(script);
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function createNearbyLandmarkMarkerContent(
  landmark: AdminNearbyLandmark
): string {
  const base =
    landmark.name.length > 10
      ? `${landmark.name.slice(0, 10)}…`
      : landmark.name;
  const suffix = landmark.mapVisible ? "" : " · 숨김";
  const label = escapeHtml(`${base}${suffix}`);
  const bg = landmark.isClosed
    ? "linear-gradient(135deg, #9ca3af, #6b7280)"
    : landmark.mapVisible
      ? "linear-gradient(135deg, #0f766e, #115e59)"
      : "linear-gradient(135deg, #64748b, #475569)";
  const tip = landmark.isClosed
    ? "#6b7280"
    : landmark.mapVisible
      ? "#115e59"
      : "#475569";
  return `
    <div style="transform: translate(-50%, -100%); display: flex; flex-direction: column; align-items: center; pointer-events: none;">
      <div style="
        background: ${bg};
        color: white;
        padding: 5px 9px;
        border-radius: 8px;
        font-size: 11px;
        font-weight: 700;
        white-space: nowrap;
        box-shadow: 0 2px 8px rgba(15,23,42,0.2);
        border: 1.5px solid rgba(255,255,255,0.85);
        letter-spacing: -0.02em;
        opacity: ${landmark.mapVisible ? 0.95 : 0.75};
      ">${label}</div>
      <div style="
        width: 0; height: 0;
        border-left: 6px solid transparent;
        border-right: 6px solid transparent;
        border-top: 7px solid ${tip};
        margin-top: -1px;
        opacity: ${landmark.mapVisible ? 0.95 : 0.75};
      "></div>
    </div>
  `;
}

export default function AdminLocationMap({
  lat,
  lng,
  pickable = false,
  onPick,
  className = "",
  height = 320,
  radiusMeters,
  showNearbyLandmarks = false,
  excludeLandmarkId,
}: {
  lat?: number | null;
  lng?: number | null;
  pickable?: boolean;
  onPick?: (lat: number, lng: number) => void;
  className?: string;
  height?: number;
  radiusMeters?: number | null;
  showNearbyLandmarks?: boolean;
  excludeLandmarkId?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<InstanceType<typeof naver.maps.Map> | null>(null);
  const markerRef = useRef<InstanceType<typeof naver.maps.Marker> | null>(null);
  const circleRef = useRef<InstanceType<typeof naver.maps.Circle> | null>(null);
  const nearbyMarkersRef = useRef<InstanceType<typeof naver.maps.Marker>[]>([]);
  const nearbyCirclesRef = useRef<InstanceType<typeof naver.maps.Circle>[]>([]);
  const clickListenerRef = useRef<{ remove: () => void } | null>(null);
  const idleListenerRef = useRef<{ remove: () => void } | null>(null);
  const nearbyFetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nearbyFetchSeqRef = useRef(0);
  const lastCenterRef = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    let cancelled = false;

    const clearNearbyOverlays = () => {
      nearbyMarkersRef.current.forEach((marker) => marker.setMap(null));
      nearbyCirclesRef.current.forEach((circle) => circle.setMap(null));
      nearbyMarkersRef.current = [];
      nearbyCirclesRef.current = [];
    };

    const renderNearbyLandmarks = (
      naverMaps: typeof naver,
      landmarks: AdminNearbyLandmark[]
    ) => {
      const map = mapRef.current;
      if (!map) return;

      clearNearbyOverlays();

      for (const landmark of landmarks) {
        const position = new naverMaps.maps.LatLng(landmark.lat, landmark.lng);
        const stroke = landmark.isClosed
          ? "#9ca3af"
          : landmark.mapVisible
            ? "#0f766e"
            : "#64748b";

        const circle = new naverMaps.maps.Circle({
          map,
          center: position,
          radius: landmark.radiusMeters,
          fillColor: stroke,
          fillOpacity: landmark.mapVisible ? 0.05 : 0.03,
          strokeColor: stroke,
          strokeOpacity: landmark.mapVisible ? 0.35 : 0.25,
          strokeWeight: 1.25,
          zIndex: 40,
        });
        nearbyCirclesRef.current.push(circle);

        const marker = new naverMaps.maps.Marker({
          position,
          map,
          zIndex: 120,
          clickable: false,
          icon: {
            content: createNearbyLandmarkMarkerContent(landmark),
            anchor: new naverMaps.maps.Point(0, 0),
          },
        });
        nearbyMarkersRef.current.push(marker);
      }
    };

    const fetchNearbyLandmarks = (
      naverMaps: typeof naver,
      centerLat: number,
      centerLng: number
    ) => {
      if (!showNearbyLandmarks) {
        clearNearbyOverlays();
        return;
      }

      const seq = ++nearbyFetchSeqRef.current;
      const params = new URLSearchParams({
        lat: String(centerLat),
        lng: String(centerLng),
        radiusMeters: String(ADMIN_LANDMARK_NEARBY_RADIUS_METERS),
      });
      if (excludeLandmarkId) params.set("excludeId", excludeLandmarkId);

      void fetch(`/api/admin/landmarks/nearby?${params.toString()}`)
        .then((res) => (res.ok ? res.json() : Promise.reject()))
        .then((data: { landmarks?: AdminNearbyLandmark[] }) => {
          if (cancelled || seq !== nearbyFetchSeqRef.current) return;
          if (!showNearbyLandmarks || !mapRef.current) return;
          renderNearbyLandmarks(naverMaps, data.landmarks ?? []);
        })
        .catch(() => {
          if (cancelled || seq !== nearbyFetchSeqRef.current) return;
          clearNearbyOverlays();
        });
    };

    const scheduleNearbyFetch = (
      naverMaps: typeof naver,
      centerLat: number,
      centerLng: number
    ) => {
      if (nearbyFetchTimerRef.current) {
        clearTimeout(nearbyFetchTimerRef.current);
      }
      nearbyFetchTimerRef.current = setTimeout(() => {
        nearbyFetchTimerRef.current = null;
        fetchNearbyLandmarks(naverMaps, centerLat, centerLng);
      }, NEARBY_FETCH_DEBOUNCE_MS);
    };

    void (async () => {
      try {
        const naverMaps = await loadNaverMaps();
        if (cancelled || !containerRef.current) return;

        const hasLocation =
          typeof lat === "number" &&
          typeof lng === "number" &&
          Number.isFinite(lat) &&
          Number.isFinite(lng);
        const center = hasLocation
          ? new naverMaps.maps.LatLng(lat, lng)
          : new naverMaps.maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng);
        const hasRadius =
          typeof radiusMeters === "number" &&
          Number.isFinite(radiusMeters) &&
          radiusMeters > 0;
        const centerChanged =
          hasLocation &&
          (lastCenterRef.current?.lat !== lat ||
            lastCenterRef.current?.lng !== lng);

        if (!mapRef.current) {
          mapRef.current = new naverMaps.maps.Map(containerRef.current, {
            center,
            zoom: hasLocation ? 16 : 13,
            zoomControl: true,
          });
        } else if (centerChanged || !hasLocation) {
          mapRef.current.setCenter(center);
          if (hasLocation) mapRef.current.setZoom(16);
        }

        if (hasLocation) {
          lastCenterRef.current = { lat, lng };
        }

        if (hasLocation) {
          if (!markerRef.current) {
            markerRef.current = new naverMaps.maps.Marker({
              position: center,
              map: mapRef.current,
              zIndex: 200,
            });
          } else {
            markerRef.current.setPosition(center);
            markerRef.current.setMap(mapRef.current);
            markerRef.current.setZIndex(200);
          }
        } else if (markerRef.current) {
          markerRef.current.setMap(null);
        }

        if (hasLocation && hasRadius) {
          if (!circleRef.current) {
            circleRef.current = new naverMaps.maps.Circle({
              map: mapRef.current,
              center,
              radius: radiusMeters,
              fillColor: "#0f766e",
              fillOpacity: 0.08,
              strokeColor: "#0f766e",
              strokeOpacity: 0.45,
              strokeWeight: 1.5,
              zIndex: 50,
            });
          } else {
            circleRef.current.setCenter(center);
            circleRef.current.setRadius(radiusMeters);
            circleRef.current.setMap(mapRef.current);
          }
        } else if (circleRef.current) {
          circleRef.current.setMap(null);
        }

        if (clickListenerRef.current) {
          clickListenerRef.current.remove();
          clickListenerRef.current = null;
        }

        if (pickable && onPick && mapRef.current) {
          const listener = naverMaps.maps.Event.addListener(
            mapRef.current,
            "click",
            (e: { coord: { lat: () => number; lng: () => number } }) => {
              const nextLat = e.coord.lat();
              const nextLng = e.coord.lng();
              const position = new naverMaps.maps.LatLng(nextLat, nextLng);
              if (!markerRef.current) {
                markerRef.current = new naverMaps.maps.Marker({
                  position,
                  map: mapRef.current!,
                  zIndex: 200,
                });
              } else {
                markerRef.current.setPosition(position);
                markerRef.current.setMap(mapRef.current);
                markerRef.current.setZIndex(200);
              }
              if (
                circleRef.current &&
                typeof radiusMeters === "number" &&
                Number.isFinite(radiusMeters) &&
                radiusMeters > 0
              ) {
                circleRef.current.setCenter(position);
                circleRef.current.setMap(mapRef.current);
              }
              onPick(nextLat, nextLng);
            }
          );
          clickListenerRef.current = {
            remove: () => naverMaps.maps.Event.removeListener(listener),
          };
        }

        if (idleListenerRef.current) {
          idleListenerRef.current.remove();
          idleListenerRef.current = null;
        }

        if (showNearbyLandmarks && mapRef.current) {
          const idleListener = naverMaps.maps.Event.addListener(
            mapRef.current,
            "idle",
            () => {
              const map = mapRef.current;
              if (!map) return;
              const mapCenter = map.getCenter();
              scheduleNearbyFetch(
                naverMaps,
                mapCenter.lat(),
                mapCenter.lng()
              );
            }
          );
          idleListenerRef.current = {
            remove: () => naverMaps.maps.Event.removeListener(idleListener),
          };

          const mapCenter = mapRef.current.getCenter();
          scheduleNearbyFetch(naverMaps, mapCenter.lat(), mapCenter.lng());
        } else {
          clearNearbyOverlays();
        }
      } catch {
        // keep empty map container; parent can show message if needed
      }
    })();

    return () => {
      cancelled = true;
      if (clickListenerRef.current) {
        clickListenerRef.current.remove();
        clickListenerRef.current = null;
      }
      if (idleListenerRef.current) {
        idleListenerRef.current.remove();
        idleListenerRef.current = null;
      }
      if (nearbyFetchTimerRef.current) {
        clearTimeout(nearbyFetchTimerRef.current);
        nearbyFetchTimerRef.current = null;
      }
      nearbyFetchSeqRef.current += 1;
      clearNearbyOverlays();
    };
  }, [
    lat,
    lng,
    pickable,
    onPick,
    radiusMeters,
    showNearbyLandmarks,
    excludeLandmarkId,
  ]);

  return (
    <div
      ref={containerRef}
      className={`w-full rounded-xl overflow-hidden border border-gray-200 bg-gray-100 ${className}`}
      style={{ height }}
    />
  );
}

export function AdminLocationMapModal({
  open,
  lat,
  lng,
  onClose,
}: {
  open: boolean;
  lat: number;
  lng: number;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="닫기"
        onClick={onClose}
      />
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">지도에서 위치 보기</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 text-gray-500"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>
        <div className="p-4">
          <AdminLocationMap lat={lat} lng={lng} height={360} />
        </div>
      </div>
    </div>
  );
}
