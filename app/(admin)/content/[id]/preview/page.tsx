import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Slide } from "@/components/player/slide";
import { CONTENT_TYPE_LABELS, type ContentMetadata } from "@/lib/content";
import type { PlayerContentItem } from "@/lib/player-types";

export const dynamic = "force-dynamic";

export default async function PreviewContentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const item = await prisma.contentItem.findFirst({
    where: { id, organizationId: user.organizationId },
  });
  if (!item) notFound();

  const playerItem: PlayerContentItem = {
    id: item.id,
    title: item.title,
    subtitle: item.subtitle,
    body: item.body,
    type: item.type,
    priority: item.priority,
    imageUrl: item.imageUrl,
    videoUrl: item.videoUrl,
    durationSeconds: item.durationSeconds,
    metadata: (item.metadata as ContentMetadata) ?? null,
  };

  const branding = {
    name: user.organization.name,
    logoUrl: user.organization.logoUrl,
    primaryColor: user.organization.primaryColor,
    secondaryColor: user.organization.secondaryColor,
    backgroundColor: user.organization.backgroundColor,
    textColor: user.organization.textColor,
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Preview</h1>
          <p className="text-sm text-slate-500">
            {CONTENT_TYPE_LABELS[item.type]} · zo verschijnt dit bericht op het
            scherm (16:9).
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/content">
              <ArrowLeft className="h-4 w-4" /> Terug
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/content/${item.id}/edit`}>
              <Pencil className="h-4 w-4" /> Bewerken
            </Link>
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-300 shadow-lg">
        <div className="aspect-video w-full">
          <Slide item={playerItem} branding={branding} />
        </div>
      </div>

      <p className="text-sm text-slate-500">
        Weergaveduur: {item.durationSeconds} seconden
      </p>
    </div>
  );
}
