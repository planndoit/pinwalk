"use client";

import { Suspense } from "react";
import AdminPremiumPlaceNewPage from "./PremiumPlaceNewContent";

export default function Page() {
  return (
    <Suspense fallback={<p className="text-sm text-gray-500">로딩 중...</p>}>
      <AdminPremiumPlaceNewPage />
    </Suspense>
  );
}
