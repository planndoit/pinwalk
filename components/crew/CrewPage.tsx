"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import {
  CREW_AREA_OPTIONS,
  CREW_CREATE_COST,
  CREW_DESCRIPTION_MAX_LENGTH,
  CREW_MEMBERS_MAX,
  CREW_MEMBERS_MIN,
  CREW_NAME_MAX_LENGTH,
} from "@/lib/constants";
import { compressAvatarFile } from "@/lib/avatar";
import type { SerializedCrew, SerializedCrewMember } from "@/types/crew";

type MineState = {
  membership: {
    role: "leader" | "member";
    crew: SerializedCrew;
  } | null;
  pendingRequest: {
    id: string;
    crewId: string;
    createdAt: string;
    crew: SerializedCrew | null;
  } | null;
};

type MemberSort = "combat" | "conquests";

const MEMBER_SORT_TABS: {
  key: MemberSort;
  label: string;
  description: string;
}[] = [
  {
    key: "combat",
    label: "전투력",
    description: "개인 전투력입니다.",
  },
  {
    key: "conquests",
    label: "공략",
    description: "랜드마크에 깃발을 꽂은 수입니다.",
  },
];

function CrewAreaSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="text-gray-700 font-medium">활동지역</span>
      <div className="relative mt-1">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none pl-3 pr-10 py-2 border border-gray-200 rounded-xl text-sm bg-white"
        >
          {CREW_AREA_OPTIONS.map((area) => (
            <option key={area.code} value={area.code}>
              {area.name}
            </option>
          ))}
        </select>
        <span
          className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400"
          aria-hidden
        >
          <svg
            viewBox="0 0 20 20"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 7.5 L10 12.5 L15 7.5" />
          </svg>
        </span>
      </div>
    </label>
  );
}

function CrewMaxMembersStepper({
  value,
  onChange,
  min = CREW_MEMBERS_MIN,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
}) {
  const clamp = (next: number) =>
    Math.min(CREW_MEMBERS_MAX, Math.max(min, next));

  return (
    <div className="block text-sm">
      <span className="text-gray-700 font-medium">
        최대 인원 ({min}~{CREW_MEMBERS_MAX})
      </span>
      <div className="mt-1 flex items-center gap-2">
        <button
          type="button"
          aria-label="최대 인원 감소"
          disabled={value <= min}
          onClick={() => onChange(clamp(value - 1))}
          className="w-10 h-10 rounded-xl border border-gray-200 bg-white text-lg font-bold text-gray-700 disabled:opacity-40"
        >
          −
        </button>
        <div className="flex-1 h-10 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center text-sm font-extrabold tabular-nums text-gray-900">
          {value}
        </div>
        <button
          type="button"
          aria-label="최대 인원 증가"
          disabled={value >= CREW_MEMBERS_MAX}
          onClick={() => onChange(clamp(value + 1))}
          className="w-10 h-10 rounded-xl border border-gray-200 bg-white text-lg font-bold text-gray-700 disabled:opacity-40"
        >
          +
        </button>
      </div>
    </div>
  );
}

function CrewImageField({
  previewSrc,
  hasImage,
  onPick,
  onRemove,
  onError,
}: {
  previewSrc: string | null;
  hasImage: boolean;
  onPick: (image: { base64: string; mime: string }) => void;
  onRemove: () => void;
  onError: (message: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="block text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-gray-700 font-medium">이미지</span>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            void compressAvatarFile(file)
              .then(onPick)
              .catch((err: Error) =>
                onError(err.message || "이미지 처리에 실패했습니다.")
              );
          }}
        />
        {hasImage ? (
          <button
            type="button"
            onClick={onRemove}
            className="px-2.5 py-1 rounded-lg border border-red-200 text-red-600 text-[11px] font-bold"
          >
            삭제
          </button>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="px-2.5 py-1 rounded-lg border border-gray-200 text-gray-700 text-[11px] font-bold"
          >
            추가
          </button>
        )}
      </div>
      <div className="mt-1 w-14 h-14 rounded-xl bg-gray-100 overflow-hidden border border-gray-200">
        {hasImage && previewSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewSrc}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">
            없음
          </div>
        )}
      </div>
    </div>
  );
}

