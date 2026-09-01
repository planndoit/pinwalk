import { NextResponse } from "next/server";
import {
  getCrewGuideSections,
  getFullGuideSections,
  getGameGuideSections,
  type GuideScope,
} from "@/lib/guide/gameGuide";

function resolveSections(scope: GuideScope) {
  switch (scope) {
    case "crew":
      return getCrewGuideSections();
    case "full":
      return getFullGuideSections();
    case "game":
    default:
      return getGameGuideSections();
  }
}

export async function GET(request: Request) {
  const scopeParam = new URL(request.url).searchParams.get("scope");
  const scope: GuideScope =
    scopeParam === "crew" || scopeParam === "full" ? scopeParam : "game";

  return NextResponse.json({ sections: resolveSections(scope) });
}
