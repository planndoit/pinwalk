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
import NicknameModal from "@/components/NicknameModal";
import { getDistanceMeters } from "@/lib/geo";
import { PIN_RADIUS_METERS, DEFAULT_NICKNAME } from "@/lib/constants";
import type { Pin } from "@/types/pin";
import type { RandomPoint } from "@/types/randomPoint";
import type { ConquerProbability } from "@/lib/constants";

export default function HomePage() {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
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
  const [nicknameModalForced, setNicknameModalForced] = useState(false);
  const [nicknameModalDismissed, setNicknameModalDismissed] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const locationInitializedRef = useRef(false);

  const showNicknameModal =
    nicknameModalForced ||
    (profile?.nickname === DEFAULT_NICKNAME && !nicknameModalDismissed);

  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchPins = useCallback(async (lat: number, lng: number) => {
    const res = await fetch(`/api/pins?lat=${lat}&lng=${lng}&radius=3000`);
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
    await fetchPins(coords.lat, coords.lng);
  }, [requestPosition, fetchPins, showToast]);

  useEffect(() => {
    if (authLoading || !user || locationInitializedRef.current) return;
    locationInitializedRef.current = true;

    void (async () => {
      const coords = await requestPosition();
      if (coords) {
        setPosition(coords);
        await fetchPins(coords.lat, coords.lng);
      } else {
        showToast("위치 권한이 필요합니다.");
      }
      await fetchRandomPoints();
    })();
  }, [
    authLoading,
    user,
    requestPosition,
    fetchPins,
    fetchRandomPoints,
    showToast,
  ]);

  const handlePanToCurrent = () => {
    void getCurrentPosition();
  };

  const handleCreatePinClick = async () => {
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
    await fetchPins(position.lat, position.lng);
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
    await fetchPins(position.lat, position.lng);
    setSelectedPin(null);

    return {
      success: true,
      conquered: data.success,
    };
  };

  const handleSpawnRandomPoints = async () => {
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
  };

  const handleClaimRandomPoint = async () => {
    if (!position || !selectedRandomPoint) return;

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

  const handleNicknameSubmit = async (nickname: string) => {
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error };
    }
    await refreshProfile();
    return { success: true };
  };

  const randomPointDistance = selectedRandomPoint && position
    ? getDistanceMeters(
        position.lat,
        position.lng,
        selectedRandomPoint.lat,
        selectedRandomPoint.lng
      )
    : null;

  if (authLoading) {
    return (
      <div className="h-dvh flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-4xl mb-3">👣</p>
          <p className="text-xl font-bold text-gray-800">발도장</p>
          <p className="text-gray-400 text-sm mt-1">
            걸은 곳에 내 흔적을 남겨보세요
          </p>
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mt-6" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-dvh w-full overflow-hidden">
      <MapView
        pins={pins}
        randomPoints={randomPoints}
        currentPosition={position}
        currentUserId={user?.id ?? null}
        onPinClick={setSelectedPin}
        onRandomPointClick={setSelectedRandomPoint}
      />

      <PointBalance
        points={profile?.points ?? 0}
        nickname={profile?.nickname}
        onNicknameClick={() => setNicknameModalForced(true)}
      />

      <CurrentLocationButton
        onClick={handlePanToCurrent}
        loading={locationLoading}
      />

      <div className="absolute bottom-0 left-0 right-0 z-20 px-4 pt-10 pb-6 pb-safe bg-gradient-to-t from-black/40 to-transparent pointer-events-none">
        <div className="flex gap-2.5 pointer-events-auto max-w-lg mx-auto">
          <button
            onClick={handleCreatePinClick}
            disabled={actionLoading}
            className="flex-[1.4] py-4 rounded-2xl bg-blue-600 text-white text-base font-bold shadow-xl shadow-blue-600/30 active:scale-98 transition-transform disabled:opacity-50"
          >
            👣 발도장 찍기
          </button>
          <button
            onClick={handleSpawnRandomPoints}
            disabled={actionLoading}
            className="flex-1 py-4 rounded-2xl bg-white text-amber-600 text-base font-bold shadow-xl border border-amber-200 active:scale-98 transition-transform disabled:opacity-50"
          >
            ✨ 포인트 찾기
          </button>
        </div>
      </div>

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
        onConquer={() => {
          setShowConquerModal(true);
        }}
        isOwner={selectedPin?.user_id === user?.id}
      />

      <RandomPointBottomSheet
        point={selectedRandomPoint}
        distance={randomPointDistance}
        onClose={() => setSelectedRandomPoint(null)}
        onClaim={handleClaimRandomPoint}
        claiming={actionLoading}
      />

      <NicknameModal
        key={profile?.nickname ?? "no-profile"}
        open={showNicknameModal}
        onClose={() => {
          setNicknameModalDismissed(true);
          setNicknameModalForced(false);
        }}
        onSubmit={handleNicknameSubmit}
        currentNickname={profile?.nickname}
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
