"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import MissionPage from "@/components/mission/MissionPage";

export default function Page() {
  const { user, loading, openAuthModal } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      openAuthModal("login");
      router.replace("/");
    }
  }, [loading, user, openAuthModal, router]);

  if (loading || !user) {
    return (
      <div className="flex h-dvh items-center justify-center bg-gray-50">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return <MissionPage />;
}
