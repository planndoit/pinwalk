"use client";

import { useEffect, useState } from "react";
import FlagIcon from "@/components/icons/FlagIcon";
import OverlayPortal from "@/components/layout/OverlayPortal";
import type { Pin, PinAttempt } from "@/types/pin";
import type { PinToll } from "@/types/randomPoint";
import {
  DEFAULT_NICKNAME,
  PIN_MAX_COST,
  PIN_REINFORCE_COST,
  PIN_TEXT_CHANGE_COST,
  PIN_TEXT_MAX_LENGTH,
  getNextPinCost,
} from "@/lib/constants";
import {
  formatCooldownRemaining,
  getFlagLabel,
  getFlagTier,
  getPinReinforceCooldownMsRemaining,
} from "@/lib/flagVisual";
import { formatActivityDate } from "@/lib/formatDate";
import { getDistanceMeters } from "@/lib/geo";
import { REMOTE_HARVEST_MIN_TOTAL, getPinHarvestState } from "@/lib/harvest";
import { getPinOwnerAvatarUrl } from "@/lib/pinAvatar";
import { useClock } from "@/lib/useClock";
import { useSubmitLock } from "@/lib/useSubmitLock";

interface PinBottomSheetProps {
  pin: Pin | null;
  onClose: () => void;
  onConquer: () => void;
  onDeleted?: (pinId: string) => void;
  onReinforced?: (pin: Pin) => void;
  onHarvested?: (result: PinHarvestResult) => void;
  isOwner: boolean;
  disabled?: boolean;
  currentPosition?: { lat: number; lng: number } | null;
}

export type PinHarvestResult = {
  pin: Pin | null;
  points: number;
  message: string;
};

type AttemptSummary = {
  successCount: number;
  failCount: number;
  total: number;
};

type AttemptHistory = {
  attempts: PinAttempt[];
  summary: AttemptSummary;
};

type TollSummary = {
  total: number;
  totalTollPoints: number;
};

type TollHistory = {
  tolls: PinToll[];
  summary: TollSummary;
};

const EMPTY_SUMMARY: AttemptSummary = {
  successCount: 0,
  failCount: 0,
  total: 0,
};

const EMPTY_TOLL_SUMMARY: TollSummary = {
  total: 0,
  totalTollPoints: 0,
};

const attemptHistoryCache = new Map<string, AttemptHistory>();
const tollHistoryCache = new Map<string, TollHistory>();

function formatAttemptText(attempt: PinAttempt): string {
  return `${attempt.attacker_nickname} → ${attempt.target_owner_nickname} ${
    attempt.success ? "점령" : "점령 실패"
  }`;
}

