"use client";

import { useEffect, useState } from "react";
import FlagIcon from "@/components/icons/FlagIcon";
import type { Pin, PinAttempt } from "@/types/pin";
import { DEFAULT_NICKNAME, PIN_TEXT_MAX_LENGTH } from "@/lib/constants";
import { getFlagLabel, getFlagTier } from "@/lib/flagVisual";

interface PinBottomSheetProps {
  pin: Pin | null;
  onClose: () => void;
  onConquer: () => void;
  onUpdated?: (pin: Pin) => void;
  onDeleted?: (pinId: string) => void;
  isOwner: boolean;
  disabled?: boolean;
}

function formatAttemptText(attempt: PinAttempt): string {
  if (attempt.success && attempt.previous_owner_nickname) {
    return `${attempt.attacker_nickname ?? DEFAULT_NICKNAME} → ${attempt.previous_owner_nickname} 점령`;
  }
  if (attempt.success) {
    return `${attempt.attacker_nickname ?? DEFAULT_NICKNAME} 점령 성공`;
  }
  return `${attempt.attacker_nickname ?? DEFAULT_NICKNAME} 점령 실패`;
}

export default function PinBottomSheet({
  pin,
  onClose,
  onConquer,
  onUpdated,
  onDeleted,
  isOwner,
  disabled,
}: PinBottomSheetProps) {
  const [attempts, setAttempts] = useState<PinAttempt[]>([]);
  const [summary, setSummary] = useState({
    successCount: 0,
    failCount: 0,
    total: 0,
  });
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [editError, setEditError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!pin) return;

    setEditing(false);
    setEditText(pin.text);
    setEditError("");

    let cancelled = false;
    fetch(`/api/pins/${pin.id}/attempts`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setAttempts(data.attempts ?? []);
        setSummary(data.summary ?? { successCount: 0, failCount: 0, total: 0 });
      });

    return () => {
      cancelled = true;
    };
  }, [pin]);

  if (!pin) return null;

  const tier = getFlagTier(pin.cost);
  const busy = disabled || saving;

  const handleSaveEdit = async () => {
    if (busy) return;
    setEditError("");
    setSaving(true);
    try {
      const res = await fetch(`/api/pins/${pin.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: editText }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error ?? "수정에 실패했습니다.");
        return;
      }
      onUpdated?.(data.pin as Pin);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (busy) return;
    const ok = window.confirm("이 깃발을 삭제할까요? 삭제 후에는 지도에서 사라집니다.");
    if (!ok) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/pins/${pin.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        window.alert(data.error ?? "삭제에 실패했습니다.");
        return;
      }
      onDeleted?.(pin.id);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <div
        className="absolute inset-0 bg-black/30"
        onClick={busy ? undefined : onClose}
      />
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl px-6 pt-3 pb-8 animate-slide-up shadow-2xl max-h-[85dvh] flex flex-col">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5 shrink-0" />

        {isOwner && !editing && (
          <div className="absolute top-4 right-4 flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setEditText(pin.text);
                setEditError("");
                setEditing(true);
              }}
              disabled={busy}
              className="px-2.5 py-1.5 text-xs font-semibold text-blue-600 rounded-lg hover:bg-blue-50 disabled:opacity-50"
            >
              수정
            </button>
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

        <div className="flex items-start gap-3 shrink-0 pr-16">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
              isOwner ? "bg-blue-50" : "bg-red-50"
            }`}
          >
            <FlagIcon
              size={22}
              tier={tier}
              color={isOwner ? "#2563eb" : "#ef4444"}
            />
          </div>
          <div className="min-w-0 flex-1">
            {editing ? (
              <div className="space-y-2">
                <input
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  maxLength={PIN_TEXT_MAX_LENGTH}
                  disabled={busy}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-base font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                  autoFocus
                />
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] text-gray-400">
                    {editText.trim().length}/{PIN_TEXT_MAX_LENGTH}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(false);
                        setEditText(pin.text);
                        setEditError("");
                      }}
                      disabled={busy}
                      className="px-3 py-1.5 text-xs font-semibold text-gray-500 rounded-lg hover:bg-gray-100 disabled:opacity-50"
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSaveEdit()}
                      disabled={busy || !editText.trim()}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg disabled:opacity-50"
                    >
                      {saving ? "저장 중..." : "저장"}
                    </button>
                  </div>
                </div>
                {editError && (
                  <p className="text-xs text-red-600">{editError}</p>
                )}
              </div>
            ) : (
              <>
                <p className="text-lg font-bold text-gray-900 break-all leading-snug">
                  {pin.text}
                </p>
                <p className="text-sm text-gray-500 mt-0.5">
                  {pin.nickname ?? DEFAULT_NICKNAME}
                  {isOwner && (
                    <span className="ml-1.5 text-[11px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md">
                      내 깃발
                    </span>
                  )}
                </p>
              </>
            )}
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

        {!isOwner && (
          <button
            onClick={onConquer}
            disabled={busy}
            className="w-full mt-4 py-3.5 rounded-2xl bg-red-500 text-white font-bold shadow-lg shadow-red-500/25 active:scale-98 transition-transform shrink-0 disabled:opacity-50"
          >
            ⚔️ 점령 도전하기
          </button>
        )}

        {summary.total > 0 && (
          <div className="mt-4 p-4 bg-gray-50 rounded-2xl flex flex-col min-h-0 shrink">
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
            <ul className="mt-2.5 space-y-2 overflow-y-auto max-h-48 pr-1">
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
                      {a.selected_probability}% 시도
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
