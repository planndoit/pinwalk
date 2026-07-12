import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api/auth";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import {
  expireActiveSpawnsForCoupon,
  getCouponRegistrationCounts,
} from "@/lib/premium/coupons";
import { serializePremiumCoupon } from "@/lib/premium/serialize";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateCouponInput } from "@/lib/validation/premium";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json();
  const admin = createAdminClient();

  const { data: existing, error: existingError } = await admin
    .from("premium_coupons")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (existingError || !existing) {
    return jsonError("쿠폰을 찾을 수 없습니다.", 404);
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  const isPartialStatusOnly =
    body.title === undefined &&
    body.description === undefined &&
    body.benefit === undefined &&
    body.expiresAt === undefined &&
    (body.isActive !== undefined || body.issueLimit !== undefined);

  if (isPartialStatusOnly) {
    if (body.isActive !== undefined) {
      updates.is_active = body.isActive === true;
    }
    if (body.issueLimit !== undefined) {
      const issueLimit = Number(body.issueLimit);
      if (!Number.isInteger(issueLimit) || issueLimit < 0) {
        return jsonError("발행 개수는 0 이상의 정수로 입력해주세요.");
      }
      updates.issue_limit = issueLimit;
    }
  } else {
    const validation = validateCouponInput({
      title: body.title ?? existing.title,
      description: body.description ?? existing.description,
      benefit: body.benefit ?? existing.benefit,
      isActive: body.isActive ?? existing.is_active,
      expiresAt:
        body.expiresAt !== undefined ? body.expiresAt : existing.expires_at,
      issueLimit:
        body.issueLimit !== undefined ? body.issueLimit : existing.issue_limit,
    });
    if (!validation.valid) {
      return jsonError(validation.error);
    }
    updates.title = validation.data.title;
    updates.description = validation.data.description;
    updates.benefit = validation.data.benefit;
    updates.is_active = validation.data.isActive;
    updates.expires_at = validation.data.expiresAt;
    updates.issue_limit = validation.data.issueLimit;
  }

  const wasActive = existing.is_active === true;
  const nextActive =
    updates.is_active !== undefined ? updates.is_active === true : wasActive;

  const { data, error } = await admin
    .from("premium_coupons")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    return jsonError("쿠폰 수정에 실패했습니다.", 500);
  }

  if (wasActive && !nextActive) {
    await expireActiveSpawnsForCoupon(id);
  }

  const counts = await getCouponRegistrationCounts([id]);
  const count = counts.get(id);

  return NextResponse.json({
    coupon: serializePremiumCoupon(data, {
      registeredCount: count?.registeredCount ?? 0,
      usedCount: count?.usedCount ?? 0,
    }),
  });
}
