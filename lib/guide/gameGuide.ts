import {
  CONQUER_PROBABILITIES,
  CREW_CREATE_COST,
  CREW_MEMBERS_MAX,
  CREW_MEMBERS_MIN,
  DAILY_BONUS_AMOUNT,
  DAILY_BONUS_RESET_HOUR_KST,
  DEFAULT_PIN_COST,
  FIXED_PIN_RADIUS_METERS,
  PIN_CREATE_COST,
  PIN_MAX_COST,
  PIN_REINFORCE_COST,
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
    return `${probability}%로 도전하면 ${cost}P가 들고, 실패하면 상대가 ${reward}P를 받아요.`;
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
  const maxProbability = Math.max(...CONQUER_PROBABILITIES);

  return [
    {
      id: "overview",
      title: `${SERVICE_NAME}이란?`,
      paragraphs: [
        "걸어 다니며 지도에 깃발을 꽂고, 내 땅을 키우는 위치 기반 게임이에요.",
        "빈 땅에는 깃발을 꽂고, 다른 사람 땅에는 확률 점령으로 도전할 수 있어요. 랜드마크에서는 개인·크루 순위도 겨룹니다.",
      ],
    },
    {
      id: "points",
      title: "포인트 얻기",
      paragraphs: [
        "깃발을 꽂거나 강화하고, 점령에 도전하려면 포인트가 필요해요. 아래처럼 모을 수 있어요.",
      ],
      bullets: [
        `✨ 포인트 찾기: 내 주변 ${randomPointRadiusMeters}m 안에 ${randomPointCount}개가 생겨요. ${randomPointExpiresMinutes}분 안에 ${randomPointClaimRadiusMeters}m까지 다가가면 획득할 수 있고, 다시 찾기는 ${randomPointSpawnIntervalMinutes}분마다 가능해요.`,
        `한 번에 ${randomPointValues.join(" / ")}P 중 하나가 랜덤으로 들어와요.`,
        `매일 출석 보너스 ${DAILY_BONUS_AMOUNT}P — 오전 ${DAILY_BONUS_RESET_HOUR_KST}시 이후 하루 1회`,
        "남의 깃발 점령에 성공하면 그 땅이 내 깃발이 되고, 누군가의 점령을 막아 내면 방어 보상을 받아요.",
      ],
    },
    {
      id: "plant-pin",
      title: "깃발 꽂기",
      paragraphs: [
        `지금 서 있는 자리에 ${PIN_CREATE_COST}P로 깃발을 꽂아요. 적은 말은 지도 위 깃발에 그대로 보여요.`,
        `깃발 주변 ${FIXED_PIN_RADIUS_METERS}m가 내 영역이에요.`,
      ],
      bullets: [
        "빈 땅이면 바로 깃발이 생겨요.",
        "이미 다른 깃발이 있는 곳이면 점령에 도전해야 해요.",
        "랜드마크 안에서는 영역이 더 좁아지고, 랜드마크 점수에 반영돼요.",
      ],
    },
    {
      id: "reinforce-pin",
      title: "깃발 강화",
      paragraphs: [
        "자주 다니는 길에 깃발이 가득해도, 같은 자리에 다시 와서 내 깃발을 키울 수 있어요.",
        `내 깃발 영역 안으로 들어가 깃발을 고른 뒤 「깃발 강화」를 누르면 ${PIN_REINFORCE_COST}P가 들어가고, 투자 포인트가 ${PIN_REINFORCE_COST}P씩 올라가요. 최대 ${PIN_MAX_COST}P까지요.`,
      ],
      bullets: [
        "꽂은 뒤, 또는 마지막 강화 후 24시간이 지나야 다시 강화할 수 있어요.",
        "강화해도 영역 크기(반경)는 그대로예요.",
        "투자 포인트가 높을수록 뺏기 어렵고, 지도에서 깃발 모습도 조금 더 돋보여요.",
      ],
    },
    {
      id: "conquer",
      title: "확률 점령",
      paragraphs: [
        "다른 사람 깃발을 누르고, 그 영역 안에 있으면 점령에 도전할 수 있어요. 확률을 고를수록 성공 가능성은 높아지지만 비용도 커져요.",
        `최대 성공 확률은 ${maxProbability}%예요. 예시로 ${DEFAULT_PIN_COST}P 깃발을 상대할 때는 이렇게 돼요.`,
      ],
      bullets: conquerExamples,
    },
    {
      id: "defense",
      title: "방어 보상",
      paragraphs: [
        "내 깃발을 누군가 점령하려다 실패하면, 그 사람이 쓴 비용 중 일부가 내게 와요.",
        `예를 들어 ${DEFAULT_PIN_COST}P 깃발에 상대가 50%로 도전했다가 실패하면, 나는 ${calculateDefenseReward(50 as ConquerProbability, DEFAULT_PIN_COST)}P를 받아요.`,
      ],
    },
    {
      id: "landmark",
      title: "랜드마크",
      paragraphs: [
        "관광지·문화시설 같은 랜드마크 안에 깃발을 꽂으면 그곳 점수가 쌓여요.",
        "점수는 그 랜드마크 안에 있는 내 활성 깃발의 투자 포인트 합이에요.",
        "랜드마크를 누르면 개인·크루 순위를 볼 수 있고, 1위가 타이틀 홀더로 표시돼요. 동점이면 먼저 그 점수에 도달한 쪽이 앞섭니다.",
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
        "여러 명이 모여 랜드마크를 함께 공략하는 팀이에요. 크루 점수는 멤버들이 랜드마크에 꽂은 깃발 투자 합으로 계산돼요.",
      ],
    },
    {
      id: "crew-create",
      title: "만들기 · 가입",
      bullets: [
        `크루를 만들려면 ${CREW_CREATE_COST}P가 들어요.`,
        `인원은 ${CREW_MEMBERS_MIN}~${CREW_MEMBERS_MAX}명까지, 리더가 정할 수 있어요.`,
        "가입은 리더 승인제예요. 승인되면 바로 멤버가 됩니다.",
        "리더는 초대 링크를 공유해 멤버를 모을 수 있어요.",
      ],
    },
    {
      id: "crew-landmark",
      title: "랜드마크 점령",
      paragraphs: [
        "크루 멤버가 랜드마크 안에 꽂은 활성 깃발의 투자 포인트가 크루 점수로 합쳐져요.",
        "랜드마크 순위에는 개인과 크루가 함께 올라가고, 크루 점수가 더 높으면 크루가 타이틀 홀더가 될 수 있어요.",
        "깃발이 점령당하거나 사라지면 점수도 함께 줄어들어요.",
      ],
    },
    {
      id: "crew-map",
      title: "지도에서 활용",
      bullets: [
        "지도에서 「내 크루」를 켜면 우리 크루 멤버 깃발이 더 잘 보여요.",
        "크루 화면 멤버 목록은 전투력·공략(랜드마크 깃발 수) 순으로 정렬할 수 있어요.",
      ],
    },
  ];
}

export function getFullGuideSections(): GuideSection[] {
  return [...getGameGuideSections(), ...getCrewGuideSections()];
}
