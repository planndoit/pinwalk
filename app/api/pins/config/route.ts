import { NextResponse } from "next/server";
import {
  getMaxPinRadiusMeters,
  getPinPlacementRadiusMeters,
  getPinRadiusByCost,
} from "@/lib/env";

export async function GET() {
  return NextResponse.json({
    placementRadiusMeters: getPinPlacementRadiusMeters(),
    radiusByCost: getPinRadiusByCost(),
    maxRadiusMeters: getMaxPinRadiusMeters(),
  });
}
