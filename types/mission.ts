export type MissionPeriod = "daily" | "weekly" | "monthly" | "starter";

export type MissionGroup = "default" | "core" | "challenge";

export interface SerializedMission {
  id: string;
  period: MissionPeriod;
  group: MissionGroup;
  title: string;
  description: string | null;
  current: number;
  target: number;
  unit: "회" | "개" | "일" | "곳";
  reward: number;
  claimed: boolean;
  claimable: boolean;
}
