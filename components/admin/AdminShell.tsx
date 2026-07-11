"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const isLoginPage = pathname === "/admin/login";

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

  if (isLoginPage) {
    return <div className="min-h-screen bg-gray-50">{children}</div>;
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-sm text-gray-500">
        로딩 중...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0">
        <div className="px-5 py-5 border-b border-gray-100">
          <p className="text-lg font-bold text-gray-900">{SERVICE_NAME} 관리자</p>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {MENU.map((item) => {
            if ("href" in item) {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
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
        <div className="p-3 border-t border-gray-100">
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
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-8">{children}</div>
      </main>
    </div>
  );
}
