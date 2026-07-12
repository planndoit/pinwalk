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
import PremiumPromotionModal from "@/components/PremiumPromotionModal";
import PremiumPromotionLocationPicker from "@/components/PremiumPromotionLocationPicker";
import PremiumPlaceBottomSheet from "@/components/PremiumPlaceBottomSheet";
import PremiumCouponBottomSheet from "@/components/PremiumCouponBottomSheet";
import CelebrationOverlay, {
  type CelebrationType,
} from "@/components/CelebrationOverlay";
import { getDistanceMeters } from "@/lib/geo";
import { PIN_RADIUS_METERS } from "@/lib/constants";
import { consumeFocusPremiumPlace } from "@/lib/premium/focusPlace";
import type { Pin } from "@/types/pin";
import type { RandomPoint } from "@/types/randomPoint";
import type {
  SerializedCouponSpawn,
  SerializedPremiumPlace,
} from "@/types/premiumClient";
import type { ConquerProbability, PinCost } from "@/lib/constants";

const POSITION_UPDATE_THRESHOLD_METERS = 5;

interface HomePageProps {
  active?: boolean;
}

export default function HomePage({ active = true }: HomePageProps) {
  const { user, profile, loading: authLoading, refreshProfile, requireAuth } =
    useAuth();
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [locationLoading, setLocationLoading] = useState(false);
  const [pins, setPins] = useState<Pin[]>([]);
  const [randomPoints, setRandomPoints] = useState<RandomPoint[]>([]);
  const [premiumPlaces, setPremiumPlaces] = useState<SerializedPremiumPlace[]>([]);
  const [couponSpawns, setCouponSpawns] = useState<SerializedCouponSpawn[]>([]);
  const [selectedPremiumPlace, setSelectedPremiumPlace] =
    useState<SerializedPremiumPlace | null>(null);
  const [selectedCouponSpawn, setSelectedCouponSpawn] =
    useState<SerializedCouponSpawn | null>(null);
  const [showPremiumPromotionModal, setShowPremiumPromotionModal] = useState(false);
  const [promotionLocationPickMode, setPromotionLocationPickMode] = useState(false);
  const [promotionPickedLocation, setPromotionPickedLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [couponClaimRadius, setCouponClaimRadius] = useState(15);
  const [selectedPin, setSelectedPin] = useState<Pin | null>(null);
  const [selectedRandomPoint, setSelectedRandomPoint] =
    useState<RandomPoint | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showConquerModal, setShowConquerModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<CelebrationType | null>(null);
  const [recenterRequest, setRecenterRequest] = useState<{
    lat: number;
    lng: number;
    nonce: number;
  } | null>(null);
  const lastPositionRef = useRef<{ lat: number; lng: number } | null>(null);
  const recenterNonceRef = useRef(0);
  const dailyBonusUserRef = useRef<string | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchPins = useCallback(async () => {
    const res = await fetch("/api/pins?all=true", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setPins(data.pins ?? []);
    }
  }, []);

  const fetchRandomPoints = useCallback(async () => {
    const res = await fetch("/api/random-points", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setRandomPoints(data.randomPoints ?? []);
    }
  }, []);

  const fetchPremiumPlaces = useCallback(async () => {
    const res = await fetch("/api/premium-places", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setPremiumPlaces(data.places ?? []);
    }
  }, []);

  const syncCouponSpawns = useCallback(
    async (lat: number, lng: number) => {
      if (!user) {
        setCouponSpawns([]);
        return;
      }

      const res = await fetch("/api/premium-coupon-spawns/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_lat: lat, current_lng: lng }),
      });

      if (res.ok) {
        const data = await res.json();
        setCouponSpawns(data.spawns ?? []);
      }
    },
    [user]
  );

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
    if (locationLoading) return null;
    setLocationLoading(true);
    const coords = await requestPosition();
    setLocationLoading(false);

    if (!coords) {
      showToast("위치 권한이 필요합니다.");
      return null;
    }

    lastPositionRef.current = coords;
    setPosition(coords);
    await fetchPins();
    return coords;
  }, [requestPosition, fetchPins, showToast]);

  useEffect(() => {
    queueMicrotask(() => {
      void fetchPins();
      void fetchPremiumPlaces();
    });
  }, [fetchPins, fetchPremiumPlaces]);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/premium-places/config");
      if (res.ok) {
        const data = await res.json();
        setCouponClaimRadius(data.couponClaimRadiusMeters ?? 15);
      }
    })();
  }, []);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      void fetchPins();
      void fetchPremiumPlaces();
      if (user) void fetchRandomPoints();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [fetchPins, fetchRandomPoints, fetchPremiumPlaces, user]);

  useEffect(() => {
    if (active) return;
    setSelectedPin(null);
    setSelectedRandomPoint(null);
    setSelectedPremiumPlace(null);
    setSelectedCouponSpawn(null);
    setShowCreateModal(false);
    setShowConquerModal(false);
    setShowPremiumPromotionModal(false);
    setPromotionLocationPickMode(false);
    setPromotionPickedLocation(null);
    setCelebration(null);
    setToast(null);
  }, [active]);

  useEffect(() => {
    if (!active || !navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const prev = lastPositionRef.current;
        if (
          prev &&
          getDistanceMeters(prev.lat, prev.lng, next.lat, next.lng) <
            POSITION_UPDATE_THRESHOLD_METERS
        ) {
          return;
        }
        lastPositionRef.current = next;
        setPosition(next);
        if (user) void syncCouponSpawns(next.lat, next.lng);
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [active, user, syncCouponSpawns]);

  useEffect(() => {
    if (!active) return;

    const focused = consumeFocusPremiumPlace();
    if (!focused) return;

    setSelectedPin(null);
    setSelectedRandomPoint(null);
    setSelectedCouponSpawn(null);
    setSelectedPremiumPlace(focused);
    recenterNonceRef.current += 1;
    setRecenterRequest({
      lat: focused.lat,
      lng: focused.lng,
      nonce: recenterNonceRef.current,
    });

    if (!focused.isActive) {
      showToast("비활성 장소입니다. 정보는 확인할 수 있어요.");
    }
  }, [active, showToast]);

  useEffect(() => {
    if (authLoading) return;

    queueMicrotask(() => {
      if (user) {
        void fetchRandomPoints();
      } else {
        setRandomPoints([]);
      }
    });
  }, [authLoading, user, fetchRandomPoints]);

  useEffect(() => {
    if (!user) {
      dailyBonusUserRef.current = null;
      return;
    }
    if (dailyBonusUserRef.current === user.id) return;
    dailyBonusUserRef.current = user.id;

    queueMicrotask(() => {
      void (async () => {
        const res = await fetch("/api/daily-bonus", { method: "POST" });
        if (!res.ok) return;
        const data = await res.json();
        if (data.claimed) {
          await refreshProfile();
          showToast(`출석 보너스 ${data.amount}P를 받았어요!`);
        }
      })();
    });
  }, [user, refreshProfile, showToast]);

  const handlePanToCurrent = () => {
    void (async () => {
      const coords = await getCurrentPosition();
      if (!coords) return;
      recenterNonceRef.current += 1;
      setRecenterRequest({ ...coords, nonce: recenterNonceRef.current });
    })();
  };

  const handleCreatePinClick = () => {
    if (actionLoading) return;
    requireAuth(async () => {
      if (!position) {
        showToast("현재 위치를 먼저 확인해주세요.");
        return;
      }

      setActionLoading(true);
      try {
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
      } finally {
        setActionLoading(false);
      }
    });
  };

  const handleSpawnRandomPoints = () => {
    if (actionLoading) return;
    requireAuth(async () => {
      if (!position) {
        showToast("현재 위치를 먼저 확인해주세요.");
        return;
      }

      setActionLoading(true);
      try {
        const res = await fetch("/api/random-points/spawn", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            current_lat: position.lat,
            current_lng: position.lng,
          }),
        });
        const data = await res.json();

        if (!res.ok) {
          showToast(data.error ?? "포인트 생성에 실패했습니다.");
          return;
        }

        await fetchRandomPoints();
        showToast(data.message);
      } finally {
        setActionLoading(false);
      }
    });
  };

  const handleCreatePin = async (text: string, cost: PinCost) => {
    if (!position) return { success: false, error: "위치 정보가 없습니다." };

    setActionLoading(true);
    try {
      const res = await fetch("/api/pins/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: position.lat,
          lng: position.lng,
          text,
          cost,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error };
      }

      const plantedLat =
        typeof data.pin?.lat === "number" ? data.pin.lat : position.lat;
      const plantedLng =
        typeof data.pin?.lng === "number" ? data.pin.lng : position.lng;

      await refreshProfile();
      await fetchPins();
      recenterNonceRef.current += 1;
      setRecenterRequest({
        lat: plantedLat,
        lng: plantedLng,
        nonce: recenterNonceRef.current,
      });
      setCelebration("plant");
      showToast("깃발을 꽂았어요!");
      return { success: true };
    } finally {
      setActionLoading(false);
    }
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
    try {
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

      if (!res.ok) {
        return { success: false, error: data.error };
      }

      await refreshProfile();
      await fetchPins();
      setSelectedPin(null);

      if (data.success) {
        setCelebration("conquer");
      }

      return {
        success: true,
        conquered: data.success,
      };
    } finally {
      setActionLoading(false);
    }
  };

  const handleClaimRandomPoint = async () => {
    if (!position || !selectedRandomPoint || !user) return;

    setActionLoading(true);
    try {
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

      if (!res.ok) {
        showToast(data.error);
        return;
      }

      await refreshProfile();
      await fetchRandomPoints();
      setSelectedRandomPoint(null);
      showToast(data.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePinClick = (pin: Pin) => {
    setSelectedPin(pin);
  };

  const handleConquerClick = () => {
    requireAuth(() => {
      setShowConquerModal(true);
    });
  };

  const handlePremiumPromotionClick = () => {
    if (authLoading) return;

    const ok = requireAuth(() => {
      setSelectedPin(null);
      setSelectedRandomPoint(null);
      setSelectedPremiumPlace(null);
      setSelectedCouponSpawn(null);
      setPromotionLocationPickMode(false);
      setShowPremiumPromotionModal(true);
    });
    if (!ok) {
      showToast("프리미엄 깃발 홍보 요청은 로그인 후 이용할 수 있어요.");
    }
  };

  const handleSelectPromotionOnMap = () => {
    setShowPremiumPromotionModal(false);
    setPromotionLocationPickMode(true);
    if (!promotionPickedLocation && position) {
      setPromotionPickedLocation({ lat: position.lat, lng: position.lng });
    }
  };

  const handleCancelPromotionLocationPick = () => {
    setPromotionLocationPickMode(false);
    setShowPremiumPromotionModal(true);
  };

  const handleConfirmPromotionLocationPick = () => {
    if (!promotionPickedLocation) return;
    setPromotionLocationPickMode(false);
    setShowPremiumPromotionModal(true);
  };

  const handlePromotionMapClick = useCallback((lat: number, lng: number) => {
    setPromotionPickedLocation({ lat, lng });
  }, []);

  const handleClaimCouponSpawn = async () => {
    if (!position || !selectedCouponSpawn || !user) return;

    setActionLoading(true);
    try {
      const res = await fetch("/api/premium-coupon-spawns/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spawn_id: selectedCouponSpawn.id,
          current_lat: position.lat,
          current_lng: position.lng,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        showToast(data.error);
        await syncCouponSpawns(position.lat, position.lng);
        return;
      }

      setSelectedCouponSpawn(null);
      await syncCouponSpawns(position.lat, position.lng);
      showToast(data.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleIssueCoupons = () => {
    requireAuth(() => {
      void (async () => {
        if (!selectedPremiumPlace) return;

        let coords = position;
        if (!coords) {
          coords = await getCurrentPosition();
        }
        if (!coords) return;

        setActionLoading(true);
        try {
          const res = await fetch("/api/premium-coupon-spawns/issue", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              premium_place_id: selectedPremiumPlace.id,
              current_lat: coords.lat,
              current_lng: coords.lng,
            }),
          });
          const data = await res.json();
          if (!res.ok) {
            window.alert(data.error ?? "쿠폰 발행에 실패했습니다.");
            return;
          }

          setCouponSpawns(data.spawns ?? []);
          if (data.message) {
            window.alert(data.message);
          }
        } finally {
          setActionLoading(false);
        }
      })();
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

  const couponSpawnDistance = selectedCouponSpawn && position
    ? getDistanceMeters(
        position.lat,
        position.lng,
        selectedCouponSpawn.lat,
        selectedCouponSpawn.lng
      )
    : null;

  return (
    <div className="relative h-dvh w-full overflow-hidden">
      <MapView
        active={active}
        pins={pins}
        randomPoints={randomPoints}
        premiumPlaces={premiumPlaces}
        couponSpawns={couponSpawns}
        currentPosition={position}
        currentUserId={user?.id ?? null}
        recenterRequest={recenterRequest}
        onPinClick={(pin) => {
          if (promotionLocationPickMode) return;
          handlePinClick(pin);
        }}
        onRandomPointClick={(point) => {
          if (promotionLocationPickMode) return;
          requireAuth(() => setSelectedRandomPoint(point));
        }}
        onPremiumPlaceClick={(place) => {
          if (promotionLocationPickMode) return;
          setSelectedPremiumPlace(place);
        }}
        onCouponSpawnClick={(spawn) => {
          if (promotionLocationPickMode) return;
          requireAuth(() => setSelectedCouponSpawn(spawn));
        }}
        locationPickMode={promotionLocationPickMode}
        pickedLocation={promotionPickedLocation}
        onMapClick={promotionLocationPickMode ? handlePromotionMapClick : undefined}
      />

      <PointBalance
        points={user && profile ? profile.points : null}
        onPremiumPromotion={handlePremiumPromotionClick}
        premiumPromotionDisabled={actionLoading || promotionLocationPickMode}
      />

      <CurrentLocationButton
        onClick={handlePanToCurrent}
        loading={locationLoading}
      />

      <MapActionButtons
        onCreatePin={handleCreatePinClick}
        onSpawnPoints={handleSpawnRandomPoints}
        disabled={actionLoading || promotionLocationPickMode}
      />

      {promotionLocationPickMode && (
        <PremiumPromotionLocationPicker
          onCancel={handleCancelPromotionLocationPick}
          onConfirm={handleConfirmPromotionLocationPick}
          canConfirm={promotionPickedLocation !== null}
        />
      )}

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
        targetPinCost={selectedPin?.cost}
      />

      <PinBottomSheet
        pin={selectedPin}
        onClose={() => setSelectedPin(null)}
        onConquer={handleConquerClick}
        isOwner={selectedPin?.user_id === user?.id}
        disabled={actionLoading}
      />

      <RandomPointBottomSheet
        point={selectedRandomPoint}
        distance={randomPointDistance}
        onClose={() => setSelectedRandomPoint(null)}
        onClaim={handleClaimRandomPoint}
        claiming={actionLoading}
      />

      <PremiumPlaceBottomSheet
        place={selectedPremiumPlace}
        onClose={() => setSelectedPremiumPlace(null)}
        onIssueCoupons={handleIssueCoupons}
        issuing={actionLoading}
      />

      <PremiumCouponBottomSheet
        spawn={selectedCouponSpawn}
        distance={couponSpawnDistance}
        claimRadius={couponClaimRadius}
        onClose={() => setSelectedCouponSpawn(null)}
        onClaim={handleClaimCouponSpawn}
        claiming={actionLoading}
      />

      <PremiumPromotionModal
        open={showPremiumPromotionModal}
        onClose={() => {
          setShowPremiumPromotionModal(false);
          setPromotionPickedLocation(null);
        }}
        selectedLocation={promotionPickedLocation}
        onSelectOnMap={handleSelectPromotionOnMap}
        onSuccess={(message) => {
          setPromotionPickedLocation(null);
          showToast(message);
        }}
      />

      {celebration && (
        <CelebrationOverlay
          type={celebration}
          onDone={() => setCelebration(null)}
        />
      )}

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
