"use client";

import { useState } from "react";
import { DEFAULT_NICKNAME } from "@/lib/constants";

interface NicknameModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (nickname: string) => Promise<{ success: boolean; error?: string }>;
  currentNickname?: string;
}

export default function NicknameModal({
  open,
  onClose,
  onSubmit,
  currentNickname,
}: NicknameModalProps) {
  const [nickname, setNickname] = useState(
    currentNickname === DEFAULT_NICKNAME ? "" : (currentNickname ?? "")
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    const result = await onSubmit(nickname);
    setLoading(false);
    if (result.success) {
      onClose();
    } else {
      setError(result.error ?? "닉네임 변경에 실패했습니다.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl">
        <p className="text-3xl text-center mb-2">👋</p>
        <h2 className="text-lg font-bold text-gray-900 text-center">
          닉네임을 정해주세요
        </h2>
        <p className="text-sm text-gray-400 mt-1 text-center">
          설정하지 않으면 &quot;{DEFAULT_NICKNAME}&quot;로 표시됩니다.
        </p>
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value.slice(0, 20))}
          placeholder={DEFAULT_NICKNAME}
          className="w-full mt-4 p-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-base text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
          maxLength={20}
        />
        {error && (
          <p className="text-sm text-red-500 mt-2 text-center">{error}</p>
        )}
        <div className="flex gap-2.5 mt-4">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-500 font-semibold active:scale-98 transition-transform"
          >
            나중에
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !nickname.trim()}
            className="flex-[1.4] py-3 rounded-2xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-600/25 disabled:opacity-40 disabled:shadow-none active:scale-98 transition-transform"
          >
            {loading ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
