"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  AdminPageMetaProvider,
  getAdminRouteMeta,
  useAdminPageMeta,
} from "@/components/admin/AdminPageMeta";
import { SERVICE_NAME } from "@/lib/constants";

const MENU = [
  { href: "/admin", label: "대시보드" },
  { href: "/admin/members", label: "회원관리" },
  {
    label: "콘텐츠관리",
    children: [
      { href: "/admin/promotion-requests", label: "프리미엄 홍보 요청 관리" },
      { href: "/admin/premium-places", label: "프리미엄 장소 관리" },
    ],
  },
  {
    label: "설정",
    children: [
      { href: "/admin/settings/common-codes", label: "공통코드 관리" },
      { href: "/admin/settings/password", label: "비밀번호 변경" },
    ],
  },
] as const;

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      {open ? (
        <>
          <path d="M6 6l12 12" />
          <path d="M18 6L6 18" />
        </>
      ) : (
        <>
          <path d="M4 7h16" />
          <path d="M4 12h16" />
          <path d="M4 17h16" />
        </>
      )}
    </svg>
  );
}

function AdminTopBar({
  sidebarOpen,
  isMobile,
  onToggleSidebar,
}: {
  sidebarOpen: boolean;
  isMobile: boolean;
  onToggleSidebar: () => void;
}) {
  const pathname = usePathname();
  const { meta } = useAdminPageMeta();
  const routeMeta = getAdminRouteMeta(pathname);
  const title = meta.title || routeMeta.title;
  const description = meta.description ?? routeMeta.description;

  return (
    <div className="shrink-0 z-20 bg-gray-50/90 backdrop-blur border-b border-gray-200 px-4 sm:px-8 py-2.5 flex items-center gap-3 min-w-0">
      <button
        type="button"
        onClick={onToggleSidebar}
        className="w-9 h-9 shrink-0 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 flex items-center justify-center"
        aria-label={sidebarOpen ? "메뉴 숨기기" : "메뉴 열기"}
      >
        <MenuIcon open={sidebarOpen && isMobile} />
      </button>
      <div className="flex items-baseline gap-2.5 min-w-0 flex-1">
        <h1 className="text-base font-semibold text-gray-900 shrink-0">
          {title}
        </h1>
        {description ? (
          <p className="text-sm text-gray-500 truncate">{description}</p>
        ) : null}
      </div>
    </div>
  );
}

function AdminShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => {
      const mobile = mq.matches;
      setIsMobile(mobile);
      setSidebarOpen(!mobile);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (isLoginPage) {
      queueMicrotask(() => setReady(true));
      return;
    }

    queueMicrotask(() => {
      void (async () => {
        const res = await fetch("/api/admin/auth/me");
        const data = await res.json();
        if (!data.authenticated) {
          router.replace("/admin/login");
          return;
        }
        setReady(true);
      })();
    });
  }, [isLoginPage, router, pathname]);

  const closeSidebarOnMobile = useCallback(() => {
    if (isMobile) setSidebarOpen(false);
  }, [isMobile]);

  if (isLoginPage) {
    return (
      <div className="h-dvh overflow-y-auto bg-gray-50">{children}</div>
    );
  }

  if (!ready) {
    return (
      <div className="h-dvh bg-white flex items-center justify-center text-sm text-gray-500">
        로딩 중...
      </div>
    );
  }

  return (
    <div className="h-dvh bg-gray-50 flex overflow-hidden">
      {sidebarOpen && isMobile && (
        <button
          type="button"
          aria-label="메뉴 닫기"
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`bg-white border-r border-gray-200 flex flex-col shrink-0 z-40 transition-transform duration-200 ${
          isMobile
            ? `fixed inset-y-0 left-0 w-64 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`
            : sidebarOpen
              ? "relative w-64"
              : "relative w-0 overflow-hidden border-r-0"
        }`}
      >
        <div className="px-5 py-5 border-b border-gray-100 flex items-center justify-between gap-2">
          <Link
            href="/admin"
            onClick={closeSidebarOnMobile}
            className="text-lg font-bold text-gray-900 hover:text-blue-700 truncate"
          >
            {SERVICE_NAME} 관리자
          </Link>
          {isMobile && (
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="w-8 h-8 rounded-lg text-gray-500 hover:bg-gray-100 flex items-center justify-center shrink-0"
              aria-label="메뉴 닫기"
            >
              <MenuIcon open />
            </button>
          )}
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto w-64">
          {MENU.map((item) => {
            if ("href" in item) {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeSidebarOnMobile}
                  className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                    active
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {item.label}
                </Link>
              );
            }

            return (
              <div key={item.label} className="pt-2">
                <p className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  {item.label}
                </p>
                {item.children.map((child) => {
                  const active = pathname.startsWith(child.href);
                  return (
                    <Link
                      key={child.href}
                      href={child.href}
                      onClick={closeSidebarOnMobile}
                      className={`block px-3 py-2 rounded-lg text-sm ${
                        active
                          ? "bg-blue-50 text-blue-700 font-medium"
                          : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {child.label}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>
        <div className="p-3 border-t border-gray-100 w-64">
          <button
            type="button"
            onClick={async () => {
              await fetch("/api/admin/auth/logout", { method: "POST" });
              router.replace("/admin/login");
            }}
            className="w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg"
          >
            로그아웃
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
        <AdminTopBar
          sidebarOpen={sidebarOpen}
          isMobile={isMobile}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
        />
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="max-w-6xl mx-auto p-4 sm:p-8">{children}</div>
        </div>
      </main>
    </div>
  );
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <AdminPageMetaProvider>
      <AdminShellInner>{children}</AdminShellInner>
    </AdminPageMetaProvider>
  );
}
