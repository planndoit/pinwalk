"use client";

import { useRef, useState } from "react";
import { compressAvatarFile } from "@/lib/avatar";
import type { Profile } from "@/types/profile";

interface ProfileEditorSectionProps {
  profile: Profile;
  saving: boolean;
  onSave: (payload: {
    nickname: string;
    avatar?: { base64: string; mime: string };
  }) => Promise<void>;
  onError?: (message: string) => void;
}

export default function ProfileEditorSection({
  profile,
  saving,
  onSave,
  onError,
}: ProfileEditorSectionProps) {
  const [nickname, setNickname] = useState(profile.nickname);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    profile.has_avatar
      ? `/api/profile/avatar?userId=${profile.id}&t=${profile.updated_at}`
      : null
  );
  const [pendingAvatar, setPendingAvatar] = useState<{
    base64: string;
    mime: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressAvatarFile(file);
      setPendingAvatar(compressed);
      setAvatarPreview(`data:${compressed.mime};base64,${compressed.base64}`);
    } catch (err) {
      onError?.(
        err instanceof Error ? err.message : "이미지 처리에 실패했습니다."
      );
    }
  };

  return (
    <section className="px-4 py-5 bg-white border-b border-gray-100">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="relative w-16 h-16 rounded-full bg-gray-100 overflow-hidden shrink-0 border-2 border-white shadow"
        >
          {avatarPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarPreview} alt="프로필" className="w-full h-full object-cover" />
          ) : (
            <span className="w-full h-full flex items-center justify-center text-2xl">👤</span>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarChange}
        />
        <div className="flex-1 space-y-2">
          <p className="text-xs text-gray-400">아이디: {profile.username}</p>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value.slice(0, 20))}
            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold"
            placeholder="닉네임"
          />
          <button
            onClick={() =>
              onSave({
                nickname: nickname.trim(),
                avatar: pendingAvatar ?? undefined,
              })
            }
            disabled={saving || !nickname.trim()}
            className="w-full py-2 rounded-xl bg-blue-600 text-white text-sm font-bold disabled:opacity-40"
          >
            {saving ? "저장 중..." : "프로필 저장"}
          </button>
        </div>
      </div>
    </section>
  );
}
