"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

const tabs = [
  { href: "/", label: "지도", icon: MapIcon },
  { href: "/ranking", label: "랭킹", icon: RankingIcon },
  { href: "/my", label: "마이", icon: MyIcon },
] as const;

function MapIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill={active ? "#2563eb" : "#9ca3af"}>
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z" />
    </svg>
  );
}

function RankingIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill={active ? "#2563eb" : "#9ca3af"}>
      <path d="M5 21h14v-2H5v2zm2-4h10v-2H7v2zm2-4h6V7H9v6zM7 3v2h10V3H7z" />
    </svg>
  );
}

function MyIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill={active ? "#2563eb" : "#9ca3af"}>
      <path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v3h20v-3c0-3.3-6.7-5-10-5z" />
    </svg>
  );
}

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { requireAuth } = useAuth();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none">
      <div className="max-w-lg mx-auto px-4 pb-safe pointer-events-auto">
        <div className="bg-white/95 backdrop-blur border border-gray-200 rounded-2xl shadow-xl mb-3 flex">
          {tabs.map((tab) => {
            const active = pathname === tab.href;
            const Icon = tab.icon;

            if (tab.href === "/my") {
              return (
                <button
                  key={tab.href}
                  type="button"
                  onClick={() => {
                    requireAuth(() => {
                      router.push(tab.href);
                    });
                  }}
                  className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 ${
                    active ? "text-blue-600" : "text-gray-400"
                  }`}
                >
                  <Icon active={active} />
                  <span className="text-[11px] font-semibold">{tab.label}</span>
                </button>
              );
            }

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 ${
                  active ? "text-blue-600" : "text-gray-400"
                }`}
              >
                <Icon active={active} />
                <span className="text-[11px] font-semibold">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
