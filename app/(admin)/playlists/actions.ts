"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireEditor } from "@/lib/auth";
import { playlistSchema } from "@/lib/validations";
import type { ActionResult } from "@/app/(admin)/content/actions";

function revalidate() {
  revalidatePath("/playlists");
  revalidatePath("/screens");
  revalidatePath("/dashboard");
}

export async function createPlaylist(input: unknown): Promise<ActionResult> {
  const user = await requireEditor();
  const parsed = playlistSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };
  }

  const playlist = await prisma.$transaction(async (tx) => {
    if (parsed.data.isDefault) {
      await tx.playlist.updateMany({
        where: { organizationId: user.organizationId },
        data: { isDefault: false },
      });
    }
    return tx.playlist.create({
      data: {
        name: parsed.data.name,
        screenId: parsed.data.screenId ?? null,
        isDefault: parsed.data.isDefault,
        organizationId: user.organizationId,
      },
    });
  });

  revalidate();
  return { ok: true, id: playlist.id };
}

export async function updatePlaylist(
  id: string,
  input: unknown
): Promise<ActionResult> {
  const user = await requireEditor();
  const parsed = playlistSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };
  }

  const existing = await prisma.playlist.findFirst({
    where: { id, organizationId: user.organizationId },
  });
  if (!existing) return { ok: false, error: "Playlist niet gevonden" };

  await prisma.$transaction(async (tx) => {
    if (parsed.data.isDefault) {
      await tx.playlist.updateMany({
        where: { organizationId: user.organizationId, id: { not: id } },
        data: { isDefault: false },
      });
    }
    await tx.playlist.update({
      where: { id },
      data: {
        name: parsed.data.name,
        screenId: parsed.data.screenId ?? null,
        isDefault: parsed.data.isDefault,
      },
    });
  });

  revalidate();
  return { ok: true, id };
}

export async function deletePlaylist(id: string): Promise<ActionResult> {
  const user = await requireEditor();
  const existing = await prisma.playlist.findFirst({
    where: { id, organizationId: user.organizationId },
  });
  if (!existing) return { ok: false, error: "Playlist niet gevonden" };

  await prisma.playlist.delete({ where: { id } });
  revalidate();
  return { ok: true };
}

export async function addContentToPlaylist(
  playlistId: string,
  contentItemId: string
): Promise<ActionResult> {
  const user = await requireEditor();
  const [playlist, content] = await Promise.all([
    prisma.playlist.findFirst({
      where: { id: playlistId, organizationId: user.organizationId },
    }),
    prisma.contentItem.findFirst({
      where: { id: contentItemId, organizationId: user.organizationId },
    }),
  ]);
  if (!playlist || !content) {
    return { ok: false, error: "Playlist of bericht niet gevonden" };
  }

  const maxOrder = await prisma.playlistItem.aggregate({
    where: { playlistId },
    _max: { sortOrder: true },
  });

  await prisma.playlistItem.create({
    data: {
      playlistId,
      contentItemId,
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
    },
  });

  revalidate();
  revalidatePath(`/playlists/${playlistId}`);
  return { ok: true };
}

export async function removePlaylistItem(
  playlistItemId: string
): Promise<ActionResult> {
  const user = await requireEditor();
  const item = await prisma.playlistItem.findFirst({
    where: {
      id: playlistItemId,
      playlist: { organizationId: user.organizationId },
    },
  });
  if (!item) return { ok: false, error: "Playlistitem niet gevonden" };

  await prisma.playlistItem.delete({ where: { id: playlistItemId } });
  revalidate();
  revalidatePath(`/playlists/${item.playlistId}`);
  return { ok: true };
}

export async function movePlaylistItem(
  playlistItemId: string,
  direction: "up" | "down"
): Promise<ActionResult> {
  const user = await requireEditor();
  const item = await prisma.playlistItem.findFirst({
    where: {
      id: playlistItemId,
      playlist: { organizationId: user.organizationId },
    },
  });
  if (!item) return { ok: false, error: "Playlistitem niet gevonden" };

  const siblings = await prisma.playlistItem.findMany({
    where: { playlistId: item.playlistId },
    orderBy: { sortOrder: "asc" },
  });

  const index = siblings.findIndex((s) => s.id === item.id);
  const swapWith = direction === "up" ? siblings[index - 1] : siblings[index + 1];
  if (!swapWith) return { ok: true };

  await prisma.$transaction([
    prisma.playlistItem.update({
      where: { id: item.id },
      data: { sortOrder: swapWith.sortOrder },
    }),
    prisma.playlistItem.update({
      where: { id: swapWith.id },
      data: { sortOrder: item.sortOrder },
    }),
  ]);

  revalidatePath(`/playlists/${item.playlistId}`);
  return { ok: true };
}

export async function updatePlaylistItemDuration(
  playlistItemId: string,
  durationSeconds: number | null
): Promise<ActionResult> {
  const user = await requireEditor();
  if (
    durationSeconds !== null &&
    (!Number.isInteger(durationSeconds) ||
      durationSeconds < 3 ||
      durationSeconds > 600)
  ) {
    return { ok: false, error: "Duur moet tussen 3 en 600 seconden liggen" };
  }

  const item = await prisma.playlistItem.findFirst({
    where: {
      id: playlistItemId,
      playlist: { organizationId: user.organizationId },
    },
  });
  if (!item) return { ok: false, error: "Playlistitem niet gevonden" };

  await prisma.playlistItem.update({
    where: { id: playlistItemId },
    data: { durationSeconds },
  });

  revalidatePath(`/playlists/${item.playlistId}`);
  return { ok: true };
}
