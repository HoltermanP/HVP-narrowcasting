"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireEditor } from "@/lib/auth";
import { screenSchema } from "@/lib/validations";
import type { ActionResult } from "@/app/(admin)/content/actions";

function revalidate() {
  revalidatePath("/screens");
  revalidatePath("/playlists");
  revalidatePath("/dashboard");
}

export async function createScreen(input: unknown): Promise<ActionResult> {
  const user = await requireEditor();
  const parsed = screenSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };
  }

  const slugTaken = await prisma.screen.findUnique({
    where: { slug: parsed.data.slug },
  });
  if (slugTaken) {
    return { ok: false, error: "Deze slug is al in gebruik" };
  }

  const screen = await prisma.screen.create({
    data: {
      name: parsed.data.name,
      location: parsed.data.location ?? null,
      slug: parsed.data.slug,
      isActive: parsed.data.isActive,
      organizationId: user.organizationId,
    },
  });

  revalidate();
  return { ok: true, id: screen.id };
}

export async function updateScreen(
  id: string,
  input: unknown
): Promise<ActionResult> {
  const user = await requireEditor();
  const parsed = screenSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };
  }

  const existing = await prisma.screen.findFirst({
    where: { id, organizationId: user.organizationId },
  });
  if (!existing) return { ok: false, error: "Scherm niet gevonden" };

  const slugTaken = await prisma.screen.findFirst({
    where: { slug: parsed.data.slug, id: { not: id } },
  });
  if (slugTaken) {
    return { ok: false, error: "Deze slug is al in gebruik" };
  }

  await prisma.screen.update({
    where: { id },
    data: {
      name: parsed.data.name,
      location: parsed.data.location ?? null,
      slug: parsed.data.slug,
      isActive: parsed.data.isActive,
    },
  });

  revalidate();
  return { ok: true, id };
}

export async function deleteScreen(id: string): Promise<ActionResult> {
  const user = await requireEditor();
  const existing = await prisma.screen.findFirst({
    where: { id, organizationId: user.organizationId },
  });
  if (!existing) return { ok: false, error: "Scherm niet gevonden" };

  await prisma.screen.delete({ where: { id } });
  revalidate();
  return { ok: true };
}

export async function assignPlaylistToScreen(
  screenId: string,
  playlistId: string | null
): Promise<ActionResult> {
  const user = await requireEditor();
  const screen = await prisma.screen.findFirst({
    where: { id: screenId, organizationId: user.organizationId },
  });
  if (!screen) return { ok: false, error: "Scherm niet gevonden" };

  await prisma.$transaction(async (tx) => {
    // Koppel bestaande playlists van dit scherm los
    await tx.playlist.updateMany({
      where: { screenId, organizationId: user.organizationId },
      data: { screenId: null },
    });
    if (playlistId) {
      const playlist = await tx.playlist.findFirst({
        where: { id: playlistId, organizationId: user.organizationId },
      });
      if (!playlist) throw new Error("Playlist niet gevonden");
      await tx.playlist.update({
        where: { id: playlistId },
        data: { screenId },
      });
    }
  });

  revalidate();
  return { ok: true };
}
