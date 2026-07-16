import { NextResponse } from "next/server";
import { getPinPlacementRadiusMeters } from "@/lib/env";

export async function GET() {
  return NextResponse.json({
    placementRadiusMeters: getPinPlacementRadiusMeters(),
  });
}
