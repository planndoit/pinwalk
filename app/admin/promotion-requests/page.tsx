"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AdminCard,
  AdminPageHeader,
  AdminTable,
  StatusBadge,
} from "@/components/admin/AdminUi";
import { formatActivityDate } from "@/lib/formatDate";

interface RequestRow {
  id: string;
  storeName: string;
  categoryName: string | null;
  contactName: string;
  status: string;
  createdAt: string;
}

export default function AdminPromotionRequestsPage() {
  const [requests, setRequests] = useState<RequestRow[]>([]);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/admin/promotion-requests");
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests ?? []);
      }
    })();
  }, []);

  return (
    <div>
      <AdminPageHeader title="프리미엄 홍보 요청 관리" />
      <AdminCard>
        <AdminTable headers={["가게명", "카테고리", "담당자", "상태", "요청일", ""]}>
          {requests.map((r) => (
            <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/50">
              <td className="px-4 py-3 font-medium">{r.storeName}</td>
              <td className="px-4 py-3">{r.categoryName ?? "-"}</td>
              <td className="px-4 py-3">{r.contactName}</td>
              <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
              <td className="px-4 py-3 text-gray-500">{formatActivityDate(r.createdAt)}</td>
              <td className="px-4 py-3 text-right">
                <Link href={`/admin/promotion-requests/${r.id}`} className="text-blue-600 text-sm font-medium">
                  상세
                </Link>
              </td>
            </tr>
          ))}
        </AdminTable>
      </AdminCard>
    </div>
  );
}
