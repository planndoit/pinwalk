"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Script from "next/script";
import { getNaverMapScriptUrl } from "@/lib/naverMap";
import type { Pin } from "@/types/pin";
import type { RandomPoint } from "@/types/randomPoint";

interface MapViewProps {
  pins: Pin[];
  randomPoints: RandomPoint[];
  currentPosition: { lat: number; lng: number } | null;
  currentUserId: string | null;
  onPinClick: (pin: Pin) => void;
  onRandomPointClick: (point: RandomPoint) => void;
}

const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID ?? "";

function createPinMarkerContent(text: string, isMine: boolean): string {
  const display = text.length > 8 ? text.slice(0, 8) + "…" : text;
  const bg = isMine ? "#2563eb" : "#ef4444";
  return `
    <div style="transform: translate(-50%, -100%); display: flex; flex-direction: column; align-items: center; cursor: pointer;">
      <div style="
        background: ${bg};
        color: white;
        padding: 7px 12px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 700;
        white-space: nowrap;
        box-shadow: 0 4px 12px rgba(0,0,0,0.25);
        border: 2px solid white;
        letter-spacing: -0.02em;
      ">${isMine ? "👣" : "📍"} ${display}</div>
      <div style="
        width: 0; height: 0;
        border-left: 6px solid transparent;
        border-right: 6px solid transparent;
        border-top: 8px solid ${bg};
        margin-top: -1px;
        filter: drop-shadow(0 2px 2px rgba(0,0,0,0.15));
      "></div>
    </div>
  `;
}

function createRandomPointMarkerContent(points: number): string {
  return `
    <div style="transform: translate(-50%, -50%); position: relative; cursor: pointer;">
      <div style="
        position: absolute; inset: -8px;
        border-radius: 50%;
        background: rgba(245,158,11,0.25);
        animation: bdj-pulse 1.6s ease-out infinite;
      "></div>
      <div style="
        position: relative;
        background: linear-gradient(135deg, #fbbf24, #f59e0b);
        color: white;
        width: 40px; height: 40px;
        border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-size: 12px; font-weight: 800;
        box-shadow: 0 4px 12px rgba(245,158,11,0.5);
        border: 2.5px solid white;
      ">${points}P</div>
    </div>
    <style>
      @keyframes bdj-pulse {
        0% { transform: scale(0.8); opacity: 1; }
        100% { transform: scale(1.6); opacity: 0; }
      }
    </style>
  `;
}

function createCurrentLocationContent(): string {
  return `
    <div style="transform: translate(-50%, -50%); position: relative;">
      <div style="
        position: absolute; inset: -10px;
        border-radius: 50%;
        background: rgba(59,130,246,0.2);
      "></div>
      <div style="
        position: relative;
        width: 18px; height: 18px;
        background: #3b82f6;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      "></div>
    </div>
  `;
}

