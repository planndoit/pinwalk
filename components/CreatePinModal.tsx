"use client";

import { useState } from "react";
import {
  DEFAULT_PIN_DURATION_DAYS,
  PIN_DURATION_OPTIONS,
  PIN_TEXT_MAX_LENGTH,
  type PinDurationDays,
} from "@/lib/constants";

interface CreatePinModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (
    text: string,
    durationDays: PinDurationDays
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
  const [durationDays, setDurationDays] = useState<PinDurationDays>(
    DEFAULT_PIN_DURATION_DAYS
  );
  const [error, setError] = useState("");

  if (!open) return null;

  const selectedCost =
    PIN_DURATION_OPTIONS.find((option) => option.days === durationDays)?.cost ??
    PIN_DURATION_OPTIONS[0].cost;

  const handleSubmit = async () => {
    setError("");
    const result = await onSubmit(text, durationDays);
    if (result.success) {
      setText("");
      setDurationDays(DEFAULT_PIN_DURATION_DAYS);
      onClose();
    } else {
      setError(result.error ?? "핀 생성에 실패했습니다.");
    }
  };

  const handleClose = () => {
    setError("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl px-6 pt-3 pb-8 animate-slide-up shadow-2xl">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

        <h2 className="text-xl font-bold text-gray-900">
          현재 위치에 깃발을 꽂을까요?
        </h2>

        <p className="text-xs text-gray-500 font-medium mt-4 mb-2">노출 기간</p>
        <div className="grid grid-cols-3 gap-2">
          {PIN_DURATION_OPTIONS.map((option) => {
            const selected = option.days === durationDays;
            return (
              <button
                key={option.days}
                type="button"
                onClick={() => setDurationDays(option.days)}
                className={`py-3 rounded-2xl border-2 transition-colors ${
                  selected ? "border-blue-500 bg-blue-50" : "border-gray-200"
                }`}
              >
                <span
                  className={`block text-base font-extrabold ${
                    selected ? "text-blue-600" : "text-gray-700"
                  }`}
                >
                  {option.days}일
                </span>
                <span
                  className={`block text-xs mt-0.5 ${
                    selected ? "text-blue-400" : "text-gray-400"
                  }`}
                >
                  {option.cost}P
                </span>
              </button>
            );
          })}
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, PIN_TEXT_MAX_LENGTH))}
          placeholder="여기를 지나갔어요"
          className="w-full mt-4 p-3.5 bg-gray-50 border border-gray-200 rounded-2xl resize-none h-20 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
          maxLength={PIN_TEXT_MAX_LENGTH}
        />
        <p className="text-right text-xs text-gray-400 mt-1.5">
          {text.length}/{PIN_TEXT_MAX_LENGTH}
        </p>

        {error && (
          <p className="text-sm text-red-500 mt-2 bg-red-50 rounded-xl px-3.5 py-2.5">
            {error}
          </p>
        )}

        <div className="flex gap-2.5 mt-4">
          <button
            onClick={handleClose}
            className="flex-1 py-3.5 rounded-2xl bg-gray-100 text-gray-600 font-semibold active:scale-98 transition-transform"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !text.trim()}
            className="flex-[1.6] py-3.5 rounded-2xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-600/25 disabled:opacity-40 disabled:shadow-none active:scale-98 transition-transform"
          >
            {loading ? "생성 중..." : `🚩 ${selectedCost}P로 깃발 꽂기`}
          </button>
        </div>
      </div>
    </div>
  );
}
