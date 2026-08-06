"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import type { SerializedCrew } from "@/types/crew";

export default function CrewInvitePage() {
  const params = useParams();
  const token = params.token as string;
  const router = useRouter();
  const { requireAuth } = useAuth();
  const [crew, setCrew] = useState<SerializedCrew | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/crews/invite/${token}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "크루를 찾을 수 없습니다.");
          return;
        }
        setCrew(data.crew);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const handleJoin = () => {
    if (!crew) return;
    requireAuth(async () => {
      setMessage(null);
      const res = await fetch(`/api/crews/${crew.id}/join`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "가입 신청에 실패했습니다.");
        return;
      }
      setMessage("가입 신청을 보냈습니다.");
      router.push("/crew");
    });
  };

  if (loading) {
    return (
      <div className="h-dvh flex items-center justify-center bg-gray-50">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !crew) {
    return (
      <div className="h-dvh flex flex-col items-center justify-center bg-gray-50 px-4">
        <p className="text-sm text-gray-600">{error ?? "크루를 찾을 수 없습니다."}</p>
        <button
          type="button"
          onClick={() => router.push("/crew")}
          className="mt-4 text-sm font-bold text-blue-600"
        >
          크루 탭으로
        </button>
      </div>
    );
  }

  return (
    <div className="h-dvh overflow-y-auto bg-gray-50 px-4 pt-safe pb-safe">
      <div className="max-w-lg mx-auto mt-8 bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 overflow-hidden shrink-0">
            {crew.hasImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/crews/${crew.id}/image?v=${encodeURIComponent(crew.updatedAt)}`}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xl font-bold text-gray-400">
                {crew.name.slice(0, 1)}
              </div>
            )}
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-gray-900">{crew.name}</h1>
            <p className="text-xs text-gray-500 mt-1">
              {crew.areaLabel} · {crew.memberCount}/{crew.maxMembers}명
              {crew.leaderNickname ? ` · 리더 ${crew.leaderNickname}` : ""}
            </p>
          </div>
        </div>
        {crew.description ? (
          <p className="mt-4 text-sm text-gray-700 whitespace-pre-line">
            {crew.description}
          </p>
        ) : (
          <p className="mt-4 text-sm text-gray-400">소개가 없습니다.</p>
        )}
        {message ? (
          <p className="mt-3 text-sm text-gray-700">{message}</p>
        ) : null}
        <button
          type="button"
          onClick={handleJoin}
          className="mt-5 w-full py-3 rounded-xl bg-blue-600 text-white font-bold"
        >
          가입 신청
        </button>
        <button
          type="button"
          onClick={() => router.push("/crew")}
          className="mt-2 w-full py-2.5 text-sm text-gray-500 font-semibold"
        >
          크루 목록으로
        </button>
      </div>
    </div>
  );
}
