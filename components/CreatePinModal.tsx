"use client";

import { useState } from "react";
import {
  CREATE_PIN_COST,
  PIN_DURATION_HOURS,
  PIN_TEXT_MAX_LENGTH,
} from "@/lib/constants";

interface CreatePinModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (text: string) => Promise<{ success: boolean; error?: string }>;
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

  if (!open) return null;

  const handleSubmit = async () => {
    setError("");
    const result = await onSubmit(text);
    if (result.success) {
      setText("");
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
          현재 위치에 발도장을 남길까요?
        </h2>

        <div className="mt-3 flex gap-2">
          <div className="flex-1 bg-blue-50 rounded-xl px-3.5 py-2.5 text-center">
            <p className="text-[11px] text-blue-500 font-medium">비용</p>
            <p className="text-sm font-bold text-blue-700">
              {CREATE_PIN_COST}P
            </p>
          </div>
          <div className="flex-1 bg-blue-50 rounded-xl px-3.5 py-2.5 text-center">
            <p className="text-[11px] text-blue-500 font-medium">노출 시간</p>
            <p className="text-sm font-bold text-blue-700">
              {PIN_DURATION_HOURS}시간
            </p>
          </div>
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
            {loading ? "생성 중..." : "👣 발도장 찍기"}
          </button>
        </div>
      </div>
    </div>
  );
}
