import { prisma } from "@/lib/prisma";
import { isCurrentlyVisible, type ContentMetadata } from "@/lib/content";
import type { PlayerContentItem, PlayerData } from "@/lib/player-types";

/**
 * Stelt de actuele playerdata voor een scherm samen: de gekoppelde playlist
 * (of anders de standaardplaylist van de organisatie) met alleen de content
 * die nu zichtbaar mag zijn, in playlistvolgorde.
 */
export async function getPlayerData(
  screenSlug: string
): Promise<PlayerData | null> {
  const screen = await prisma.screen.findUnique({
    where: { slug: screenSlug },
    include: { organization: true },
  });
  if (!screen || !screen.isActive) return null;

  const playlist =
    (await prisma.playlist.findFirst({
      where: { screenId: screen.id },
      include: playlistInclude,
    })) ??
    (await prisma.playlist.findFirst({
      where: { organizationId: screen.organizationId, isDefault: true },
      include: playlistInclude,
    }));

  const items: PlayerContentItem[] = (playlist?.items ?? [])
    .filter((item) => isCurrentlyVisible(item.contentItem))
    .map((item) => ({
      id: item.contentItem.id,
      title: item.contentItem.title,
      subtitle: item.contentItem.subtitle,
      body: item.contentItem.body,
      type: item.contentItem.type,
      priority: item.contentItem.priority,
      imageUrl: item.contentItem.imageUrl,
      videoUrl: item.contentItem.videoUrl,
      durationSeconds:
        item.durationSeconds ?? item.contentItem.durationSeconds,
      metadata: (item.contentItem.metadata as ContentMetadata) ?? null,
    }));

  return {
    organization: {
      name: screen.organization.name,
      logoUrl: screen.organization.logoUrl,
      primaryColor: screen.organization.primaryColor,
      secondaryColor: screen.organization.secondaryColor,
      backgroundColor: screen.organization.backgroundColor,
      textColor: screen.organization.textColor,
    },
    screen: {
      name: screen.name,
      slug: screen.slug,
      location: screen.location,
    },
    playlist: playlist ? { id: playlist.id, name: playlist.name } : null,
    items,
    fetchedAt: new Date().toISOString(),
  };
}

const playlistInclude = {
  items: {
    orderBy: { sortOrder: "asc" as const },
    include: { contentItem: true },
  },
};
