"use client";

import { usePathname } from "next/navigation";
import HomePage from "@/components/HomePage";
import BottomNav from "./BottomNav";

const MAIN_TAB_PATHS = ["/", "/ranking", "/my"] as const;

function isMainTabPath(pathname: string): boolean {
  return (MAIN_TAB_PATHS as readonly string[]).includes(pathname);
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
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
            ? "absolute inset-0 z-0"
            : "absolute inset-0 z-0 invisible pointer-events-none"
        }
        aria-hidden={!isMapTab}
      >
        <HomePage active={isMapTab} />
      </div>

      {!isMapTab && (
        <div className="relative z-10 h-dvh w-full overflow-hidden">
          {children}
        </div>
      )}

      <BottomNav />
    </div>
  );
}
