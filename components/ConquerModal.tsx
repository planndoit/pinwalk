"use client";

import { useState } from "react";
import {
  CONQUER_PROBABILITIES,
  PIN_TEXT_MAX_LENGTH,
} from "@/lib/constants";
import { calculateConquerCost } from "@/lib/points";
import type { ConquerProbability } from "@/lib/constants";

interface ConquerModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (
    text: string,
    probability: ConquerProbability
  ) => Promise<{ success: boolean; error?: string; conquered?: boolean }>;
  loading?: boolean;
}

export default function ConquerModal({
  open,
  onClose,
  onSubmit,
  loading,
}: ConquerModalProps) {
  const [text, setText] = useState("");
  const [probability, setProbability] = useState<ConquerProbability>(25);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    conquered: boolean;
    message: string;
  } | null>(null);

  if (!open) return null;

  const handleSubmit = async () => {
    setError("");
    const res = await onSubmit(text, probability);
    if (res.success && res.conquered !== undefined) {
      setResult({
        conquered: res.conquered,
        message: res.conquered
          ? "점령 성공! 이 영역에 내 깃발을 꽂았어요."
          : "점령 실패! 기존 깃발이 버텼어요.",
      });
    } else {
      setError(res.error ?? "점령 시도에 실패했습니다.");
    }
  };

  const handleClose = () => {
    setText("");
    setResult(null);
    setError("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl px-6 pt-3 pb-8 max-h-[85vh] overflow-y-auto animate-slide-up shadow-2xl">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

        {result ? (
          <div className="text-center py-6">
            <p className="text-5xl mb-4">{result.conquered ? "🎉" : "😤"}</p>
            <p className="text-lg font-bold text-gray-900">{result.message}</p>
            <button
              onClick={handleClose}
              className="mt-6 w-full py-3.5 rounded-2xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-600/25 active:scale-98 transition-transform"
            >
              확인
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-bold text-gray-900">⚔️ 확률 점령</h2>
            <p className="text-sm text-gray-500 mt-1.5">
              이미 누군가 점령한 영역이에요. 확률 점령에 도전해보세요.
            </p>
            <p className="text-xs text-amber-600 mt-1 font-medium">
              최대 성공 확률은 75%입니다.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {CONQUER_PROBABILITIES.map((p) => (
                <button
                  key={p}
                  onClick={() => setProbability(p)}
                  className={`py-3 rounded-2xl border-2 transition-colors ${
                    probability === p
                      ? "border-red-500 bg-red-50"
                      : "border-gray-200"
                  }`}
                >
                  <span
                    className={`block text-base font-extrabold ${
                      probability === p ? "text-red-600" : "text-gray-700"
                    }`}
                  >
                    {p}%
                  </span>
                  <span
                    className={`block text-xs mt-0.5 ${
                      probability === p ? "text-red-400" : "text-gray-400"
                    }`}
                  >
                    {calculateConquerCost(p)}P
                  </span>
                </button>
              ))}
            </div>

            <textarea
              value={text}
              onChange={(e) =>
                setText(e.target.value.slice(0, PIN_TEXT_MAX_LENGTH))
              }
              placeholder="새 깃발 문구 (최대 20자)"
              className="w-full mt-4 p-3.5 bg-gray-50 border border-gray-200 rounded-2xl resize-none h-20 text-base focus:outline-none focus:ring-2 focus:ring-red-400 focus:bg-white transition-colors"
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
                className="flex-[1.6] py-3.5 rounded-2xl bg-red-500 text-white font-bold shadow-lg shadow-red-500/25 disabled:opacity-40 disabled:shadow-none active:scale-98 transition-transform"
              >
                {loading
                  ? "도전 중..."
                  : `${calculateConquerCost(probability)}P로 도전하기`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
