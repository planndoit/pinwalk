"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import MyPage from "@/components/my/MyPage";

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
      <div className="h-dvh flex items-center justify-center bg-gray-50">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <MyPage />;
}