export default function MapView({
  pins,
  randomPoints,
  currentPosition,
  currentUserId,
  onPinClick,
  onRandomPointClick,
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<InstanceType<typeof naver.maps.Map> | null>(null);
  const currentMarkerRef = useRef<InstanceType<typeof naver.maps.Marker> | null>(null);
  const pinMarkersRef = useRef<InstanceType<typeof naver.maps.Marker>[]>([]);
  const pinCirclesRef = useRef<InstanceType<typeof naver.maps.Circle>[]>([]);
  const randomMarkersRef = useRef<InstanceType<typeof naver.maps.Marker>[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // 네이버 지도 인증 실패 공식 훅. maps.js 실행 전에 등록되어야 한다.
  useEffect(() => {
    const w = window as Window & { navermap_authFailure?: () => void };
    w.navermap_authFailure = () => {
      setLoadError(
        `네이버 지도 인증에 실패했습니다. 현재 접속 주소(${window.location.origin})를 네이버 클라우드 Maps 서비스 URL에 등록해주세요.`
      );
    };
    return () => {
      delete w.navermap_authFailure;
    };
  }, []);

  const handleScriptLoad = useCallback(() => {
    setScriptLoaded(true);
    const naverObj = (window as Window & { naver?: typeof naver }).naver;
    if (!mapRef.current || !naverObj?.maps || mapInstanceRef.current) {
      return;
    }

    mapInstanceRef.current = new naverObj.maps.Map(mapRef.current, {
      center: new naverObj.maps.LatLng(37.5665, 126.978),
      zoom: 16,
      zoomControl: false,
    });
    setMapReady(true);
  }, []);

  useEffect(() => {
    if (!scriptLoaded || mapReady) return;

    const timer = setTimeout(() => {
      if (!mapReady) {
        setLoadError(
          `지도 초기화에 실패했습니다. 서비스 URL에 ${window.location.origin} 이(가) 등록되어 있는지 확인해주세요.`
        );
      }
    }, 4000);

    return () => clearTimeout(timer);
  }, [scriptLoaded, mapReady]);

  // 현재 위치 마커 표시 및 지도 이동
  useEffect(() => {
    const naverObj = (window as Window & { naver?: typeof naver }).naver;
    const map = mapInstanceRef.current;
    if (!mapReady || !map || !currentPosition || !naverObj?.maps) return;

    const pos = new naverObj.maps.LatLng(
      currentPosition.lat,
      currentPosition.lng
    );

    if (currentMarkerRef.current) {
      currentMarkerRef.current.setPosition(pos);
    } else {
      currentMarkerRef.current = new naverObj.maps.Marker({
        position: pos,
        map,
        icon: {
          content: createCurrentLocationContent(),
          anchor: new naverObj.maps.Point(0, 0),
        },
      });
    }

    map.panTo(pos);
  }, [mapReady, currentPosition]);

  // 핀 마커 + 반경 원
  useEffect(() => {
    const naverObj = (window as Window & { naver?: typeof naver }).naver;
    const map = mapInstanceRef.current;
    if (!mapReady || !map || !naverObj?.maps) return;

    pinMarkersRef.current.forEach((m) => m.setMap(null));
    pinCirclesRef.current.forEach((c) => c.setMap(null));
    pinMarkersRef.current = [];
    pinCirclesRef.current = [];

    pins.forEach((pin) => {
      const pos = new naverObj.maps.LatLng(pin.lat, pin.lng);
      const isMine = currentUserId !== null && pin.user_id === currentUserId;
      const color = isMine ? "#2563eb" : "#ef4444";

      const circle = new naverObj.maps.Circle({
        map,
        center: pos,
        radius: pin.radius_meters,
        fillColor: color,
        fillOpacity: 0.07,
        strokeColor: color,
        strokeOpacity: 0.25,
        strokeWeight: 1,
      });
      pinCirclesRef.current.push(circle);

      const marker = new naverObj.maps.Marker({
        position: pos,
        map,
        icon: {
          content: createPinMarkerContent(pin.text, isMine),
          anchor: new naverObj.maps.Point(0, 0),
        },
      });

      naverObj.maps.Event.addListener(marker, "click", () => onPinClick(pin));
      pinMarkersRef.current.push(marker);
    });
  }, [mapReady, pins, currentUserId, onPinClick]);

  // 랜덤 포인트 마커
  useEffect(() => {
    const naverObj = (window as Window & { naver?: typeof naver }).naver;
    const map = mapInstanceRef.current;
    if (!mapReady || !map || !naverObj?.maps) return;

    randomMarkersRef.current.forEach((m) => m.setMap(null));
    randomMarkersRef.current = [];

    randomPoints.forEach((point) => {
      const marker = new naverObj.maps.Marker({
        position: new naverObj.maps.LatLng(point.lat, point.lng),
        map,
        icon: {
          content: createRandomPointMarkerContent(point.points),
          anchor: new naverObj.maps.Point(0, 0),
        },
      });

      naverObj.maps.Event.addListener(marker, "click", () =>
        onRandomPointClick(point)
      );
      randomMarkersRef.current.push(marker);
    });
  }, [mapReady, randomPoints, onRandomPointClick]);

  if (!clientId) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 p-4">
        <p className="text-gray-500 text-center text-sm">
          NEXT_PUBLIC_NAVER_MAP_CLIENT_ID 환경변수를 설정해주세요.
        </p>
      </div>
    );
  }

  return (
    <>
      <Script
        src={getNaverMapScriptUrl(clientId)}
        strategy="afterInteractive"
        onLoad={handleScriptLoad}
        onError={() =>
          setLoadError("네이버 지도 스크립트를 불러오지 못했습니다.")
        }
      />
      <div ref={mapRef} className="w-full h-full" />
      {loadError && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-100 p-4">
          <div className="max-w-sm bg-white rounded-2xl shadow-lg border border-red-100 p-5 text-center">
            <p className="text-sm font-bold text-red-600">지도 로딩 오류</p>
            <p className="text-xs text-gray-600 mt-2">{loadError}</p>
          </div>
        </div>
      )}
    </>
  );
}
