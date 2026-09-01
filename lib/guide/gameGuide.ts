import {
  CONQUER_PROBABILITIES,
  CREW_CREATE_COST,
  CREW_MEMBERS_MAX,
  CREW_MEMBERS_MIN,
  DAILY_BONUS_AMOUNT,
  DAILY_BONUS_RESET_HOUR_KST,
  DEFAULT_PIN_COST,
  PIN_COST_OPTIONS,
  SERVICE_NAME,
} from "@/lib/constants";
import {
  getRandomPointClaimRadiusMeters,
  getRandomPointCount,
  getRandomPointExpiresMinutes,
  getRandomPointRadiusMeters,
  getRandomPointSpawnIntervalMinutes,
  getRandomPointValues,
} from "@/lib/env";
import {
  calculateConquerCost,
  calculateDefenseReward,
} from "@/lib/points";
import type { ConquerProbability } from "@/lib/constants";

export type GuideSection = {
  id: string;
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

function formatConquerExamples(pinCost: number): string[] {
  return CONQUER_PROBABILITIES.map((probability) => {
    const cost = calculateConquerCost(probability, pinCost);
    const reward = calculateDefenseReward(probability, pinCost);
    return `${probability}% — 시도 비용 ${cost}P, 실패 시 방어자 보상 ${reward}P`;
  });
}

export type GuideScope = "game" | "crew" | "full";

export function getGameGuideSections(): GuideSection[] {
  const randomPointRadiusMeters = getRandomPointRadiusMeters();
  const randomPointCount = getRandomPointCount();
  const randomPointExpiresMinutes = getRandomPointExpiresMinutes();
  const randomPointClaimRadiusMeters = getRandomPointClaimRadiusMeters();
  const randomPointSpawnIntervalMinutes = getRandomPointSpawnIntervalMinutes();
  const randomPointValues = getRandomPointValues();
  const conquerExamples = formatConquerExamples(DEFAULT_PIN_COST);

  return [
    {
      id: "overview",
      title: `${SERVICE_NAME}이란?`,
      paragraphs: [
        "지도 위에 깃발을 꽂고, 다른 사람의 깃발을 확률 점령으로 빼앗는 위치 기반 게임입니다.",
        "랜드마크에서는 개인·크루 점수 경쟁도 펼쳐집니다.",
      ],
    },
    {
      id: "points",
      title: "포인트 얻기",
      paragraphs: [
        "깃발 꽂기, 점령 시도, 랜드마크 공략 등 대부분의 활동에 포인트가 필요합니다.",
      ],
      bullets: [
        `✨ 포인트 찾기: 현재 위치 기준 ${randomPointRadiusMeters}m 안에 ${randomPointCount}개가 생기며, ${randomPointExpiresMinutes}분 동안 유효합니다. ${randomPointClaimRadiusMeters}m 안으로 가까이 가면 획득할 수 있고, 다시 찾기는 ${randomPointSpawnIntervalMinutes}분마다 가능합니다.`,
        `획득 포인트는 ${randomPointValues.join(" / ")}P 중 하나로 랜덤입니다.`,
        `매일 출석 보너스 ${DAILY_BONUS_AMOUNT}P (매일 오전 ${DAILY_BONUS_RESET_HOUR_KST}시 이후 1회)`,
        "점령에 성공하면 상대 깃발을 내 깃발로 바꿉니다. 방어에 성공하면 포인트를 받을 수 있습니다.",
      ],
    },
    {
      id: "plant-pin",
      title: "깃발 꽂기",
      paragraphs: [
        "지도에서 위치를 고른 뒤 투자 포인트를 넣어 깃발을 꽂습니다. 투자가 클수록 영향 반경이 넓어집니다.",
      ],
      bullets: [
        `투자 옵션: ${PIN_COST_OPTIONS.join("P / ")}P`,
        "빈 땅이면 바로 깃발이 생깁니다.",
        "이미 누군가 깃발이 있는 영역이면 점령에 도전해야 합니다.",
        "랜드마크 안에서는 깃발 반경이 더 좁아지고, 랜드마크 점수에 반영됩니다.",
      ],
    },
    {
      id: "conquer",
      title: "확률 점령",
      paragraphs: [
        "다른 사람 깃발을 누르면 확률 점령에 도전할 수 있습니다. 깃발 반경 안에 있어야 하며, 선택한 확률만큼 성공할 수 있습니다.",
        `점령 시도 비용은 ⌈투자 포인트 × (선택 확률 ÷ 100) × 1.1⌉ 입니다. 최대 성공 확률은 ${Math.max(...CONQUER_PROBABILITIES)}%입니다.`,
        `예시 — ${DEFAULT_PIN_COST}P 깃발 기준:`,
      ],
      bullets: conquerExamples,
    },
    {
      id: "defense",
      title: "방어 보상",
      paragraphs: [
        "내 깃발을 누군가 점령하려다 실패하면, 시도 비용 중 일부가 방어자에게 지급됩니다.",
        "보상은 투자 포인트 × (선택 확률 ÷ 100) × 5% (소수점 반올림)입니다.",
        `같은 ${DEFAULT_PIN_COST}P 깃발에서 상대가 50%로 도전해 실패하면 방어자는 ${calculateDefenseReward(50 as ConquerProbability, DEFAULT_PIN_COST)}P를 받습니다.`,
      ],
    },
    {
      id: "landmark",
      title: "랜드마크",
      paragraphs: [
        "관광지·문화시설 등 랜드마크 영역 안에 깃발을 꽂으면 랜드마크 점수가 쌓입니다.",
        "점수는 해당 랜드마크 안에 있는 내 활성 깃발의 투자 포인트 합입니다.",
        "랜드마크를 누르면 개인·크루 순위를 볼 수 있고, 1위가 타이틀 홀더로 표시됩니다. 동점이면 먼저 점수에 도달한 쪽이 앞섭니다.",
      ],
    },
  ];
}

export function getCrewGuideSections(): GuideSection[] {
  return [
    {
      id: "crew-overview",
      title: "크루란?",
      paragraphs: [
        "여러 명이 모여 랜드마크를 함께 공략하는 팀입니다. 크루 점수는 멤버들의 랜드마크 깃발 투자 합으로 계산됩니다.",
      ],
    },
    {
      id: "crew-create",
      title: "만들기 · 가입",
      bullets: [
        `크루 생성 비용: ${CREW_CREATE_COST}P`,
        `인원: ${CREW_MEMBERS_MIN}~${CREW_MEMBERS_MAX}명 (리더가 설정)`,
        "가입은 리더 승인제입니다. 승인되면 크루 멤버가 됩니다.",
        "리더는 초대 링크를 공유해 멤버를 모을 수 있습니다.",
      ],
    },
    {
      id: "crew-landmark",
      title: "랜드마크 점령",
      paragraphs: [
        "크루 멤버가 랜드마크 안에 꽂은 활성 깃발의 투자 포인트가 크루 점수로 합산됩니다.",
        "랜드마크 순위에는 개인과 크루가 함께 올라가며, 크루 점수가 더 높으면 크루가 타이틀 홀더가 될 수 있습니다.",
        "깃발이 점령당하거나 사라지면 점수도 함께 줄어듭니다.",
      ],
    },
    {
      id: "crew-map",
      title: "지도에서 활용",
      bullets: [
        "지도 상단 「내 크루」를 켜면 우리 크루 멤버 깃발을 강조해서 볼 수 있습니다.",
        "크루 화면 멤버 목록은 전투력·공략(랜드마크 깃발 수) 순으로 정렬할 수 있습니다.",
      ],
    },
  ];
}

export function getFullGuideSections(): GuideSection[] {
  return [...getGameGuideSections(), ...getCrewGuideSections()];
}
