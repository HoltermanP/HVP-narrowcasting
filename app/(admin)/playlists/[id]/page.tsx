import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, Star, Trash2 } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlaylistFormDialog } from "@/components/admin/playlist-form-dialog";
import { PlaylistItems } from "@/components/admin/playlist-items";
import { DeletePlaylistButton } from "@/components/admin/delete-playlist-button";

export const dynamic = "force-dynamic";

export default async function PlaylistDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const playlist = await prisma.playlist.findFirst({
    where: { id, organizationId: user.organizationId },
    include: {
      screen: { select: { id: true, name: true } },
      items: {
        orderBy: { sortOrder: "asc" },
        include: {
          contentItem: {
            select: {
              id: true,
              title: true,
              type: true,
              status: true,
              durationSeconds: true,
            },
          },
        },
      },
    },
  });
  if (!playlist) notFound();

  const [screens, availableContent] = await Promise.all([
    prisma.screen.findMany({
      where: { organizationId: user.organizationId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.contentItem.findMany({
      where: {
        organizationId: user.organizationId,
        status: { not: "archived" },
        id: { notIn: playlist.items.map((item) => item.contentItemId) },
      },
      select: { id: true, title: true, type: true, status: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/playlists"
            className="mb-1 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Alle playlists
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-slate-900">
              {playlist.name}
            </h1>
            {playlist.isDefault && (
              <Badge
                variant="outline"
                className="border-amber-200 bg-amber-50 text-amber-800"
              >
                <Star className="h-3 w-3" /> Standaard
              </Badge>
            )}
          </div>
          <p className="text-sm text-slate-500">
            {playlist.screen
              ? `Gekoppeld aan scherm: ${playlist.screen.name}`
              : "Niet aan een scherm gekoppeld"}
          </p>
        </div>
        <div className="flex gap-2">
          <PlaylistFormDialog
            screens={screens}
            playlist={{
              id: playlist.id,
              name: playlist.name,
              screenId: playlist.screenId,
              isDefault: playlist.isDefault,
            }}
            trigger={
              <Button variant="outline">
                <Pencil className="h-4 w-4" /> Bewerken
              </Button>
            }
          />
          <DeletePlaylistButton
            playlistId={playlist.id}
            trigger={
              <Button variant="outline">
                <Trash2 className="h-4 w-4" /> Verwijderen
              </Button>
            }
          />
        </div>
      </div>

      <PlaylistItems
        playlistId={playlist.id}
        items={playlist.items}
        availableContent={availableContent}
      />
    </div>
  );
}
