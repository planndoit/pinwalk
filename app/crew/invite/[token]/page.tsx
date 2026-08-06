import type { Metadata } from "next";
import CrewInvitePageClient from "@/components/crew/CrewInvitePageClient";
import { SERVICE_NAME } from "@/lib/constants";
import {
  buildCrewInviteDescription,
  getCrewByInviteToken,
} from "@/lib/crew/invite";

const OG_IMAGE = {
  url: "/og.png",
  width: 1200,
  height: 630,
  alt: SERVICE_NAME,
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const crew = await getCrewByInviteToken(token);

  if (!crew) {
    return {
      title: "크루 초대",
      description: "유효하지 않거나 만료된 크루 초대 링크입니다.",
      openGraph: {
        title: "크루 초대",
        description: "유효하지 않거나 만료된 크루 초대 링크입니다.",
        images: [OG_IMAGE],
      },
      twitter: {
        card: "summary_large_image",
        title: "크루 초대",
        description: "유효하지 않거나 만료된 크루 초대 링크입니다.",
        images: [OG_IMAGE.url],
      },
    };
  }

  const title = `${crew.name} 크루 초대`;
  const description = buildCrewInviteDescription(crew);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ ...OG_IMAGE, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [OG_IMAGE.url],
    },
  };
}

export default async function CrewInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <CrewInvitePageClient token={token} />;
}
