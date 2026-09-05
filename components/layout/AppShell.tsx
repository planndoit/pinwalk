"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import HomePage from "@/components/HomePage";
import BottomNav from "./BottomNav";

const MAIN_TAB_PATHS = ["/", "/ranking", "/crew", "/my"] as const;

function isMainTabPath(pathname: string): boolean {
  return (MAIN_TAB_PATHS as readonly string[]).includes(pathname);
}

function isAdminPath(pathname: string): boolean {
  return pathname.startsWith("/admin");
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (isAdminPath(pathname)) {
    return <>{children}</>;
  }

  const isMainTab = isMainTabPath(pathname);
  const isMapTab = pathname === "/";

  if (!isMainTab) {
    return (
      <div className="relative h-dvh w-full overflow-hidden">{children}</div>
    );
  }

  return (
    <div className="relative h-dvh w-full overflow-hidden">
      <div
        className={
          isMapTab
            ? "absolute inset-0"
            : "absolute inset-0 invisible pointer-events-none"
        }
        aria-hidden={!isMapTab}
      >
        <Suspense fallback={null}>
          <HomePage active={isMapTab} />
        </Suspense>
      </div>

      {!isMapTab && (
        <div className="absolute inset-0 overflow-hidden">
          {children}
        </div>
      )}

      <BottomNav />
    </div>
  );
}
