"use client";

import { useEffect, useState } from "react";
import {
  AdminButton,
  AdminCard,
  AdminInput,
  AdminPageHeader,
  AdminSelect,
  AdminTable,
} from "@/components/admin/AdminUi";

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
  const [groups, setGroups] = useState<{ groupCode: string; groupName: string }[]>([]);
  const [form, setForm] = useState({
    groupCode: "PREMIUM_CATEGORY",
    code: "",
    name: "",
    sortOrder: "0",
  });
  const [message, setMessage] = useState<string | null>(null);

  const fetchData = async () => {
    const res = await fetch("/api/admin/common-codes");
    if (res.ok) {
      const data = await res.json();
      setCodes(data.codes ?? []);
      setGroups(data.groups ?? []);
    }
  };

  useEffect(() => {
    queueMicrotask(() => {
      void fetchData();
    });
  }, []);

  const handleAdd = async () => {
    const res = await fetch("/api/admin/common-codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        groupCode: form.groupCode,
        code: form.code,
        name: form.name,
        sortOrder: Number(form.sortOrder),
      }),
    });
    const data = await res.json();
    setMessage(res.ok ? "추가되었습니다." : data.error);
    if (res.ok) {
      setForm({ ...form, code: "", name: "" });
      void fetchData();
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    await fetch(`/api/admin/common-codes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    void fetchData();
  };

  return (
    <div>
      <AdminPageHeader title="공통코드 관리" />
      <AdminCard className="p-5 mb-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
        <AdminSelect label="그룹" value={form.groupCode} onChange={(e) => setForm({ ...form, groupCode: e.target.value })}>
          {groups.map((g) => (
            <option key={g.groupCode} value={g.groupCode}>{g.groupName}</option>
          ))}
        </AdminSelect>
        <AdminInput label="코드" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
        <AdminInput label="이름" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <AdminInput label="정렬" type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
        <div className="sm:col-span-4">
          <AdminButton onClick={handleAdd}>코드 추가</AdminButton>
        </div>
      </AdminCard>
      <AdminCard>
        <AdminTable headers={["그룹", "코드", "이름", "정렬", "상태", ""]}>
          {codes.map((c) => (
            <tr key={c.id} className="border-b border-gray-50">
              <td className="px-4 py-3">{c.groupCode}</td>
              <td className="px-4 py-3">{c.code}</td>
              <td className="px-4 py-3">{c.name}</td>
              <td className="px-4 py-3">{c.sortOrder}</td>
              <td className="px-4 py-3">{c.isActive ? "활성" : "비활성"}</td>
              <td className="px-4 py-3">
                <button type="button" className="text-sm text-blue-600" onClick={() => toggleActive(c.id, c.isActive)}>
                  {c.isActive ? "비활성화" : "활성화"}
                </button>
              </td>
            </tr>
          ))}
        </AdminTable>
      </AdminCard>
      {message && <p className="text-sm text-gray-600 mt-2">{message}</p>}
    </div>
  );
}
