"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  AdminCard,
  AdminInput,
  AdminPageHeader,
  AdminTable,
} from "@/components/admin/AdminUi";
import {
  CREW_AREA_OPTIONS,
  CREW_DESCRIPTION_MAX_LENGTH,
  CREW_MEMBERS_MAX,
  CREW_MEMBERS_MIN,
  CREW_NAME_MAX_LENGTH,
} from "@/lib/constants";
import { useSubmitLock } from "@/lib/useSubmitLock";
import type { SerializedCrew, SerializedCrewMember } from "@/types/crew";

type AdminMember = SerializedCrewMember & { username: string | null };

export default function AdminCrewDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const crewId = params.id;
  const [crew, setCrew] = useState<SerializedCrew | null>(null);
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const { locked: saving, run } = useSubmitLock();
  const [form, setForm] = useState({
    name: "",
    description: "",
    areaCode: "all",
    maxMembers: CREW_MEMBERS_MAX,
  });

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/crews/${crewId}`, { cache: "no-store" });
    if (!res.ok) {
      setCrew(null);
      return;
    }
    const data = await res.json();
    const next = data.crew as SerializedCrew;
    setCrew(next);
    setMembers(data.members ?? []);
    setForm({
      name: next.name,
      description: next.description ?? "",
      areaCode: next.areaCode,
      maxMembers: next.maxMembers,
    });
  }, [crewId]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  const handleSave = () => {
    void run(async () => {
      setMessage(null);
      const res = await fetch(`/api/admin/crews/${crewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description || null,
          areaCode: form.areaCode,
          maxMembers: form.maxMembers,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "저장에 실패했습니다.");
        return "release";
      }
      setMessage("저장했습니다.");
      await load();
      return "release";
    });
  };

  const handleDissolve = () => {
    if (!window.confirm("이 크루를 강제 해산할까요? 복구할 수 없습니다.")) {
      return;
    }
    void run(async () => {
      const res = await fetch(`/api/admin/crews/${crewId}/dissolve`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "해산에 실패했습니다.");
        return "release";
      }
      router.push("/admin/crews");
      return "keep";
    });
  };

  if (!crew) {
    return (
      <div>
        <AdminPageHeader title="크루 상세" />
        <p className="text-sm text-gray-500">크루를 불러오는 중이거나 없습니다.</p>
        <Link href="/admin/crews" className="text-blue-600 text-sm mt-2 inline-block">
          목록으로
        </Link>
      </div>
    );
  }

  return (
    <div>
      <AdminPageHeader
        title={crew.name}
        description={`${crew.areaLabel} · ${crew.status === "active" ? "활성" : "해산"}`}
      />
      {message ? (
        <p className="mb-3 text-sm text-gray-700">{message}</p>
      ) : null}

      <AdminCard className="p-4 mb-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <AdminInput
            label="이름"
            value={form.name}
            maxLength={CREW_NAME_MAX_LENGTH}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            disabled={crew.status !== "active"}
          />
          <label className="text-sm block">
            <span className="text-gray-600">활동지역</span>
            <select
              value={form.areaCode}
              disabled={crew.status !== "active"}
              onChange={(e) => setForm({ ...form, areaCode: e.target.value })}
              className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            >
              {CREW_AREA_OPTIONS.map((area) => (
                <option key={area.code} value={area.code}>
                  {area.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm block sm:col-span-2">
            <span className="text-gray-600">소개</span>
            <textarea
              value={form.description}
              maxLength={CREW_DESCRIPTION_MAX_LENGTH}
              disabled={crew.status !== "active"}
              rows={3}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none"
            />
          </label>
          <AdminInput
            label={`인원 상한 (${CREW_MEMBERS_MIN}~${CREW_MEMBERS_MAX})`}
            type="number"
            min={CREW_MEMBERS_MIN}
            max={CREW_MEMBERS_MAX}
            value={form.maxMembers}
            disabled={crew.status !== "active"}
            onChange={(e) =>
              setForm({
                ...form,
                maxMembers:
                  Number.parseInt(e.target.value, 10) || CREW_MEMBERS_MIN,
              })
            }
          />
          <div className="text-sm text-gray-600 self-end pb-2">
            현재 인원 {crew.memberCount}명 · 전투력{" "}
            {(crew.combatPower ?? 0).toLocaleString()}P
          </div>
        </div>
        {crew.status === "active" ? (
          <div className="flex gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSave()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {saving ? "저장 중..." : "저장"}
            </button>
            <button
              type="button"
              onClick={() => void handleDissolve()}
              className="px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium"
            >
              강제 해산
            </button>
          </div>
        ) : null}
      </AdminCard>

      <AdminCard>
        <h2 className="px-4 pt-4 text-sm font-bold text-gray-900">크루원</h2>
        <AdminTable
          headers={["닉네임", "아이디", "역할", "전투력", "공략", "가입일"]}
        >
          {members.map((member) => (
            <tr key={member.userId} className="border-b border-gray-50">
              <td className="px-4 py-3 font-medium">{member.nickname}</td>
              <td className="px-4 py-3 text-gray-600">
                {member.username ?? "-"}
              </td>
              <td className="px-4 py-3">
                {member.role === "leader" ? "리더" : "멤버"}
              </td>
              <td className="px-4 py-3">
                {member.combatPower.toLocaleString()}P
              </td>
              <td className="px-4 py-3">{member.landmarkConquests}곳</td>
              <td className="px-4 py-3 text-gray-500">
                {new Date(member.joinedAt).toLocaleString("ko-KR")}
              </td>
            </tr>
          ))}
        </AdminTable>
        {members.length === 0 ? (
          <p className="p-6 text-center text-sm text-gray-500">멤버가 없습니다.</p>
        ) : null}
      </AdminCard>
    </div>
  );
}
