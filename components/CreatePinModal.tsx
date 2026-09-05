"use client";

import { useEffect, useState } from "react";
import {
  PIN_CREATE_COST,
  PIN_TEXT_MAX_LENGTH,
} from "@/lib/constants";
import { useSubmitLock } from "@/lib/useSubmitLock";
import FlagIcon from "@/components/icons/FlagIcon";
import OverlayPortal from "@/components/layout/OverlayPortal";

interface CreatePinModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (
    text: string
  ) => Promise<{ success: boolean; error?: string }>;
  loading?: boolean;
}

export default function CreatePinModal({
  open,
  onClose,
  onSubmit,
  loading,
}: CreatePinModalProps) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const { locked: submitting, run, unlock } = useSubmitLock();

  useEffect(() => {
    if (!open) unlock();
  }, [open, unlock]);

  if (!open) return null;

  const busy = loading || submitting;

  const handleSubmit = () => {
    if (busy || !text.trim()) return;
    setError("");
    void run(async () => {
      const result = await onSubmit(text);
      if (result.success) {
        setText("");
        onClose();
        return "keep";
      }
      setError(result.error ?? "깃발 생성에 실패했습니다.");
      return "release";
    });
  };

  const handleClose = () => {
    if (busy) return;
    setError("");
    onClose();
  };

  return (
    <OverlayPortal>
      <div className="fixed inset-0 z-50 flex items-end justify-center">
        <div
          className="absolute inset-0 bg-black/50"
          onClick={busy ? undefined : handleClose}
        />
        <div className="relative w-full max-w-lg bg-white rounded-t-3xl px-6 pt-3 pb-8 animate-slide-up shadow-2xl">
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

          <h2 className="text-xl font-bold text-gray-900">
            현재 위치에 깃발을 꽂을까요?
          </h2>
          <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
            아래 말이 지도 위 깃발에 표시됩니다.
          </p>

          <label className="block mt-5">
            <span className="text-xs font-semibold text-gray-500">
              깃발에 적을 말
            </span>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="shrink-0 text-blue-600">
                <FlagIcon size={22} tier={100} color="#2563eb" />
              </span>
              <input
                value={text}
                onChange={(e) =>
                  setText(e.target.value.slice(0, PIN_TEXT_MAX_LENGTH))
                }
                maxLength={PIN_TEXT_MAX_LENGTH}
                disabled={busy}
                placeholder="예: 여기 내 땅!"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 disabled:opacity-60"
              />
            </div>
            <span className="mt-1 block text-right text-[11px] text-gray-400 tabular-nums">
              {text.length}/{PIN_TEXT_MAX_LENGTH}
            </span>
          </label>

          {error ? (
            <p className="mt-3 text-sm text-red-500 text-center">{error}</p>
          ) : null}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={busy || !text.trim()}
            className="w-full mt-4 py-3.5 rounded-2xl bg-blue-600 text-white font-bold disabled:opacity-40"
          >
            {busy ? "생성 중..." : `🚩 ${PIN_CREATE_COST}P로 깃발 꽂기`}
          </button>
          <p className="mt-2.5 text-center text-xs text-gray-400">
            같은 자리에 다시 오면 강화할 수 있어요.
          </p>
        </div>
      </div>
    </OverlayPortal>
  );
}
