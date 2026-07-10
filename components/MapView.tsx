"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { getNaverMapScriptUrl } from "@/lib/naverMap";
import {
  clusterPinsByGrid,
  countNearbyPins,
  expandClusterBounds,
  getClusterBounds,
  getClusterFocusZoom,
  getClusterGridSizePx,
  PIN_RADIUS_CIRCLE_ZOOM,
  PIN_TEXT_VISIBLE_ZOOM,
  SPARSE_NEARBY_RADIUS_PX,
  shouldShowPinText,
  type PinCluster,
} from "@/lib/pinClustering";
import type { Pin } from "@/types/pin";
import type { RandomPoint } from "@/types/randomPoint";
import type {
  SerializedCouponSpawn,
  SerializedPremiumPlace,
} from "@/types/premiumClient";

interface MapViewProps {
  active?: boolean;
  pins: Pin[];
  randomPoints: RandomPoint[];
  premiumPlaces: SerializedPremiumPlace[];
  couponSpawns: SerializedCouponSpawn[];
  currentPosition: { lat: number; lng: number } | null;
  currentUserId: string | null;
  recenterRequest: { lat: number; lng: number; nonce: number } | null;
  onPinClick: (pin: Pin) => void;
  onRandomPointClick: (point: RandomPoint) => void;
  onPremiumPlaceClick: (place: SerializedPremiumPlace) => void;
  onCouponSpawnClick: (spawn: SerializedCouponSpawn) => void;
}

const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID ?? "";

function createFlagIcon(size = 14): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" style="display:block;flex-shrink:0" aria-hidden="true"><line x1="5" y1="21" x2="5" y2="3" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/><path d="M5 3 L19 7.5 L5 12 Z" fill="#ffffff"/></svg>`;
}

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
        display: flex;
        align-items: center;
        gap: 5px;
      ">${createFlagIcon()}<span>${display}</span></div>
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

function createEmojiPinMarkerContent(isMine: boolean): string {
  const bg = isMine ? "#2563eb" : "#ef4444";
  return `
    <div style="transform: translate(-50%, -100%); display: flex; flex-direction: column; align-items: center; cursor: pointer;">
      <div style="
        background: ${bg};
        color: white;
        width: 28px; height: 28px;
        border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-size: 14px;
        box-shadow: 0 3px 10px rgba(0,0,0,0.25);
        border: 2px solid white;
      ">${createFlagIcon(16)}</div>
      <div style="
        width: 0; height: 0;
        border-left: 5px solid transparent;
        border-right: 5px solid transparent;
        border-top: 7px solid ${bg};
        margin-top: -1px;
      "></div>
    </div>
  `;
}

function createClusterMarkerContent(count: number): string {
  const size = count >= 100 ? 52 : count >= 10 ? 46 : 40;
  const fontSize = count >= 100 ? 13 : count >= 10 ? 14 : 15;
  return `
    <div style="transform: translate(-50%, -50%); cursor: pointer;">
      <div style="
        width: ${size}px; height: ${size}px;
        background: linear-gradient(135deg, #6366f1, #4f46e5);
        color: white;
        border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-size: ${fontSize}px; font-weight: 800;
        box-shadow: 0 4px 14px rgba(79,70,229,0.45);
        border: 3px solid white;
      ">${count}</div>
    </div>
  `;
}

function createPremiumPlaceMarkerContent(storeName: string): string {
  const display = storeName.length > 8 ? storeName.slice(0, 8) + "…" : storeName;
  return `
    <div style="transform: translate(-50%, -100%); display: flex; flex-direction: column; align-items: center; cursor: pointer;">
      <div style="
        background: linear-gradient(135deg, #f59e0b, #d97706);
        color: white;
        padding: 8px 13px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 800;
        white-space: nowrap;
        box-shadow: 0 4px 16px rgba(245,158,11,0.45);
        border: 2.5px solid #fff7ed;
        letter-spacing: -0.02em;
        display: flex; align-items: center; gap: 5px;
      ">👑<span>${display}</span></div>
      <div style="
        width: 0; height: 0;
        border-left: 7px solid transparent;
        border-right: 7px solid transparent;
        border-top: 9px solid #d97706;
        margin-top: -1px;
      "></div>
    </div>
  `;
}