function CrewHome({
  crew,
  role,
  onChanged,
}: {
  crew: SerializedCrew;
  role: "leader" | "member";
  onChanged: () => Promise<void>;
}) {
  const { user, refreshProfile } = useAuth();
  const [pending, setPending] = useState<
    { id: string; userId: string; nickname: string; createdAt: string }[]
  >([]);
  const [members, setMembers] = useState<SerializedCrewMember[]>([]);
  const [memberSort, setMemberSort] = useState<MemberSort>("combat");
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    name: crew.name,
    description: crew.description ?? "",
    areaCode: crew.areaCode,
    maxMembers: crew.maxMembers,
  });
  const [pendingImage, setPendingImage] = useState<{
    base64: string;
    mime: string;
  } | null>(null);
  const [removeImage, setRemoveImage] = useState(false);

  const loadPending = useCallback(async () => {
    if (role !== "leader") return;
    const res = await fetch(`/api/crews/${crew.id}/join-requests`, {
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      setPending(data.requests ?? []);
    }
  }, [crew.id, role]);

  const loadMembers = useCallback(async () => {
    const res = await fetch(`/api/crews/${crew.id}/members`, {
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      setMembers(data.members ?? []);
    }
  }, [crew.id]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadPending();
      void loadMembers();
    });
  }, [loadPending, loadMembers]);

  useEffect(() => {
    setSettingsForm({
      name: crew.name,
      description: crew.description ?? "",
      areaCode: crew.areaCode,
      maxMembers: crew.maxMembers,
    });
    setPendingImage(null);
    setRemoveImage(false);
  }, [crew]);

  const sortedMembers = [...members].sort((a, b) => {
    if (memberSort === "conquests") {
      if (b.landmarkConquests !== a.landmarkConquests) {
        return b.landmarkConquests - a.landmarkConquests;
      }
    } else if (b.combatPower !== a.combatPower) {
      return b.combatPower - a.combatPower;
    }
    return a.nickname.localeCompare(b.nickname, "ko");
  });

  const handleRequest = async (
    requestId: string,
    action: "approve" | "reject"
  ) => {
    setBusyId(requestId);
    setMessage(null);
    try {
      const res = await fetch(`/api/crews/${crew.id}/join-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "처리에 실패했습니다.");
        return;
      }
      setMessage(data.message ?? "처리했습니다.");
      await loadPending();
      await loadMembers();
      await onChanged();
    } finally {
      setBusyId(null);
    }
  };

  const postAction = async (
    path: string,
    body?: Record<string, unknown>,
    confirmText?: string
  ) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusyId(path);
    setMessage(null);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "처리에 실패했습니다.");
        return;
      }
      setMessage(data.message ?? "처리했습니다.");
      await refreshProfile();
      await onChanged();
      await loadMembers();
    } finally {
      setBusyId(null);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/crews/${crew.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: settingsForm.name,
          description: settingsForm.description || null,
          areaCode: settingsForm.areaCode,
          maxMembers: settingsForm.maxMembers,
          imageBase64: pendingImage?.base64,
          imageMime: pendingImage?.mime,
          removeImage: removeImage && !pendingImage,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "설정 저장에 실패했습니다.");
        return;
      }
      setShowSettings(false);
      setPendingImage(null);
      setRemoveImage(false);
      setMessage("크루 설정을 저장했습니다.");
      await onChanged();
    } finally {
      setSavingSettings(false);
    }
  };

  const invitePath =
    role === "leader" && crew.inviteToken
      ? `/crew/invite/${crew.inviteToken}`
      : null;

  return (
    <div className="h-full overflow-y-auto bg-gray-50 pb-[calc(6.5rem+env(safe-area-inset-bottom))]">
      <div className="max-w-lg mx-auto px-4 pt-safe">
        <div className="mt-4 bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl bg-gray-100 overflow-hidden shrink-0">
              {crew.hasImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/crews/${crew.id}/image?v=${encodeURIComponent(crew.updatedAt)}`}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-lg font-bold text-gray-400">
                  {crew.name.slice(0, 1)}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-extrabold text-gray-900 truncate">
                {crew.name}
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                {crew.areaLabel} · {crew.memberCount}/{crew.maxMembers}명
                {role === "leader" ? " · 리더" : ""}
              </p>
            </div>
            {role === "leader" ? (
              <button
                type="button"
                onClick={() => {
                  setShowSettings(true);
                  setMessage(null);
                }}
                className="shrink-0 px-2.5 py-1.5 rounded-lg border border-gray-200 text-[11px] font-bold text-gray-700"
              >
                설정
              </button>
            ) : null}
          </div>
          {crew.description ? (
            <p className="mt-3 text-sm text-gray-700 whitespace-pre-line">
              {crew.description}
            </p>
          ) : null}
          {invitePath ? (
            <div className="mt-3 flex items-center gap-2">
              <p className="text-[11px] text-gray-400 break-all flex-1">
                초대: {invitePath}
              </p>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard
                    .writeText(`${window.location.origin}${invitePath}`)
                    .then(() => setMessage("초대 링크를 복사했습니다."))
                    .catch(() => setMessage("복사에 실패했습니다."));
                }}
                className="shrink-0 px-2 py-1 rounded-lg border border-gray-200 text-[11px] font-bold"
              >
                복사
              </button>
            </div>
          ) : null}
        </div>

        {message ? (
          <p className="mt-3 text-xs text-gray-600 px-1 whitespace-pre-wrap">
            {message}
          </p>
        ) : null}

        {role === "leader" ? (
          <div className="mt-3 bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
            <h2 className="text-sm font-bold text-gray-900">가입 신청</h2>
            {pending.length === 0 ? (
              <p className="mt-2 text-xs text-gray-400">대기 중인 신청이 없습니다.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {pending.map((row) => (
                  <li
                    key={row.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {row.nickname}
                    </span>
                    <span className="flex gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={busyId === row.id}
                        onClick={() => void handleRequest(row.id, "approve")}
                        className="px-2 py-1 rounded-lg bg-blue-600 text-white text-[11px] font-bold disabled:opacity-50"
                      >
                        승인
                      </button>
                      <button
                        type="button"
                        disabled={busyId === row.id}
                        onClick={() => void handleRequest(row.id, "reject")}
                        className="px-2 py-1 rounded-lg border border-gray-200 text-[11px] font-bold disabled:opacity-50"
                      >
                        거절
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        <div className="mt-3 bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-gray-900">멤버 랭킹</h2>
            <div className="flex gap-1">
              {MEMBER_SORT_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setMemberSort(tab.key)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                    memberSort === tab.key
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <p className="mt-2 text-[11px] text-gray-500 leading-relaxed">
            {
              MEMBER_SORT_TABS.find((tab) => tab.key === memberSort)
                ?.description
            }
          </p>
          <ul className="mt-3 space-y-2">
            {sortedMembers.map((member, index) => {
              const value =
                memberSort === "conquests"
                  ? `${member.landmarkConquests}곳`
                  : `${member.combatPower.toLocaleString()}P`;
              return (
                <li
                  key={member.userId}
                  className="flex items-center gap-2 text-sm"
                >
                  <span className="w-5 text-center text-xs font-bold text-gray-400 tabular-nums">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 truncate">
                      {member.nickname}
                      {member.role === "leader" ? (
                        <span className="ml-1 text-[10px] text-amber-700 font-bold">
                          리더
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <span className="text-xs font-semibold tabular-nums text-gray-700 shrink-0">
                    {value}
                  </span>
                  {role === "leader" && member.userId !== user?.id ? (
                    <span className="flex gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={busyId !== null}
                        onClick={() =>
                          void postAction(
                            `/api/crews/${crew.id}/transfer`,
                            { userId: member.userId },
                            `${member.nickname}님에게 리더를 위임할까요?`
                          )
                        }
                        className="px-1.5 py-1 rounded border border-gray-200 text-[10px] font-bold"
                      >
                        위임
                      </button>
                      <button
                        type="button"
                        disabled={busyId !== null}
                        onClick={() =>
                          void postAction(
                            `/api/crews/${crew.id}/kick`,
                            { userId: member.userId },
                            `${member.nickname}님을 추방할까요?`
                          )
                        }
                        className="px-1.5 py-1 rounded border border-red-200 text-[10px] font-bold text-red-600"
                      >
                        추방
                      </button>
                    </span>
                  ) : null}
                </li>
              );
            })}
            {sortedMembers.length === 0 ? (
              <li className="text-xs text-gray-400">멤버가 없습니다.</li>
            ) : null}
          </ul>
        </div>

        <div className="mt-3 mb-4 space-y-2">
          <button
            type="button"
            disabled={busyId !== null}
            onClick={() => {
              if (role === "leader" && crew.memberCount > 1) {
                setMessage(
                  "리더는 다른 멤버에게 리더를 위임한 뒤 탈퇴할 수 있습니다."
                );
                return;
              }
              void postAction(
                `/api/crews/${crew.id}/leave`,
                undefined,
                role === "leader"
                  ? "마지막 멤버입니다. 탈퇴하면 크루가 해산됩니다. 계속할까요?"
                  : "크루에서 탈퇴할까요?"
              );
            }}
            className="w-full py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-700 disabled:opacity-50"
          >
            탈퇴
          </button>
          {role === "leader" ? (
            <button
              type="button"
              disabled={busyId !== null}
              onClick={() =>
                void postAction(
                  `/api/crews/${crew.id}/dissolve`,
                  undefined,
                  "크루를 해산하면 복구할 수 없습니다. 해산할까요?"
                )
              }
              className="w-full py-2.5 rounded-xl border border-red-200 bg-white text-sm font-bold text-red-600 disabled:opacity-50"
            >
              크루 해산
            </button>
          ) : null}
        </div>
      </div>

      {showSettings ? (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-4 space-y-3 max-h-[90dvh] overflow-y-auto">
            <h2 className="text-base font-extrabold text-gray-900">크루 설정</h2>
            <label className="block text-sm">
              <span className="text-gray-700 font-medium">크루 이름</span>
              <input
                value={settingsForm.name}
                maxLength={CREW_NAME_MAX_LENGTH}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, name: e.target.value })
                }
                className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="text-gray-700 font-medium">소개</span>
              <textarea
                value={settingsForm.description}
                maxLength={CREW_DESCRIPTION_MAX_LENGTH}
                rows={3}
                onChange={(e) =>
                  setSettingsForm({
                    ...settingsForm,
                    description: e.target.value,
                  })
                }
                className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none"
              />
            </label>
            <CrewAreaSelect
              value={settingsForm.areaCode}
              onChange={(areaCode) =>
                setSettingsForm({ ...settingsForm, areaCode })
              }
            />
            <CrewMaxMembersStepper
              value={settingsForm.maxMembers}
              min={Math.max(CREW_MEMBERS_MIN, crew.memberCount)}
              onChange={(maxMembers) =>
                setSettingsForm({ ...settingsForm, maxMembers })
              }
            />
            <CrewImageField
              hasImage={
                Boolean(pendingImage) || (crew.hasImage && !removeImage)
              }
              previewSrc={
                pendingImage
                  ? `data:${pendingImage.mime};base64,${pendingImage.base64}`
                  : crew.hasImage && !removeImage
                    ? `/api/crews/${crew.id}/image?v=${encodeURIComponent(crew.updatedAt)}`
                    : null
              }
              onPick={(img) => {
                setPendingImage(img);
                setRemoveImage(false);
              }}
              onRemove={() => {
                setPendingImage(null);
                if (crew.hasImage) setRemoveImage(true);
              }}
              onError={setMessage}
            />
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-bold"
              >
                취소
              </button>
              <button
                type="button"
                disabled={savingSettings}
                onClick={() => void handleSaveSettings()}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold disabled:opacity-50"
              >
                {savingSettings ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function CrewPage() {
  const { user, requireAuth, refreshProfile } = useAuth();
  const [mine, setMine] = useState<MineState | null>(null);
  const [crews, setCrews] = useState<SerializedCrew[]>([]);
  const [areaCode, setAreaCode] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    areaCode: "all",
    maxMembers: CREW_MEMBERS_MAX,
  });
  const [pendingImage, setPendingImage] = useState<{
    base64: string;
    mime: string;
  } | null>(null);

  const loadMine = useCallback(async () => {
    if (!user) {
      setMine(null);
      return;
    }
    const res = await fetch("/api/crews/mine", { cache: "no-store" });
    if (res.ok) {
      setMine(await res.json());
    }
  }, [user]);

  const loadCrews = useCallback(async () => {
    const params = new URLSearchParams({ limit: "30" });
    if (q.trim()) params.set("q", q.trim());
    if (areaCode) params.set("areaCode", areaCode);
    const res = await fetch(`/api/crews?${params}`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setCrews(data.crews ?? []);
    }
  }, [q, areaCode]);

  useEffect(() => {
    queueMicrotask(() => {
      setLoading(true);
      void Promise.all([loadMine(), loadCrews()]).finally(() =>
        setLoading(false)
      );
    });
  }, [loadMine, loadCrews]);

  const handleCreate = async () => {
    setCreating(true);
    setMessage(null);
    try {
      const res = await fetch("/api/crews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description || null,
          areaCode: form.areaCode,
          maxMembers: form.maxMembers,
          imageBase64: pendingImage?.base64,
          imageMime: pendingImage?.mime,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "크루 생성에 실패했습니다.");
        return;
      }
      setShowCreate(false);
      setPendingImage(null);
      await refreshProfile();
      await loadMine();
      await loadCrews();
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async (crewId: string) => {
    requireAuth(async () => {
      setMessage(null);
      const res = await fetch(`/api/crews/${crewId}/join`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "가입 신청에 실패했습니다.");
        return;
      }
      setMessage("가입 신청을 보냈습니다. 리더 승인을 기다려 주세요.");
      await loadMine();
    });
  };

  const handleCancelPending = async () => {
    const res = await fetch("/api/crews/join-requests/mine", {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ?? "취소에 실패했습니다.");
      return;
    }
    setMessage("가입 신청을 취소했습니다.");
    await loadMine();
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (mine?.membership) {
    const { crew, role } = mine.membership;
    return (
      <CrewHome
        crew={crew}
        role={role}
        onChanged={async () => {
          await loadMine();
        }}
      />
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50 pb-[calc(6.5rem+env(safe-area-inset-bottom))]">
      <div className="max-w-lg mx-auto px-4 pt-safe">
        <div className="mt-4 flex items-center justify-between gap-2">
          <h1 className="text-lg font-extrabold text-gray-900">크루</h1>
          <button
            type="button"
            onClick={() =>
              requireAuth(() => {
                setShowCreate(true);
                setMessage(null);
              })
            }
            className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold"
          >
            만들기 ({CREW_CREATE_COST}P)
          </button>
        </div>

        {mine?.pendingRequest ? (
          <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-sm font-semibold text-amber-900">
              가입 승인 대기 중
            </p>
            <p className="text-xs text-amber-800 mt-1">
              {mine.pendingRequest.crew?.name ?? "크루"} 신청을 보냈습니다.
            </p>
            <button
              type="button"
              onClick={() => void handleCancelPending()}
              className="mt-2 text-xs font-bold text-amber-900 underline"
            >
              신청 취소
            </button>
          </div>
        ) : null}

        <div className="mt-3 space-y-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="크루명 검색"
            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white"
          />
          <select
            value={areaCode}
            onChange={(e) => setAreaCode(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white"
          >
            <option value="">전체 지역</option>
            {CREW_AREA_OPTIONS.map((area) => (
              <option key={area.code} value={area.code}>
                {area.name}
              </option>
            ))}
          </select>
        </div>

        {message ? (
          <p className="mt-3 text-sm text-gray-700 whitespace-pre-wrap">
            {message}
          </p>
        ) : null}

        <div className="mt-4 space-y-2">
          {crews.map((crew) => (
            <div
              key={crew.id}
              className="bg-white border border-gray-200 rounded-2xl p-3 flex items-center gap-3"
            >
              <div className="w-11 h-11 rounded-xl bg-gray-100 overflow-hidden shrink-0">
                {crew.hasImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/crews/${crew.id}/image?v=${encodeURIComponent(crew.updatedAt)}`}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm font-bold text-gray-400">
                    {crew.name.slice(0, 1)}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-gray-900 truncate">{crew.name}</p>
                <p className="text-[11px] text-gray-500">
                  {crew.areaLabel} · {crew.memberCount}/{crew.maxMembers}명
                </p>
              </div>
              <button
                type="button"
                disabled={Boolean(mine?.pendingRequest)}
                onClick={() => handleJoin(crew.id)}
                className="px-2.5 py-1.5 rounded-lg bg-gray-900 text-white text-[11px] font-bold disabled:opacity-40"
              >
                신청
              </button>
            </div>
          ))}
          {crews.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">
              표시할 크루가 없습니다.
            </p>
          ) : null}
        </div>
      </div>

      {showCreate ? (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-4 space-y-3">
            <h2 className="text-base font-extrabold text-gray-900">
              크루 만들기
            </h2>
            <label className="block text-sm">
              <span className="text-gray-700 font-medium">크루 이름</span>
              <input
                value={form.name}
                maxLength={CREW_NAME_MAX_LENGTH}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="text-gray-700 font-medium">소개</span>
              <textarea
                value={form.description}
                maxLength={CREW_DESCRIPTION_MAX_LENGTH}
                rows={3}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none"
              />
            </label>
            <CrewAreaSelect
              value={form.areaCode}
              onChange={(areaCode) => setForm({ ...form, areaCode })}
            />
            <CrewMaxMembersStepper
              value={form.maxMembers}
              onChange={(maxMembers) => setForm({ ...form, maxMembers })}
            />
            <CrewImageField
              hasImage={Boolean(pendingImage)}
              previewSrc={
                pendingImage
                  ? `data:${pendingImage.mime};base64,${pendingImage.base64}`
                  : null
              }
              onPick={setPendingImage}
              onRemove={() => setPendingImage(null)}
              onError={setMessage}
            />
            {message ? (
              <p className="text-sm text-red-600">{message}</p>
            ) : null}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowCreate(false);
                  setMessage(null);
                }}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-bold"
              >
                취소
              </button>
              <button
                type="button"
                disabled={creating}
                onClick={() => void handleCreate()}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold disabled:opacity-50"
              >
                {creating ? "생성 중..." : `${CREW_CREATE_COST}P로 만들기`}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
