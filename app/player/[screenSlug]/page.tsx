import type { Metadata } from "next";
import { PlayerClient } from "@/components/player/player-client";

export const metadata: Metadata = {
  title: "Narrowcasting player",
  robots: { index: false, follow: false },
};

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ screenSlug: string }>;
}) {
  const { screenSlug } = await params;
  return <PlayerClient slug={screenSlug} />;
}
