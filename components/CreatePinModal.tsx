"use client";

import { useState } from "react";
import {
  DEFAULT_PIN_COST,
  PIN_COST_OPTIONS,
  PIN_TEXT_MAX_LENGTH,
  type PinCost,
} from "@/lib/constants";
import FlagIcon from "@/components/icons/FlagIcon";

interface CreatePinModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (
    text: string,
    cost: PinCost
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
  const [cost, setCost] = useState<PinCost>(DEFAULT_PIN_COST);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const busy = loading || submitting;

  const handleSubmit = async () => {
    if (busy || !text.trim()) return;
    setError("");
    setSubmitting(true);
    try {
      const result = await onSubmit(text, cost);
      if (result.success) {
        setText("");
        setCost(DEFAULT_PIN_COST);
        onClose();
      } else {
        setError(result.error ?? "깃발 생성에 실패했습니다.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (busy) return;
    setError("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={busy ? undefined : handleClose}
      />
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl px-6 pt-3 pb-8 animate-slide-up shadow-2xl">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

        <h2 className="text-xl font-bold text-gray-900">
          선택한 위치에 깃발을 꽂을까요?
        </h2>
        <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
          투자한 포인트만큼 점령할 때도 포인트가 필요합니다.
        </p>

        <p className="text-xs text-gray-500 font-medium mt-4 mb-2">투자 포인트</p>
        <div className="grid grid-cols-4 gap-2">
          {PIN_COST_OPTIONS.map((option) => {
            const selected = option === cost;
            return (
              <button
                key={option}
                type="button"
                onClick={() => setCost(option)}
                disabled={busy}
                className={`py-3 rounded-2xl border-2 transition-colors disabled:opacity-50 flex flex-col items-center gap-1.5 ${
                  selected ? "border-blue-500 bg-blue-50" : "border-gray-200"
                }`}
              >
                <FlagIcon size={20} tier={option} color={selected ? "#2563eb" : "#6b7280"} />
                <span
                  className={`block text-sm font-extrabold ${
                    selected ? "text-blue-600" : "text-gray-700"
                  }`}
                >
                  {option}P
                </span>
              </button>
            );
          })}
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, PIN_TEXT_MAX_LENGTH))}
          placeholder="하고 싶은 이야기를 작성해 주세요"
          disabled={busy}
          className="w-full mt-4 p-3.5 bg-gray-50 border border-gray-200 rounded-2xl resize-none h-20 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors disabled:opacity-60"
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
            disabled={busy}
            className="flex-1 py-3.5 rounded-2xl bg-gray-100 text-gray-600 font-semibold active:scale-98 transition-transform disabled:opacity-50"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={busy || !text.trim()}
            className="flex-[1.6] py-3.5 rounded-2xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-600/25 disabled:opacity-40 disabled:shadow-none active:scale-98 transition-transform"
          >
            {busy ? "생성 중..." : `🚩 ${cost}P로 깃발 꽂기`}
          </button>
        </div>
      </div>
    </div>
  );
}