export default function PinBottomSheet({
  pin,
  onClose,
  onConquer,
  onDeleted,
  onReinforced,
  onHarvested,
  isOwner,
  disabled,
  currentPosition,
}: PinBottomSheetProps) {
  const [attempts, setAttempts] = useState<PinAttempt[]>([]);
  const [summary, setSummary] = useState<AttemptSummary>(EMPTY_SUMMARY);
  const [attemptsLoading, setAttemptsLoading] = useState(false);
  const [tolls, setTolls] = useState<PinToll[]>([]);
  const [tollSummary, setTollSummary] =
    useState<TollSummary>(EMPTY_TOLL_SUMMARY);
  const [tollsLoading, setTollsLoading] = useState(false);
  const [editText, setEditText] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [avatarUi, setAvatarUi] = useState({
    pinId: "",
    open: false,
    failed: false,
  });
  const { locked: deleting, run, unlock } = useSubmitLock();
  const {
    locked: reinforcing,
    run: runReinforce,
    unlock: unlockReinforce,
  } = useSubmitLock();
  const {
    locked: updatingText,
    run: runUpdateText,
    unlock: unlockUpdateText,
  } = useSubmitLock();
  const {
    locked: harvesting,
    run: runHarvest,
    unlock: unlockHarvest,
  } = useSubmitLock();

  const [prevPin, setPrevPin] = useState<Pin | null>(null);
  const nowMs = useClock(Boolean(pin));

  if (pin !== prevPin) {
    setPrevPin(pin);
    setEditText(pin?.text ?? "");
    setActionError(null);
    if (pin) {
      const cachedAttempts = attemptHistoryCache.get(pin.id);
      setAttempts(cachedAttempts?.attempts ?? []);
      setSummary(cachedAttempts?.summary ?? EMPTY_SUMMARY);
      setAttemptsLoading(!cachedAttempts);
      const cachedTolls = tollHistoryCache.get(pin.id);
      setTolls(cachedTolls?.tolls ?? []);
      setTollSummary(cachedTolls?.summary ?? EMPTY_TOLL_SUMMARY);
      setTollsLoading(!cachedTolls);
    }
  }

  useEffect(() => {
    if (pin) return;
    unlock();
    unlockReinforce();
    unlockUpdateText();
    unlockHarvest();
  }, [pin, unlock, unlockReinforce, unlockUpdateText, unlockHarvest]);

  useEffect(() => {
    if (!pin) return;

    const pinId = pin.id;
    const cached = attemptHistoryCache.get(pinId);
    let cancelled = false;
    fetch(`/api/pins/${pinId}/attempts`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const next: AttemptHistory = {
          attempts: data.attempts ?? [],
          summary: data.summary ?? EMPTY_SUMMARY,
        };
        attemptHistoryCache.set(pinId, next);
        setAttempts(next.attempts);
        setSummary(next.summary);
      })
      .catch(() => {
        if (cancelled || cached) return;
        setAttempts([]);
        setSummary(EMPTY_SUMMARY);
      })
      .finally(() => {
        if (!cancelled) setAttemptsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pin]);

  useEffect(() => {
    if (!pin) return;

    const pinId = pin.id;
    const cached = tollHistoryCache.get(pinId);
    let cancelled = false;
    fetch(`/api/pins/${pinId}/tolls`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const next: TollHistory = {
          tolls: data.tolls ?? [],
          summary: data.summary ?? EMPTY_TOLL_SUMMARY,
        };
        tollHistoryCache.set(pinId, next);
        setTolls(next.tolls);
        setTollSummary(next.summary);
      })
      .catch(() => {
        if (cancelled || cached) return;
        setTolls([]);
        setTollSummary(EMPTY_TOLL_SUMMARY);
      })
      .finally(() => {
        if (!cancelled) setTollsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pin]);

  if (!pin) return null;

  const tier = getFlagTier(pin.cost);
  const cooldownMs = isOwner
    ? getPinReinforceCooldownMsRemaining(pin, nowMs)
    : 0;
  const ownerName = pin.nickname ?? DEFAULT_NICKNAME;
  const avatarForPin = avatarUi.pinId === pin.id ? avatarUi : null;
  const avatarUrl = avatarForPin?.failed ? null : getPinOwnerAvatarUrl(pin);
  const avatarOpen = Boolean(avatarForPin?.open && avatarUrl);
  const nextCost = getNextPinCost(pin.cost);
  const isMaxCost = nextCost === null || pin.cost >= PIN_MAX_COST;
  const busy =
    disabled || deleting || reinforcing || updatingText || harvesting;
  const trimmedEditText = editText.trim();
  const textChanged = trimmedEditText !== pin.text.trim();
  const insideRadius =
    currentPosition != null &&
    getDistanceMeters(
      currentPosition.lat,
      currentPosition.lng,
      pin.lat,
      pin.lng
    ) <= pin.radius_meters;
  const harvest = getPinHarvestState(pin, nowMs);
  const canHarvest = insideRadius
    ? harvest.amount > 0
    : harvest.remoteAmount > 0;
  const harvestHint = insideRadius
    ? harvest.amount > 0
      ? null
      : "아직 쌓인 수확 포인트가 없어요"
    : harvest.remoteAmount > 0
      ? `영역 안에서 직접 수확하면 ${harvest.amount.toLocaleString()}P를 모두 받아요`
      : `${REMOTE_HARVEST_MIN_TOTAL}P 이상 쌓이면 원격 수확할 수 있어요`;
  const canReinforce =
    isOwner &&
    !isMaxCost &&
    nextCost !== null &&
    cooldownMs <= 0 &&
    insideRadius &&
    trimmedEditText.length > 0;
  const canChangeText =
    isOwner &&
    isMaxCost &&
    insideRadius &&
    textChanged &&
    trimmedEditText.length > 0;

  const handleDelete = () => {
    if (busy) return;
    const harvestNow = getPinHarvestState(pin, Date.now()).amount;
    const ok = window.confirm(
      harvestNow > 0
        ? `이 깃발을 삭제할까요? 삭제 후에는 지도에서 사라지고, 쌓인 수확 포인트 ${harvestNow.toLocaleString()}P도 함께 사라집니다.`
        : "이 깃발을 삭제할까요? 삭제 후에는 지도에서 사라집니다."
    );
    if (!ok) return;

    void run(async () => {
      const res = await fetch(`/api/pins/${pin.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        window.alert(data.error ?? "삭제에 실패했습니다.");
        return "release";
      }
      attemptHistoryCache.delete(pin.id);
      tollHistoryCache.delete(pin.id);
      onDeleted?.(pin.id);
      return "keep";
    });
  };

  const handleReinforce = () => {
    if (busy || !currentPosition || !canReinforce) return;
    setActionError(null);

    void runReinforce(async () => {
      const res = await fetch(`/api/pins/${pin.id}/reinforce`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_lat: currentPosition.lat,
          current_lng: currentPosition.lng,
          text: trimmedEditText,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error ?? "깃발 강화에 실패했습니다.");
        return "release";
      }
      if (data.pin) {
        onReinforced?.(data.pin as Pin);
      }
      return "release";
    });
  };

  const handleHarvest = () => {
    if (busy || !isOwner) return;
    if (!canHarvest) return;
    const mode = insideRadius ? "direct" : "remote";
    if (mode === "remote") {
      const ok = window.confirm(
        `원격 수확하면 ${harvest.remoteAmount.toLocaleString()}P만 받고 ${(harvest.amount - harvest.remoteAmount).toLocaleString()}P는 사라져요. 계속할까요?`
      );
      if (!ok) return;
    }
    setActionError(null);

    void runHarvest(async () => {
      const res = await fetch(`/api/pins/${pin.id}/harvest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "direct" && currentPosition
            ? {
                mode,
                current_lat: currentPosition.lat,
                current_lng: currentPosition.lng,
              }
            : { mode }
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error ?? "수확에 실패했습니다.");
        return "release";
      }
      onHarvested?.({
        pin: (data.pin as Pin | null) ?? null,
        points: Number(data.points),
        message: String(data.message ?? ""),
      });
      return "release";
    });
  };

  const handleChangeText = () => {
    if (busy || !currentPosition || !canChangeText) return;
    setActionError(null);

    void runUpdateText(async () => {
      const res = await fetch(`/api/pins/${pin.id}/text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_lat: currentPosition.lat,
          current_lng: currentPosition.lng,
          text: trimmedEditText,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error ?? "깃발 문구 변경에 실패했습니다.");
        return "release";
      }
      if (data.pin) {
        onReinforced?.(data.pin as Pin);
      }
      return "release";
    });
  };

  return (
    <OverlayPortal>
      <div className="fixed inset-0 z-40 flex items-end justify-center">
        <div
          className="absolute inset-0 bg-black/30"
          onClick={busy ? undefined : onClose}
        />
        <div className="relative w-full max-w-lg bg-white rounded-t-3xl px-6 pt-3 pb-8 animate-slide-up shadow-2xl max-h-[85dvh] flex flex-col overflow-y-auto overscroll-contain">
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5 shrink-0" />

          {isOwner && (
            <div className="absolute top-4 right-4">
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={busy}
                className="px-2.5 py-1.5 text-xs font-semibold text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50"
              >
                삭제
              </button>
            </div>
          )}

          <div
            className={`flex items-start gap-3 shrink-0 ${isOwner ? "pr-14" : ""}`}
          >
            {avatarUrl ? (
              <button
                type="button"
                onClick={() =>
                  setAvatarUi({ pinId: pin.id, open: true, failed: false })
                }
                className="w-11 h-11 rounded-full overflow-hidden shrink-0 bg-gray-100"
                aria-label={`${ownerName} 프로필 보기`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={avatarUrl}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={() =>
                    setAvatarUi({ pinId: pin.id, open: false, failed: true })
                  }
                />
              </button>
            ) : (
              <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center shrink-0 text-lg">
                👤
              </div>
            )}
            <div className="min-w-0 flex-1">
              {isOwner ? (
                <label className="block">
                  <span className="sr-only">깃발 문구</span>
                  <input
                    value={editText}
                    onChange={(e) =>
                      setEditText(
                        e.target.value.slice(0, PIN_TEXT_MAX_LENGTH)
                      )
                    }
                    maxLength={PIN_TEXT_MAX_LENGTH}
                    disabled={busy}
                    className="w-full text-lg font-bold text-gray-900 leading-snug px-0 py-0 border-0 border-b border-gray-200 focus:border-blue-500 focus:ring-0 bg-transparent disabled:opacity-60"
                  />
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-gray-500">
                      {isMaxCost
                        ? insideRadius
                          ? textChanged
                            ? "아래 버튼으로 저장돼요"
                            : "문구를 수정한 뒤 변경할 수 있어요"
                          : "영역 안에서만 문구를 바꿀 수 있어요"
                        : insideRadius && cooldownMs <= 0
                          ? "강화할 때 함께 저장돼요"
                          : "문구는 강화할 때만 저장돼요"}
                    </span>
                    <span className="text-[11px] text-gray-400 tabular-nums shrink-0">
                      {editText.length}/{PIN_TEXT_MAX_LENGTH}
                    </span>
                  </div>
                </label>
              ) : (
                <p className="text-lg font-bold text-gray-900 break-all leading-snug">
                  {pin.text}
                </p>
              )}
              <p className="text-sm text-gray-500 mt-0.5">
                {ownerName}
                {isOwner && (
                  <span className="ml-1.5 text-[11px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md">
                    내 깃발
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-xl px-3.5 py-2.5 shrink-0">
            <FlagIcon size={14} tier={tier} color="#6b7280" />
            투자 포인트{" "}
            <span className="font-semibold text-gray-700">
              {getFlagLabel(tier)}
            </span>
            <span className="text-gray-400">· 점령될 때까지 유지</span>
          </div>

          <div className="mt-2 rounded-xl bg-amber-50 px-3.5 py-3 shrink-0">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-amber-800">🌾 수확 포인트</span>
              <span className="tabular-nums text-amber-900">
                <span className="font-bold">
                  {harvest.amount.toLocaleString()}
                </span>{" "}
                / {harvest.limit.toLocaleString()}P
              </span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-amber-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-amber-500"
                style={{
                  width: `${harvest.limit > 0 ? (harvest.amount / harvest.limit) * 100 : 0}%`,
                }}
              />
            </div>
            <p
              className={`mt-1.5 text-[11px] ${
                harvest.isFull ? "font-semibold text-red-500" : "text-amber-700"
              }`}
            >
              {harvest.isFull
                ? "가득 참 · 수확하기 전까지 더 쌓이지 않아요"
                : `매시 정각마다 쌓여요 · ${harvest.hoursUntilFull}시간 안에 가득 차요`}
            </p>
            {isOwner ? (
              <>
                <button
                  type="button"
                  onClick={() => void handleHarvest()}
                  disabled={busy || !canHarvest}
                  className="mt-3 w-full py-3 rounded-2xl bg-amber-500 text-white font-bold shadow-lg shadow-amber-500/20 active:scale-98 transition-transform disabled:opacity-40"
                >
                  {harvesting
                    ? "수확 중..."
                    : insideRadius
                      ? harvest.amount > 0
                        ? `직접 수확 (+${harvest.amount.toLocaleString()}P)`
                        : "직접 수확"
                      : harvest.remoteAmount > 0
                        ? `원격 수확 (+${harvest.remoteAmount.toLocaleString()}P)`
                        : "원격 수확"}
                </button>
                {harvestHint ? (
                  <p className="mt-1.5 text-center text-[11px] text-amber-700">
                    {harvestHint}
                  </p>
                ) : null}
              </>
            ) : (
              <p className="mt-1.5 text-[11px] text-amber-700">
                점령하면 쌓인 수확 포인트도 함께 가져와요
              </p>
            )}
          </div>

          {isOwner && (
            <div className="mt-3 shrink-0 space-y-2">
              {isMaxCost ? (
                <>
                  <button
                    type="button"
                    onClick={() => void handleChangeText()}
                    disabled={busy || !canChangeText}
                    className="w-full py-3.5 rounded-2xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-600/20 active:scale-98 transition-transform disabled:opacity-40"
                  >
                    {updatingText
                      ? "변경 중..."
                      : `문구 변경 (${PIN_TEXT_CHANGE_COST}P)`}
                  </button>
                  <p className="text-center text-xs text-gray-500">
                    {!insideRadius
                      ? "깃발 영역 안에서만 문구를 바꿀 수 있어요"
                      : !textChanged
                        ? "문구를 수정한 뒤 변경할 수 있어요 · 쿨다운 없음"
                        : "최대 강화 깃발 · 쿨다운 없이 문구만 변경"}
                  </p>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => void handleReinforce()}
                    disabled={busy || !canReinforce}
                    className="w-full py-3.5 rounded-2xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-600/20 active:scale-98 transition-transform disabled:opacity-40"
                  >
                    {reinforcing
                      ? "강화 중..."
                      : `깃발 강화 (+${PIN_REINFORCE_COST}P → ${nextCost}P)`}
                  </button>
                  <p className="text-center text-xs text-gray-500">
                    {!insideRadius
                      ? "깃발 영역 안에서만 강화할 수 있어요"
                      : cooldownMs > 0
                        ? `다음 강화까지 ${formatCooldownRemaining(cooldownMs)}`
                        : "강화할 때 문구도 함께 바꿀 수 있어요"}
                  </p>
                </>
              )}
              {actionError ? (
                <p className="text-center text-xs text-red-500">{actionError}</p>
              ) : null}
            </div>
          )}

          {!isOwner && (
            <button
              onClick={onConquer}
              disabled={busy}
              className="w-full mt-4 py-3.5 rounded-2xl bg-red-500 text-white font-bold shadow-lg shadow-red-500/25 active:scale-98 transition-transform shrink-0 disabled:opacity-50"
            >
              ⚔️ 점령 도전하기
            </button>
          )}

          {attemptsLoading && (
            <div className="mt-4 p-4 bg-gray-50 rounded-2xl shrink-0">
              <p className="text-xs font-semibold text-gray-600">점령 기록</p>
              <p className="mt-2.5 text-xs text-gray-400">불러오는 중...</p>
            </div>
          )}

          {!attemptsLoading && summary.total > 0 && (
            <div className="mt-4 p-4 bg-gray-50 rounded-2xl flex flex-col shrink-0">
              <div className="flex items-center justify-between shrink-0">
                <p className="text-xs font-semibold text-gray-600">점령 기록</p>
                <p className="text-xs text-gray-500">
                  <span className="text-blue-600 font-semibold">
                    성공 {summary.successCount}
                  </span>
                  <span className="mx-1">·</span>
                  <span className="text-red-500 font-semibold">
                    실패 {summary.failCount}
                  </span>
                </p>
              </div>
              <ul className="mt-2.5 space-y-2 overflow-y-auto max-h-48 pr-1 overscroll-contain">
                {attempts.map((a) => (
                  <li
                    key={a.id}
                    className="text-xs text-gray-600 flex items-start gap-2"
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${
                        a.success ? "bg-blue-500" : "bg-red-400"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-800">
                        {formatAttemptText(a)}
                      </p>
                      <p className="text-gray-400 mt-0.5">
                        {formatActivityDate(a.created_at)} · {a.selected_probability}% 시도
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {tollsLoading && (
            <div className="mt-4 p-4 bg-gray-50 rounded-2xl shrink-0">
              <p className="text-xs font-semibold text-gray-600">통행료 기록</p>
              <p className="mt-2.5 text-xs text-gray-400">불러오는 중...</p>
            </div>
          )}

          {!tollsLoading && tollSummary.total > 0 && (
            <div className="mt-4 p-4 bg-gray-50 rounded-2xl flex flex-col shrink-0">
              <div className="flex items-center justify-between shrink-0">
                <p className="text-xs font-semibold text-gray-600">통행료 기록</p>
                <p className="text-xs text-emerald-600 font-semibold">
                  +{tollSummary.totalTollPoints.toLocaleString()}P ·{" "}
                  {tollSummary.total}건
                </p>
              </div>
              <ul className="mt-2.5 space-y-2 overflow-y-auto max-h-48 pr-1">
                {tolls.map((toll) => (
                  <li
                    key={toll.id}
                    className="text-xs text-gray-600 flex items-start gap-2"
                  >
                    <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 bg-amber-500" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-800">
                        {toll.collector_nickname ?? DEFAULT_NICKNAME}님이
                        포인트 주움 → 통행료 +{toll.toll_points}P
                      </p>
                      <p className="text-gray-400 mt-0.5">
                        {formatActivityDate(toll.created_at)} · 기본{" "}
                        {toll.base_points}P의 10%
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
      {avatarOpen && avatarUrl ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-6"
          onClick={() =>
            setAvatarUi({ pinId: pin.id, open: false, failed: false })
          }
          role="dialog"
          aria-modal="true"
          aria-label={`${ownerName} 프로필`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatarUrl}
            alt={ownerName}
            className="max-h-[75dvh] max-w-[85vw] rounded-2xl object-contain shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      ) : null}
    </OverlayPortal>
  );
}
