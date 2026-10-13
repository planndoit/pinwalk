import {
  PIN_HARVEST_HOURLY_PERCENT,
  PIN_HARVEST_MAX_HOURS,
  PIN_HARVEST_REMOTE_PERCENT,
} from "@/lib/constants";

const HOUR_MS = 60 * 60 * 1000;

export type PinHarvestSource = {
  cost: number;
  harvest_stored: number;
  harvest_settled_at: string;
};

export type PinHarvestState = {
  amount: number;
  limit: number;
  hourly: number;
  hoursUntilFull: number;
  isFull: boolean;
  remoteAmount: number;
};

function getHourIndex(ms: number): number {
  return Math.floor(ms / HOUR_MS);
}

export function getPinHarvestHourly(cost: number): number {
  return Math.floor((cost * PIN_HARVEST_HOURLY_PERCENT) / 100);
}

export function getPinHarvestLimit(cost: number): number {
  return getPinHarvestHourly(cost) * PIN_HARVEST_MAX_HOURS;
}

/** 원격 수확으로 1P 이상 받기 위해 필요한 최소 수확 포인트. */
export const REMOTE_HARVEST_MIN_TOTAL = Math.ceil(
  100 / PIN_HARVEST_REMOTE_PERCENT
);

export function getRemoteHarvestAmount(total: number): number {
  return Math.floor((total * PIN_HARVEST_REMOTE_PERCENT) / 100);
}

export function getPinHarvestState(
  pin: PinHarvestSource,
  nowMs: number
): PinHarvestState {
  const hourly = getPinHarvestHourly(pin.cost);
  const limit = getPinHarvestLimit(pin.cost);
  const settledMs = new Date(pin.harvest_settled_at).getTime();
  const elapsedHours = Number.isFinite(settledMs)
    ? Math.max(0, getHourIndex(nowMs) - getHourIndex(settledMs))
    : 0;
  const amount = Math.min(
    limit,
    Math.max(0, pin.harvest_stored) + elapsedHours * hourly
  );
  const hoursUntilFull =
    hourly > 0 ? Math.max(0, Math.ceil((limit - amount) / hourly)) : 0;

  return {
    amount,
    limit,
    hourly,
    hoursUntilFull,
    isFull: amount >= limit,
    remoteAmount: getRemoteHarvestAmount(amount),
  };
}
