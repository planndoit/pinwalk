import Link from "next/link";
import GuideContent from "@/components/guide/GuideContent";
import { getFullGuideSections } from "@/lib/guide/gameGuide";
import { SERVICE_NAME } from "@/lib/constants";

export const metadata = {
  title: "이용 가이드",
  description: `${SERVICE_NAME} 포인트, 깃발 점령, 랜드마크, 크루 이용 방법`,
};

export default function GuidePage() {
  const sections = getFullGuideSections();

  return (
    <div className="h-dvh overflow-y-auto bg-gray-50 pb-safe">
      <div className="max-w-lg mx-auto">
        <header className="px-4 pt-safe pb-3 bg-white border-b border-gray-100">
          <div className="mt-2 flex items-center gap-3">
            <Link
              href="/"
              className="shrink-0 text-sm font-semibold text-blue-600"
            >
              ← 지도
            </Link>
            <div className="min-w-0">
              <h1 className="text-xl font-extrabold text-gray-900 truncate">
                이용 가이드
              </h1>
              <p className="text-xs text-gray-400 mt-1">
                {SERVICE_NAME} 기본 플레이 방법
              </p>
            </div>
          </div>
        </header>

        <div className="px-4 py-5">
          <GuideContent sections={sections} />
        </div>
      </div>
    </div>
  );
}
