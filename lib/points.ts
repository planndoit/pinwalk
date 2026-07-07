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

export function rollConquerSuccess(
  probability: ConquerProbability
): boolean {
  const roll = Math.random() * 100;
  return roll < probability;
}
