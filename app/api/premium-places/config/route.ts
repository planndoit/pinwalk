import { NextResponse } from "next/server";
import {
  getPremiumCouponClaimRadiusMeters,
  getPremiumCouponSpawnDistanceMeters,
  getPremiumPlaceRadiusMeters,
} from "@/lib/env";

export async function GET() {
  return NextResponse.json({
    radiusMeters: getPremiumPlaceRadiusMeters(),
    couponSpawnDistanceMeters: getPremiumCouponSpawnDistanceMeters(),
    couponClaimRadiusMeters: getPremiumCouponClaimRadiusMeters(),
  });
}
