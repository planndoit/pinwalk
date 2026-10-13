import {
  PIN_HARVEST_HOURLY_PERCENT,
  PIN_HARVEST_MAX_HOURS,
  PIN_HARVEST_REMOTE_PERCENT,
} from "@/lib/constants";
import { createAdminClient } from "@/lib/supabase/admin";

export type HarvestMode = "direct" | "remote";

type HarvestPinsRow = {
  success: boolean;
  error_code: string | null;
  granted: number | null;
  harvest_total: number | null;
  pin_count: number | null;
  new_points: number | null;
};

export type HarvestPinsResult =
  | {
      ok: true;
      granted: number;
      harvestTotal: number;
      pinCount: number;
      points: number;
    }
  | {
      ok: false;
      errorCode: "invalid_mode" | "pin_not_found" | "nothing_to_harvest" | "failed";
    };

export function isHarvestMode(value: unknown): value is HarvestMode {
  return value === "direct" || value === "remote";
}

export async function harvestPins(
  userId: string,
  pinIds: string[] | null,
  mode: HarvestMode
): Promise<HarvestPinsResult> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .rpc("harvest_pins", {
      p_user_id: userId,
      p_pin_ids: pinIds,
      p_mode: mode,
      p_hourly_percent: PIN_HARVEST_HOURLY_PERCENT,
      p_max_hours: PIN_HARVEST_MAX_HOURS,
      p_remote_percent: PIN_HARVEST_REMOTE_PERCENT,
    })
    .single<HarvestPinsRow>();

  if (error || !data) {
    if (error) console.error("harvest_pins failed:", error);
    return { ok: false, errorCode: "failed" };
  }

  if (!data.success) {
    if (
      data.error_code === "invalid_mode" ||
      data.error_code === "pin_not_found" ||
      data.error_code === "nothing_to_harvest"
    ) {
      return { ok: false, errorCode: data.error_code };
    }
    return { ok: false, errorCode: "failed" };
  }

  return {
    ok: true,
    granted: Number(data.granted ?? 0),
    harvestTotal: Number(data.harvest_total ?? 0),
    pinCount: Number(data.pin_count ?? 0),
    points: Number(data.new_points ?? 0),
  };
}
