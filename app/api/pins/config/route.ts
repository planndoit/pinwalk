import { NextResponse } from "next/server";
import { getMaxPinRadiusMeters, getPinRadiusByCost } from "@/lib/env";

export async function GET() {
  return NextResponse.json({
    radiusByCost: getPinRadiusByCost(),
    maxRadiusMeters: getMaxPinRadiusMeters(),
  });
}