function createCouponSpawnMarkerContent(title: string): string {
  const display = title.length > 6 ? title.slice(0, 6) + "…" : title;
  return `
    <div style="transform: translate(-50%, -50%); position: relative; cursor: pointer;">
      <div style="
        position: absolute; inset: -8px;
        border-radius: 50%;
        background: rgba(139,92,246,0.25);
        animation: bdj-pulse 1.6s ease-out infinite;
      "></div>
      <div style="
        position: relative;
        background: linear-gradient(135deg, #a78bfa, #7c3aed);
        color: white;
        min-width: 44px; height: 44px;
        padding: 0 8px;
        border-radius: 12px;
        display: flex; align-items: center; justify-content: center;
        font-size: 11px; font-weight: 800;
        box-shadow: 0 4px 12px rgba(124,58,237,0.5);
        border: 2.5px solid white;
      ">🎟 ${display}</div>
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

const MAP_FIT_PADDING = {
  top: 96,
  right: 40,
  bottom: 180,
  left: 40,
} as const;

function focusClusterOnMap(
  map: InstanceType<typeof naver.maps.Map>,
  naverObj: typeof naver,
  cluster: PinCluster
) {
  const bounds = expandClusterBounds(getClusterBounds(cluster));
  const sw = new naverObj.maps.LatLng(bounds.minLat, bounds.minLng);
  const ne = new naverObj.maps.LatLng(bounds.maxLat, bounds.maxLng);
  const latLngBounds = new naverObj.maps.LatLngBounds(sw, ne);
  const center = latLngBounds.getCenter();
  const targetZoom = getClusterFocusZoom(map.getZoom(), cluster);
  const latSpan = bounds.maxLat - bounds.minLat;
  const lngSpan = bounds.maxLng - bounds.minLng;
  const isWideArea =
    cluster.count > 12 || latSpan > 0.02 || lngSpan > 0.02;

  const ensureTextVisibleZoom = () => {
    if (map.getZoom() >= PIN_TEXT_VISIBLE_ZOOM) {
      return;
    }

    if (typeof map.morph === "function") {
      map.morph(center, PIN_TEXT_VISIBLE_ZOOM, { duration: 300 });
      return;
    }

    map.setCenter(center);
    map.setZoom(PIN_TEXT_VISIBLE_ZOOM);
  };

  if (isWideArea && typeof map.fitBounds === "function") {
    map.fitBounds(latLngBounds, { ...MAP_FIT_PADDING });
    const listener = naverObj.maps.Event.addListener(map, "idle", () => {
      naverObj.maps.Event.removeListener(listener);
      ensureTextVisibleZoom();
    });
    return;
  }

  if (typeof map.morph === "function") {
    map.morph(center, targetZoom, { duration: 500 });
    return;
  }

  map.setCenter(center);
  map.setZoom(targetZoom);
}

function createCurrentLocationContent(): string {
  return `
    <div style="transform: translate(-50%, -50%); position: relative; width: 18px; height: 18px;">
      <div style="
        position: absolute; inset: 0;
        border-radius: 50%;
        background: rgba(59,130,246,0.35);
        animation: bdj-current-pulse 1.8s ease-out infinite;
      "></div>
      <div style="
        position: absolute; inset: 0;
        background: #3b82f6;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      "></div>
    </div>
    <style>
      @keyframes bdj-current-pulse {
        0% { transform: scale(1); opacity: 0.8; }
        100% { transform: scale(3.2); opacity: 0; }
      }
    </style>
  `;
}

export default function MapView({
  active = true,
  pins,
  randomPoints,
  premiumPlaces,
  couponSpawns,
  currentPosition,
  currentUserId,
  recenterRequest,
  onPinClick,
  onRandomPointClick,
  onPremiumPlaceClick,
  onCouponSpawnClick,
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<InstanceType<typeof naver.maps.Map> | null>(null);
  const currentMarkerRef = useRef<InstanceType<typeof naver.maps.Marker> | null>(null);
  const pinMarkersRef = useRef<InstanceType<typeof naver.maps.Marker>[]>([]);
  const pinCirclesRef = useRef<InstanceType<typeof naver.maps.Circle>[]>([]);
  const pinListenersRef = useRef<unknown[]>([]);
  const randomMarkersRef = useRef<InstanceType<typeof naver.maps.Marker>[]>([]);
  const premiumMarkersRef = useRef<InstanceType<typeof naver.maps.Marker>[]>([]);
  const couponMarkersRef = useRef<InstanceType<typeof naver.maps.Marker>[]>([]);
  const pinsRef = useRef(pins);
  const currentUserIdRef = useRef(currentUserId);
  const onPinClickRef = useRef(onPinClick);
  const renderRafRef = useRef<number | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const scriptId = "naver-maps-sdk-script";

  useEffect(() => {
    pinsRef.current = pins;
    currentUserIdRef.current = currentUserId;
    onPinClickRef.current = onPinClick;
  }, [pins, currentUserId, onPinClick]);

  const clearPinOverlays = useCallback(() => {
    pinMarkersRef.current.forEach((marker) => marker.setMap(null));
    pinCirclesRef.current.forEach((circle) => circle.setMap(null));
    pinMarkersRef.current = [];
    pinCirclesRef.current = [];
    pinListenersRef.current.forEach((listener) => {
      naver.maps.Event.removeListener(listener);
    });
    pinListenersRef.current = [];
  }, []);

  const buildClusters = useCallback(
    (
      map: InstanceType<typeof naver.maps.Map>,
      naverObj: typeof naver
    ): PinCluster[] => {
      const zoom = map.getZoom();
      const gridSizePx = getClusterGridSizePx(zoom);
      const currentPins = pinsRef.current;

      if (gridSizePx === null) {
        return currentPins.map((pin) => ({
          lat: pin.lat,
          lng: pin.lng,
          pins: [pin],
          count: 1,
        }));
      }

      return clusterPinsByGrid(
        currentPins,
        map.getProjection(),
        (lat, lng) => new naverObj.maps.LatLng(lat, lng),
        gridSizePx
      );
    },
    []
  );

  const renderPinOverlays = useCallback(() => {
    const naverObj = (window as Window & { naver?: typeof naver }).naver;
    const map = mapInstanceRef.current;
    if (!mapReady || !map || !naverObj?.maps) return;

    clearPinOverlays();

    const zoom = map.getZoom();
    const clusters = buildClusters(map, naverObj);
    const showRadiusCircle = zoom >= PIN_RADIUS_CIRCLE_ZOOM;
    const allPins = pinsRef.current;
    const projection = map.getProjection();
    const createLatLng = (lat: number, lng: number) =>
      new naverObj.maps.LatLng(lat, lng);

    clusters.forEach((cluster) => {
      const pos = new naverObj.maps.LatLng(cluster.lat, cluster.lng);

      if (cluster.count > 1) {
        const marker = new naverObj.maps.Marker({
          position: pos,
          map,
          zIndex: 200,
          icon: {
            content: createClusterMarkerContent(cluster.count),
            anchor: new naverObj.maps.Point(0, 0),
          },
        });

        const listener = naverObj.maps.Event.addListener(marker, "click", () => {
          focusClusterOnMap(map, naverObj, cluster);
        });
        pinListenersRef.current.push(listener);
        pinMarkersRef.current.push(marker);
        return;
      }

      const pin = cluster.pins[0];
      const isMine =
        currentUserIdRef.current !== null &&
        pin.user_id === currentUserIdRef.current;
      const color = isMine ? "#2563eb" : "#ef4444";
      const pinPos = new naverObj.maps.LatLng(pin.lat, pin.lng);
      const nearbyCount = countNearbyPins(
        pin,
        allPins,
        projection,
        createLatLng,
        SPARSE_NEARBY_RADIUS_PX
      );
      const showText = shouldShowPinText(zoom, cluster, nearbyCount);

      if (showRadiusCircle) {
        const circle = new naverObj.maps.Circle({
          map,
          center: pinPos,
          radius: pin.radius_meters,
          fillColor: color,
          fillOpacity: 0.07,
          strokeColor: color,
          strokeOpacity: 0.25,
          strokeWeight: 1,
        });
        pinCirclesRef.current.push(circle);
      }

      const marker = new naverObj.maps.Marker({
        position: pinPos,
        map,
        zIndex: isMine ? 120 : 100,
        icon: {
          content: showText
            ? createPinMarkerContent(pin.text, isMine)
            : createEmojiPinMarkerContent(isMine),
          anchor: new naverObj.maps.Point(0, 0),
        },
      });

      const listener = naverObj.maps.Event.addListener(marker, "click", () =>
        onPinClickRef.current(pin)
      );
      pinListenersRef.current.push(listener);
      pinMarkersRef.current.push(marker);
    });
  }, [mapReady, buildClusters, clearPinOverlays]);

  const schedulePinRender = useCallback(() => {
    if (renderRafRef.current !== null) return;
    renderRafRef.current = window.requestAnimationFrame(() => {
      renderRafRef.current = null;
      renderPinOverlays();
    });
  }, [renderPinOverlays]);

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

  const initMap = useCallback(() => {
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
    if (!clientId) return;

    const naverObj = (window as Window & { naver?: typeof naver }).naver;
    if (naverObj?.maps) {
      initMap();
      return;
    }

    const existing = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (existing) {
      const retry = window.setInterval(() => {
        const loadedNaver = (window as Window & { naver?: typeof naver }).naver;
        if (loadedNaver?.maps) {
          window.clearInterval(retry);
          initMap();
        }
      }, 200);
      const timeout = window.setTimeout(() => {
        window.clearInterval(retry);
        setLoadError(
          `지도 초기화에 실패했습니다. 서비스 URL에 ${window.location.origin} 이(가) 등록되어 있는지 확인해주세요.`
        );
      }, 8000);
      return () => {
        window.clearInterval(retry);
        window.clearTimeout(timeout);
      };
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = getNaverMapScriptUrl(clientId);
    script.async = true;
    script.onload = () => {
      initMap();
    };
    script.onerror = () => {
      setLoadError("네이버 지도 스크립트를 불러오지 못했습니다.");
    };
    document.head.appendChild(script);

    const timeout = window.setTimeout(() => {
      const loadedNaver = (window as Window & { naver?: typeof naver }).naver;
      if (!loadedNaver?.maps && !mapReady) {
        setLoadError(
          `지도 초기화에 실패했습니다. 서비스 URL에 ${window.location.origin} 이(가) 등록되어 있는지 확인해주세요.`
        );
      }
    }, 8000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [initMap, mapReady]);

  useEffect(() => {
    if (!active || !mapReady) return;

    const map = mapInstanceRef.current;
    if (!map) return;

    const raf = window.requestAnimationFrame(() => {
      if (typeof map.autoResize === "function") {
        map.autoResize();
        return;
      }

      const naverObj = (window as Window & { naver?: typeof naver }).naver;
      naverObj?.maps?.Event?.trigger(map, "resize");
    });

    return () => window.cancelAnimationFrame(raf);
  }, [active, mapReady]);

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
        zIndex: 300,
        icon: {
          content: createCurrentLocationContent(),
          anchor: new naverObj.maps.Point(0, 0),
        },
      });
      map.panTo(pos);
    }
  }, [mapReady, currentPosition]);

  // 현재 위치 버튼 클릭 시 지도를 해당 좌표로 이동
  useEffect(() => {
    if (!recenterRequest) return;
    const naverObj = (window as Window & { naver?: typeof naver }).naver;
    const map = mapInstanceRef.current;
    if (!mapReady || !map || !naverObj?.maps) return;

    map.panTo(new naverObj.maps.LatLng(recenterRequest.lat, recenterRequest.lng));
  }, [mapReady, recenterRequest]);

  useEffect(() => {
    renderPinOverlays();
  }, [pins, renderPinOverlays]);

  useEffect(() => {
    const naverObj = (window as Window & { naver?: typeof naver }).naver;
    const map = mapInstanceRef.current;
    if (!mapReady || !map || !naverObj?.maps) return;

    const zoomListener = naverObj.maps.Event.addListener(
      map,
      "zoom_changed",
      schedulePinRender
    );
    const idleListener = naverObj.maps.Event.addListener(
      map,
      "idle",
      schedulePinRender
    );

    return () => {
      naverObj.maps.Event.removeListener(zoomListener);
      naverObj.maps.Event.removeListener(idleListener);
      if (renderRafRef.current !== null) {
        window.cancelAnimationFrame(renderRafRef.current);
        renderRafRef.current = null;
      }
    };
  }, [mapReady, schedulePinRender]);

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

  // 프리미엄 장소 마커
  useEffect(() => {
    const naverObj = (window as Window & { naver?: typeof naver }).naver;
    const map = mapInstanceRef.current;
    if (!mapReady || !map || !naverObj?.maps) return;

    premiumMarkersRef.current.forEach((m) => m.setMap(null));
    premiumMarkersRef.current = [];

    premiumPlaces.forEach((place) => {
      const marker = new naverObj.maps.Marker({
        position: new naverObj.maps.LatLng(place.lat, place.lng),
        map,
        zIndex: 250,
        icon: {
          content: createPremiumPlaceMarkerContent(place.storeName),
          anchor: new naverObj.maps.Point(0, 0),
        },
      });

      naverObj.maps.Event.addListener(marker, "click", () =>
        onPremiumPlaceClick(place)
      );
      premiumMarkersRef.current.push(marker);
    });
  }, [mapReady, premiumPlaces, onPremiumPlaceClick]);

  // 프리미엄 쿠폰 스폰 마커
  useEffect(() => {
    const naverObj = (window as Window & { naver?: typeof naver }).naver;
    const map = mapInstanceRef.current;
    if (!mapReady || !map || !naverObj?.maps) return;

    couponMarkersRef.current.forEach((m) => m.setMap(null));
    couponMarkersRef.current = [];

    couponSpawns.forEach((spawn) => {
      const marker = new naverObj.maps.Marker({
        position: new naverObj.maps.LatLng(spawn.lat, spawn.lng),
        map,
        zIndex: 280,
        icon: {
          content: createCouponSpawnMarkerContent(spawn.couponTitle),
          anchor: new naverObj.maps.Point(0, 0),
        },
      });

      naverObj.maps.Event.addListener(marker, "click", () =>
        onCouponSpawnClick(spawn)
      );
      couponMarkersRef.current.push(marker);
    });
  }, [mapReady, couponSpawns, onCouponSpawnClick]);

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
