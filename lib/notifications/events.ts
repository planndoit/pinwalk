import {
  createNotification,
  getProfileNickname,
} from "@/lib/notifications/create";
import { createAdminClient } from "@/lib/supabase/admin";

export async function notifyCrewJoinRequest(input: {
  crewId: string;
  applicantUserId: string;
}): Promise<void> {
  const admin = createAdminClient();
  const [{ data: crew }, nickname] = await Promise.all([
    admin
      .from("crews")
      .select("name, leader_id")
      .eq("id", input.crewId)
      .maybeSingle(),
    getProfileNickname(input.applicantUserId),
  ]);

  if (!crew?.leader_id || crew.leader_id === input.applicantUserId) {
    return;
  }

  await createNotification({
    userId: crew.leader_id as string,
    category: "crew",
    type: "crew_join_request",
    title: "크루 가입 신청",
    body: `${nickname ?? "회원"}님이 ${crew.name as string} 크루 가입을 신청했습니다.`,
    data: { path: "/crew", crewId: input.crewId },
  });
}

export async function notifyCrewJoinApproved(input: {
  userId: string;
  crewId: string;
  crewName: string;
}): Promise<void> {
  await createNotification({
    userId: input.userId,
    category: "crew",
    type: "crew_join_approved",
    title: "크루 가입 승인",
    body: `${input.crewName} 크루 가입이 승인되었습니다.`,
    data: { path: "/crew", crewId: input.crewId },
  });
}

export async function notifyCrewJoinRejected(input: {
  userId: string;
  crewId: string;
  crewName: string;
}): Promise<void> {
  await createNotification({
    userId: input.userId,
    category: "crew",
    type: "crew_join_rejected",
    title: "크루 가입 거절",
    body: `${input.crewName} 크루 가입 신청이 거절되었습니다.`,
    data: { path: "/crew", crewId: input.crewId },
  });
}

export async function notifyCrewKicked(input: {
  userId: string;
  crewId: string;
  crewName: string;
}): Promise<void> {
  await createNotification({
    userId: input.userId,
    category: "crew",
    type: "crew_kicked",
    title: "크루에서 추방됨",
    body: `${input.crewName} 크루에서 추방되었습니다.`,
    data: { path: "/crew", crewId: input.crewId },
  });
}

export async function notifyCrewDissolved(input: {
  userIds: string[];
  crewId: string;
  crewName: string;
  excludeUserId?: string;
}): Promise<void> {
  const targets = input.userIds.filter((id) => id !== input.excludeUserId);
  await Promise.all(
    targets.map((userId) =>
      createNotification({
        userId,
        category: "crew",
        type: "crew_dissolved",
        title: "크루 해산",
        body: `${input.crewName} 크루가 해산되었습니다.`,
        data: { path: "/crew", crewId: input.crewId },
      })
    )
  );
}

export async function notifyCrewLeaderTransferred(input: {
  userId: string;
  crewId: string;
  crewName: string;
}): Promise<void> {
  await createNotification({
    userId: input.userId,
    category: "crew",
    type: "crew_leader_transferred",
    title: "크루 리더 위임",
    body: `${input.crewName} 크루의 리더가 되었습니다.`,
    data: { path: "/crew", crewId: input.crewId },
  });
}

export async function notifyPinConquered(input: {
  ownerUserId: string;
  attackerUserId: string;
  pinId: string;
  pinText: string;
  lat: number;
  lng: number;
}): Promise<void> {
  if (input.ownerUserId === input.attackerUserId) {
    return;
  }

  const nickname = await getProfileNickname(input.attackerUserId);

  await createNotification({
    userId: input.ownerUserId,
    category: "game",
    type: "pin_conquered",
    title: "내 핀이 점령당했어요",
    body: `${nickname ?? "누군가"}가 "${input.pinText}" 깃발을 점령했습니다.`,
    data: {
      path: "/",
      pinId: input.pinId,
      lat: input.lat,
      lng: input.lng,
    },
  });
}

export async function notifyPinDefenseSuccess(input: {
  ownerUserId: string;
  pinId: string;
  reward: number;
}): Promise<void> {
  await createNotification({
    userId: input.ownerUserId,
    category: "game",
    type: "pin_defense_success",
    title: "방어 성공",
    body: `공격을 막아 ${input.reward.toLocaleString()}P를 받았습니다.`,
    data: { path: "/", pinId: input.pinId },
  });
}

export async function notifyInquiryReply(input: {
  userId: string;
  inquiryId: string;
  title: string;
}): Promise<void> {
  await createNotification({
    userId: input.userId,
    category: "support",
    type: "inquiry_reply",
    title: "문의 답변",
    body: `"${input.title}" 문의에 답변이 등록되었습니다.`,
    data: {
      path: `/my/inquiries/${input.inquiryId}`,
      inquiryId: input.inquiryId,
    },
  });
}

export async function notifyAdminPoints(input: {
  userId: string;
  amount: number;
  reason: string;
}): Promise<void> {
  await createNotification({
    userId: input.userId,
    category: "points",
    type: "admin_points",
    title: "포인트 지급",
    body: `관리자가 ${input.amount.toLocaleString()}P를 지급했습니다. (${input.reason})`,
    data: { path: "/my", amount: input.amount },
  });
}

export async function getCrewMemberUserIds(crewId: string): Promise<string[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("crew_members")
    .select("user_id")
    .eq("crew_id", crewId);

  return (data ?? []).map((row) => row.user_id as string);
}

export async function getCrewName(crewId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("crews")
    .select("name")
    .eq("id", crewId)
    .maybeSingle();

  return (data?.name as string | undefined) ?? null;
}
