"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import MapView from "@/components/MapView";
import PointBalance from "@/components/PointBalance";
import CurrentLocationButton from "@/components/CurrentLocationButton";
import CreatePinModal from "@/components/CreatePinModal";
import ConquerModal from "@/components/ConquerModal";
import PinBottomSheet from "@/components/PinBottomSheet";
import RandomPointBottomSheet from "@/components/RandomPointBottomSheet";
import MapActionButtons from "@/components/layout/MapActionButtons";
import { getDistanceMeters } from "@/lib/geo";
import { PIN_RADIUS_METERS } from "@/lib/constants";
import type { Pin } from "@/types/pin";
import type { RandomPoint } from "@/types/randomPoint";
import type { ConquerProbability } from "@/lib/constants";

export default function HomePage() {
  const { user, profile, loading: authLoading, refreshProfile, requireAuth } =
    useAuth();
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [locationLoading, setLocationLoading] = useState(false);
  const [pins, setPins] = useState<Pin[]>([]);
  const [randomPoints, setRandomPoints] = useState<RandomPoint[]>([]);
  const [selectedPin, setSelectedPin] = useState<Pin | null>(null);
  const [selectedRandomPoint, setSelectedRandomPoint] =
    useState<RandomPoint | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showConquerModal, setShowConquerModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const locationInitializedRef = useRef(false);

  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchPins = useCallback(async () => {
    const res = await fetch("/api/pins?all=true");
    if (res.ok) {
      const data = await res.json();
      setPins(data.pins ?? []);
    }
  }, []);

  const fetchRandomPoints = useCallback(async () => {
    const res = await fetch("/api/random-points");
    if (res.ok) {
      const data = await res.json();
      setRandomPoints(data.randomPoints ?? []);
    }
  }, []);

  const requestPosition = useCallback((): Promise<{
    lat: number;
    lng: number;
  } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }, []);

  const getCurrentPosition = useCallback(async () => {
    setLocationLoading(true);
    const coords = await requestPosition();
    setLocationLoading(false);

    if (!coords) {
      showToast("위치 권한이 필요합니다.");
      return;
    }

    setPosition(coords);
    await fetchPins();
  }, [requestPosition, fetchPins, showToast]);

  useEffect(() => {
    queueMicrotask(() => {
      void fetchPins();
    });
  }, [fetchPins]);

  useEffect(() => {
    if (authLoading) return;

    queueMicrotask(() => {
      if (!locationInitializedRef.current) {
        locationInitializedRef.current = true;
        void (async () => {
          const coords = await requestPosition();
          if (coords) {
            setPosition(coords);
          }
        })();
      }

      if (user) {
        void fetchRandomPoints();
      } else {
        setRandomPoints([]);
      }
    });
  }, [authLoading, user, requestPosition, fetchRandomPoints]);

  const handlePanToCurrent = () => {
    void getCurrentPosition();
  };

  const handleCreatePinClick = () => {
    requireAuth(async () => {
      if (!position) {
        showToast("현재 위치를 먼저 확인해주세요.");
        return;
      }

      const res = await fetch(
        `/api/pins?lat=${position.lat}&lng=${position.lng}&radius=${PIN_RADIUS_METERS}`
      );
      if (res.ok) {
        const data = await res.json();
        const nearby = (data.pins ?? []).filter(
          (p: Pin) =>
            getDistanceMeters(position.lat, position.lng, p.lat, p.lng) <=
            PIN_RADIUS_METERS
        );
        if (nearby.length > 0) {
          showToast("이미 점령된 영역입니다. 점령에 도전해보세요.");
          setSelectedPin(nearby[0]);
          return;
        }
      }

      setShowCreateModal(true);
    });
  };

  const handleSpawnRandomPoints = () => {
    requireAuth(async () => {
      if (!position) {
        showToast("현재 위치를 먼저 확인해주세요.");
        return;
      }

      setActionLoading(true);
      const res = await fetch("/api/random-points/spawn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_lat: position.lat,
          current_lng: position.lng,
        }),
      });
      const data = await res.json();
      setActionLoading(false);

      if (!res.ok) {
        showToast(data.error ?? "포인트 생성에 실패했습니다.");
        return;
      }

      await fetchRandomPoints();
      showToast(data.message);
    });
  };

  const handleCreatePin = async (text: string) => {
    if (!position) return { success: false, error: "위치 정보가 없습니다." };

    setActionLoading(true);
    const res = await fetch("/api/pins/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lat: position.lat,
        lng: position.lng,
        text,
      }),
    });
    const data = await res.json();
    setActionLoading(false);

    if (!res.ok) {
      return { success: false, error: data.error };
    }

    await refreshProfile();
    await fetchPins();
    showToast("발도장이 찍혔어요!");
    return { success: true };
  };

  const handleConquer = async (
    text: string,
    probability: ConquerProbability
  ) => {
    if (!position || !selectedPin) {
      return { success: false, error: "위치 정보가 없습니다." };
    }

    if (!user) {
      return { success: false, error: "로그인이 필요합니다." };
    }

    setActionLoading(true);
    const res = await fetch("/api/conquer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        target_pin_id: selectedPin.id,
        selected_probability: probability,
        new_text: text,
        current_lat: position.lat,
        current_lng: position.lng,
      }),
    });
    const data = await res.json();
    setActionLoading(false);

    if (!res.ok) {
      return { success: false, error: data.error };
    }

    await refreshProfile();
    await fetchPins();
    setSelectedPin(null);

    return {
      success: true,
      conquered: data.success,
    };
  };

  const handleClaimRandomPoint = async () => {
    if (!position || !selectedRandomPoint || !user) return;

    setActionLoading(true);
    const res = await fetch("/api/random-points/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        random_point_id: selectedRandomPoint.id,
        current_lat: position.lat,
        current_lng: position.lng,
      }),
    });
    const data = await res.json();
    setActionLoading(false);

    if (!res.ok) {
      showToast(data.error);
      return;
    }

    await refreshProfile();
    await fetchRandomPoints();
    setSelectedRandomPoint(null);
    showToast(data.message);
  };

  const handlePinClick = (pin: Pin) => {
    setSelectedPin(pin);
  };

  const handleConquerClick = () => {
    requireAuth(() => {
      setShowConquerModal(true);
    });
  };

  const randomPointDistance = selectedRandomPoint && position
    ? getDistanceMeters(
        position.lat,
        position.lng,
        selectedRandomPoint.lat,
        selectedRandomPoint.lng
      )
    : null;

  return (
    <div className="relative h-dvh w-full overflow-hidden">
      <MapView
        pins={pins}
        randomPoints={randomPoints}
        currentPosition={position}
        currentUserId={user?.id ?? null}
        onPinClick={handlePinClick}
        onRandomPointClick={(point) => {
          requireAuth(() => setSelectedRandomPoint(point));
        }}
      />

      {user && profile && (
        <PointBalance
          points={profile.points}
          nickname={profile.nickname}
        />
      )}

      <CurrentLocationButton
        onClick={handlePanToCurrent}
        loading={locationLoading}
      />

      <MapActionButtons
        onCreatePin={handleCreatePinClick}
        onSpawnPoints={handleSpawnRandomPoints}
        disabled={actionLoading}
      />

      <CreatePinModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreatePin}
        loading={actionLoading}
      />

      <ConquerModal
        open={showConquerModal}
        onClose={() => setShowConquerModal(false)}
        onSubmit={handleConquer}
        loading={actionLoading}
      />

      <PinBottomSheet
        pin={selectedPin}
        onClose={() => setSelectedPin(null)}
        onConquer={handleConquerClick}
        isOwner={selectedPin?.user_id === user?.id}
      />

      <RandomPointBottomSheet
        point={selectedRandomPoint}
        distance={randomPointDistance}
        onClose={() => setSelectedRandomPoint(null)}
        onClaim={handleClaimRandomPoint}
        claiming={actionLoading}
      />

      {toast && (
        <div className="fixed top-28 left-4 right-4 z-50 flex justify-center pointer-events-none">
          <p className="bg-gray-900/90 backdrop-blur text-white text-sm font-medium px-5 py-2.5 rounded-full shadow-xl animate-fade-in">
            {toast}
          </p>
        </div>
      )}
    </div>
  );
}
