"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

export interface AdminPageMeta {
  title: string;
  description?: string;
}

interface AdminPageMetaContextValue {
  meta: AdminPageMeta;
  setPageMeta: (meta: AdminPageMeta) => void;
}

const AdminPageMetaContext = createContext<AdminPageMetaContextValue | null>(
  null
);

const ROUTE_META: { test: (pathname: string) => boolean; meta: AdminPageMeta }[] =
  [
    {
      test: (p) => p === "/admin",
      meta: {
        title: "대시보드",
        description: "서비스 주요 지표를 한눈에 확인합니다.",
      },
    },
    {
      test: (p) => p === "/admin/members",
      meta: {
        title: "회원관리",
        description: "회원 목록을 검색하고 상세를 확인합니다.",
      },
    },
    {
      test: (p) => /^\/admin\/members\/[^/]+$/.test(p),
      meta: { title: "회원 상세" },
    },
    {
      test: (p) => p === "/admin/promotion-requests",
      meta: { title: "프리미엄 홍보 요청 관리" },
    },
    {
      test: (p) => /^\/admin\/promotion-requests\/[^/]+$/.test(p),
      meta: { title: "홍보 요청 상세" },
    },
    {
      test: (p) => p === "/admin/premium-places",
      meta: { title: "프리미엄 장소 관리" },
    },
    {
      test: (p) => p === "/admin/premium-places/new",
      meta: { title: "프리미엄 장소 추가" },
    },
    {
      test: (p) => /^\/admin\/premium-places\/[^/]+$/.test(p),
      meta: { title: "프리미엄 장소 상세" },
    },
    {
      test: (p) => p === "/admin/settings/common-codes",
      meta: { title: "공통코드 관리" },
    },
    {
      test: (p) => p === "/admin/settings/password",
      meta: { title: "비밀번호 변경" },
    },
  ];

export function getAdminRouteMeta(pathname: string): AdminPageMeta {
  for (const route of ROUTE_META) {
    if (route.test(pathname)) return route.meta;
  }
  return { title: "관리자" };
}

export function AdminPageMetaProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [meta, setMeta] = useState<AdminPageMeta>({ title: "" });

  const setPageMeta = useCallback((next: AdminPageMeta) => {
    setMeta(next);
  }, []);

  const value = useMemo(
    () => ({ meta, setPageMeta }),
    [meta, setPageMeta]
  );

  return (
    <AdminPageMetaContext.Provider value={value}>
      {children}
    </AdminPageMetaContext.Provider>
  );
}

export function useAdminPageMeta() {
  const ctx = useContext(AdminPageMetaContext);
  if (!ctx) {
    throw new Error("useAdminPageMeta must be used within AdminPageMetaProvider");
  }
  return ctx;
}
