import { createAdminClient } from "@/lib/supabase/admin";

export async function getCouponRegistrationCounts(
  couponIds: string[]
): Promise<Map<string, { registeredCount: number; usedCount: number }>> {
  const result = new Map<string, { registeredCount: number; usedCount: number }>();
  for (const id of couponIds) {
    result.set(id, { registeredCount: 0, usedCount: 0 });
  }
  if (couponIds.length === 0) return result;

  const admin = createAdminClient();
  const { data } = await admin
    .from("user_coupons")
    .select("coupon_id, status")
    .in("coupon_id", couponIds);

  for (const row of data ?? []) {
    const entry = result.get(row.coupon_id);
    if (!entry) continue;
    entry.registeredCount += 1;
    if (row.status === "used") entry.usedCount += 1;
  }

  return result;
}

export async function countCouponRegistrations(couponId: string): Promise<number> {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("user_coupons")
    .select("id", { count: "exact", head: true })
    .eq("coupon_id", couponId);

  if (error) return Number.MAX_SAFE_INTEGER;
  return count ?? 0;
}

export async function expireActiveSpawnsForCoupon(couponId: string): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("premium_coupon_spawns")
    .update({ status: "expired" })
    .eq("coupon_id", couponId)
    .eq("status", "active");
}
