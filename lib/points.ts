import { DEFAULT_PIN_COST, type ConquerProbability } from "./constants";

/** 점령 시도 비용: ⌈투자 포인트 × (선택 확률 / 100) × 1.1⌉ */
export function calculateConquerCost(
  probability: ConquerProbability,
  pinCost: number = DEFAULT_PIN_COST
): number {
  return Math.ceil(pinCost * (probability / 100) * 1.1);
}

// 점령 실패 시 방어자에게 지급하는 보상.
// 비용 추가분(원금의 10%)의 절반(=원금의 5%)에 해당한다.
export function calculateDefenseReward(
  probability: ConquerProbability,
  pinCost: number = DEFAULT_PIN_COST
): number {
  return Math.round(pinCost * (probability / 100) * 0.05);
}

export function rollConquerSuccess(probability: ConquerProbability): boolean {
  const roll = Math.random() * 100;
  return roll < probability;
}
