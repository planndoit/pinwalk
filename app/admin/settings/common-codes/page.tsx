"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AdminButton,
  AdminCard,
  AdminInput,
  AdminPageHeader,
  AdminTable,
} from "@/components/admin/AdminUi";

interface GroupRow {
  groupCode: string;
  groupName: string;
  description: string | null;
  isActive: boolean;
}

interface CodeRow {
  id: string;
  groupCode: string;
  code: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
}

export default function AdminCommonCodesPage() {
  const [codes, setCodes] = useState<CodeRow[]>([]);
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [selectedGroupCode, setSelectedGroupCode] = useState<string | null>(
    null
  );
  const [showCodeForm, setShowCodeForm] = useState(false);
  const [codeForm, setCodeForm] = useState({
    code: "",
    name: "",
  });
  const [message, setMessage] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editingNameValue, setEditingNameValue] = useState("");
  const [savingName, setSavingName] = useState(false);

  const fetchData = async (preferGroupCode?: string | null) => {
    const res = await fetch("/api/admin/common-codes");
    if (!res.ok) return;

    const data = await res.json();
    const nextGroups = (data.groups ?? []) as GroupRow[];
    const nextCodes = (data.codes ?? []) as CodeRow[];
    setGroups(nextGroups);
    setCodes(nextCodes);

    setSelectedGroupCode((current) => {
      const preferred = preferGroupCode ?? current;
      if (preferred && nextGroups.some((g) => g.groupCode === preferred)) {
        return preferred;
      }
      return nextGroups[0]?.groupCode ?? null;
    });
  };

  useEffect(() => {
    queueMicrotask(() => {
      void fetchData(null);
    });
  }, []);

  const selectedGroup = useMemo(
    () => groups.find((g) => g.groupCode === selectedGroupCode) ?? null,
    [groups, selectedGroupCode]
  );

  const filteredCodes = useMemo(
    () =>
      selectedGroupCode
        ? codes
            .filter((c) => c.groupCode === selectedGroupCode)
            .slice()
            .sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code))
        : [],
    [codes, selectedGroupCode]
  );

  const persistOrder = async (ordered: CodeRow[]) => {
    if (!selectedGroupCode) return;
    setSavingOrder(true);
    const res = await fetch("/api/admin/common-codes", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        groupCode: selectedGroupCode,
        orderedIds: ordered.map((c) => c.id),
      }),
    });
    const data = await res.json();
    setSavingOrder(false);
    if (!res.ok) {
      setMessage(data.error ?? "코드 순서 저장에 실패했습니다.");
      void fetchData(selectedGroupCode);
      return;
    }
    setCodes((prev) => {
      const others = prev.filter((c) => c.groupCode !== selectedGroupCode);
      const reordered = ordered.map((c, index) => ({
        ...c,
        sortOrder: index + 1,
      }));
      return [...others, ...reordered];
    });
  };

  const handleAddCode = async () => {
    if (!selectedGroupCode) {
      setMessage("왼쪽에서 코드 그룹을 먼저 선택해주세요.");
      return;
    }

    const res = await fetch("/api/admin/common-codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        groupCode: selectedGroupCode,
        code: codeForm.code,
        name: codeForm.name,
      }),
    });
    const data = await res.json();
    setMessage(res.ok ? "코드가 추가되었습니다." : data.error);
    if (res.ok) {
      setCodeForm({ code: "", name: "" });
      setShowCodeForm(false);
      void fetchData(selectedGroupCode);
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    const res = await fetch(`/api/admin/common-codes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ?? "공통코드 수정에 실패했습니다.");
      return;
    }
    setCodes((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isActive: !isActive } : c))
    );
    setMessage(!isActive ? "활성화되었습니다." : "비활성화되었습니다.");
  };

  const startEditName = (code: CodeRow) => {
    setEditingNameId(code.id);
    setEditingNameValue(code.name);
    setMessage(null);
  };

  const cancelEditName = () => {
    setEditingNameId(null);
    setEditingNameValue("");
  };

  const saveName = async (id: string, originalName: string) => {
    const nextName = editingNameValue.trim();
    if (!nextName) {
      setMessage("이름을 입력해주세요.");
      return;
    }
    if (nextName === originalName) {
      cancelEditName();
      return;
    }

    setSavingName(true);
    const res = await fetch(`/api/admin/common-codes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nextName }),
    });
    const data = await res.json();
    setSavingName(false);

    if (!res.ok) {
      setMessage(data.error ?? "이름 수정에 실패했습니다.");
      return;
    }

    setCodes((prev) =>
      prev.map((c) => (c.id === id ? { ...c, name: nextName } : c))
    );
    cancelEditName();
    setMessage("이름이 수정되었습니다.");
  };

  const handleDropOn = async (targetId: string) => {
    if (!dragId || dragId === targetId || !selectedGroupCode) {
      setDragId(null);
      return;
    }

    const list = filteredCodes.slice();
    const fromIndex = list.findIndex((c) => c.id === dragId);
    const toIndex = list.findIndex((c) => c.id === targetId);
    setDragId(null);
    if (fromIndex < 0 || toIndex < 0) return;

    const [moved] = list.splice(fromIndex, 1);
    list.splice(toIndex, 0, moved);
    await persistOrder(list);
  };

  return (
    <div>
      <AdminPageHeader title="공통코드 관리" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AdminCard>
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">코드 그룹</p>
            <p className="text-xs text-gray-500 mt-0.5">
              그룹은 소스/마이그레이션으로 관리됩니다. 선택 후 오른쪽에서 코드를
              추가하세요.
            </p>
          </div>

          <AdminTable headers={["그룹 코드", "그룹명", "상태"]}>
            {groups.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  className="px-4 py-8 text-center text-sm text-gray-400"
                >
                  등록된 코드 그룹이 없습니다.
                </td>
              </tr>
            ) : (
              groups.map((g) => {
                const selected = g.groupCode === selectedGroupCode;
                return (
                  <tr
                    key={g.groupCode}
                    onClick={() => {
                      setSelectedGroupCode(g.groupCode);
                      setShowCodeForm(false);
                      setMessage(null);
                    }}
                    className={`border-b border-gray-50 cursor-pointer ${
                      selected
                        ? "bg-blue-50/80"
                        : "hover:bg-gray-50/70"
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {g.groupCode}
                    </td>
                    <td className="px-4 py-3">{g.groupName}</td>
                    <td className="px-4 py-3">
                      {g.isActive ? "활성" : "비활성"}
                    </td>
                  </tr>
                );
              })
            )}
          </AdminTable>
        </AdminCard>

        <AdminCard>
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100">
            <div>
              <p className="text-sm font-semibold text-gray-900">코드</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {selectedGroup
                  ? `${selectedGroup.groupName} (${selectedGroup.groupCode})`
                  : "왼쪽에서 코드 그룹을 선택해주세요."}
                {savingOrder ? " · 순서 저장 중..." : " · 드래그해서 순서 변경"}
              </p>
            </div>
            <AdminButton
              type="button"
              disabled={!selectedGroupCode}
              onClick={() => {
                setShowCodeForm((open) => !open);
                setMessage(null);
              }}
            >
              코드 추가
            </AdminButton>
          </div>

          {showCodeForm && selectedGroupCode && (
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/70 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <AdminInput
                  label="코드"
                  value={codeForm.code}
                  onChange={(e) =>
                    setCodeForm({ ...codeForm, code: e.target.value })
                  }
                  placeholder="CAFE"
                />
                <AdminInput
                  label="이름"
                  value={codeForm.name}
                  onChange={(e) =>
                    setCodeForm({ ...codeForm, name: e.target.value })
                  }
                  placeholder="카페"
                />
              </div>
              <div className="flex gap-2">
                <AdminButton type="button" onClick={handleAddCode}>
                  추가
                </AdminButton>
                <AdminButton
                  type="button"
                  variant="secondary"
                  onClick={() => setShowCodeForm(false)}
                >
                  취소
                </AdminButton>
              </div>
            </div>
          )}

          <AdminTable headers={["", "코드", "이름", "상태", ""]}>
            {!selectedGroupCode ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-sm text-gray-400"
                >
                  코드 그룹을 선택하면 목록이 표시됩니다.
                </td>
              </tr>
            ) : filteredCodes.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-sm text-gray-400"
                >
                  이 그룹에 등록된 코드가 없습니다.
                </td>
              </tr>
            ) : (
              filteredCodes.map((c) => (
                <tr
                  key={c.id}
                  draggable={editingNameId !== c.id}
                  onDragStart={() => {
                    if (editingNameId === c.id) return;
                    setDragId(c.id);
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    void handleDropOn(c.id);
                  }}
                  onDragEnd={() => setDragId(null)}
                  className={`border-b border-gray-50 ${
                    dragId === c.id ? "bg-blue-50/60 opacity-70" : "bg-white"
                  }`}
                >
                  <td className="px-3 py-3 text-gray-300 cursor-grab active:cursor-grabbing select-none w-8">
                    ⋮⋮
                  </td>
                  <td className="px-4 py-3 font-medium">{c.code}</td>
                  <td className="px-4 py-3">
                    {editingNameId === c.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          autoFocus
                          value={editingNameValue}
                          disabled={savingName}
                          onChange={(e) => setEditingNameValue(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              void saveName(c.id, c.name);
                            }
                            if (e.key === "Escape") {
                              e.preventDefault();
                              cancelEditName();
                            }
                          }}
                          className="w-full min-w-[8rem] px-2 py-1.5 border border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        />
                        <button
                          type="button"
                          disabled={savingName}
                          className="text-sm text-blue-600 shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            void saveName(c.id, c.name);
                          }}
                        >
                          저장
                        </button>
                        <button
                          type="button"
                          disabled={savingName}
                          className="text-sm text-gray-500 shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            cancelEditName();
                          }}
                        >
                          취소
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="text-left hover:text-blue-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditName(c);
                        }}
                      >
                        {c.name}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {c.isActive ? "활성" : "비활성"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      className="text-sm text-blue-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        void toggleActive(c.id, c.isActive);
                      }}
                    >
                      {c.isActive ? "비활성화" : "활성화"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </AdminTable>
        </AdminCard>
      </div>

      {message && <p className="text-sm text-gray-600 mt-3">{message}</p>}
    </div>
  );
}
