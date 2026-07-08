import {
  CONQUER_BASE_COST,
  type ConquerProbability,
} from "./constants";

export function calculateConquerCost(
  probability: ConquerProbability
): number {
  return Math.ceil(
    CONQUER_BASE_COST * (probability / 100) * 1.1
  );
}

// 점령 실패 시 방어자에게 지급하는 보상.
// 비용 추가분(원금의 10%)의 절반(=원금의 5%)에 해당한다.
export function calculateDefenseReward(
  probability: ConquerProbability
): number {
  return Math.round(CONQUER_BASE_COST * (probability / 100) * 0.05);
}

export function rollConquerSuccess(
  probability: ConquerProbability
): boolean {
  const roll = Math.random() * 100;
  return roll < probability;
}
