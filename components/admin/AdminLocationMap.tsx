"use client";

import { useEffect, useRef } from "react";
import { getNaverMapScriptUrl } from "@/lib/naverMap";

const SCRIPT_ID = "naver-maps-sdk-script";
const DEFAULT_CENTER = { lat: 37.5665, lng: 126.978 };

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

export default function AdminLocationMap({
  lat,
  lng,
  pickable = false,
  onPick,
  className = "",
  height = 320,
}: {
  lat?: number | null;
  lng?: number | null;
  pickable?: boolean;
  onPick?: (lat: number, lng: number) => void;
  className?: string;
  height?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<InstanceType<typeof naver.maps.Map> | null>(null);
  const markerRef = useRef<InstanceType<typeof naver.maps.Marker> | null>(null);
  const clickListenerRef = useRef<{ remove: () => void } | null>(null);

  useEffect(() => {
    let cancelled = false;

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

        if (!mapRef.current) {
          mapRef.current = new naverMaps.maps.Map(containerRef.current, {
            center,
            zoom: hasLocation ? 16 : 13,
            zoomControl: true,
          });
        } else {
          mapRef.current.setCenter(center);
          if (hasLocation) mapRef.current.setZoom(16);
        }

        if (hasLocation) {
          if (!markerRef.current) {
            markerRef.current = new naverMaps.maps.Marker({
              position: center,
              map: mapRef.current,
            });
          } else {
            markerRef.current.setPosition(center);
            markerRef.current.setMap(mapRef.current);
          }
        } else if (markerRef.current) {
          markerRef.current.setMap(null);
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
                });
              } else {
                markerRef.current.setPosition(position);
                markerRef.current.setMap(mapRef.current);
              }
              onPick(nextLat, nextLng);
            }
          );
          clickListenerRef.current = {
            remove: () => naverMaps.maps.Event.removeListener(listener),
          };
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
    };
  }, [lat, lng, pickable, onPick]);

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
