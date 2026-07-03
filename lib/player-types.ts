import type { ContentType, Priority } from "@prisma/client";
import type { ContentMetadata } from "@/lib/content";

/** Serialiseerbare vorm van een contentitem zoals de player die ontvangt. */
export type PlayerContentItem = {
  id: string;
  title: string;
  subtitle: string | null;
  body: string | null;
  type: ContentType;
  priority: Priority;
  imageUrl: string | null;
  videoUrl: string | null;
  durationSeconds: number;
  metadata: ContentMetadata | null;
};

export type PlayerBranding = {
  name: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
};

export type PlayerData = {
  organization: PlayerBranding;
  screen: {
    name: string;
    slug: string;
    location: string | null;
  };
  playlist: { id: string; name: string } | null;
  items: PlayerContentItem[];
  fetchedAt: string;
};
