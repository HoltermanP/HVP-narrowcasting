"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireEditor } from "@/lib/auth";
import type { ActionResult } from "@/app/(admin)/content/actions";

const topicSchema = z.object({
  title: z.string().trim().min(1, "Titel is verplicht").max(100),
  instructions: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v ? v : undefined)),
});

export async function createVgrTopic(input: unknown): Promise<ActionResult> {
  const user = await requireEditor();
  const parsed = topicSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };
  }

  const maxOrder = await prisma.vgrTopic.aggregate({
    where: { organizationId: user.organizationId },
    _max: { sortOrder: true },
  });

  const topic = await prisma.vgrTopic.create({
    data: {
      organizationId: user.organizationId,
      title: parsed.data.title,
      instructions: parsed.data.instructions ?? null,
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
    },
  });

  revalidatePath("/vgr");
  return { ok: true, id: topic.id };
}

export async function updateVgrTopic(
  id: string,
  input: unknown
): Promise<ActionResult> {
  const user = await requireEditor();
  const parsed = topicSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };
  }

  const existing = await prisma.vgrTopic.findFirst({
    where: { id, organizationId: user.organizationId },
  });
  if (!existing) return { ok: false, error: "Onderwerp niet gevonden" };

  await prisma.vgrTopic.update({
    where: { id },
    data: {
      title: parsed.data.title,
      instructions: parsed.data.instructions ?? null,
    },
  });

  revalidatePath("/vgr");
  return { ok: true, id };
}

export async function toggleVgrTopic(
  id: string,
  isActive: boolean
): Promise<ActionResult> {
  const user = await requireEditor();
  const existing = await prisma.vgrTopic.findFirst({
    where: { id, organizationId: user.organizationId },
  });
  if (!existing) return { ok: false, error: "Onderwerp niet gevonden" };

  await prisma.vgrTopic.update({ where: { id }, data: { isActive } });
  revalidatePath("/vgr");
  return { ok: true, id };
}

export async function deleteVgrTopic(id: string): Promise<ActionResult> {
  const user = await requireEditor();
  const existing = await prisma.vgrTopic.findFirst({
    where: { id, organizationId: user.organizationId },
  });
  if (!existing) return { ok: false, error: "Onderwerp niet gevonden" };

  await prisma.vgrTopic.delete({ where: { id } });
  revalidatePath("/vgr");
  return { ok: true };
}

export async function moveVgrTopic(
  id: string,
  direction: "up" | "down"
): Promise<ActionResult> {
  const user = await requireEditor();
  const topics = await prisma.vgrTopic.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { sortOrder: "asc" },
  });

  const index = topics.findIndex((topic) => topic.id === id);
  if (index === -1) return { ok: false, error: "Onderwerp niet gevonden" };
  const swapWith = direction === "up" ? topics[index - 1] : topics[index + 1];
  if (!swapWith) return { ok: true };

  await prisma.$transaction([
    prisma.vgrTopic.update({
      where: { id },
      data: { sortOrder: swapWith.sortOrder },
    }),
    prisma.vgrTopic.update({
      where: { id: swapWith.id },
      data: { sortOrder: topics[index].sortOrder },
    }),
  ]);

  revalidatePath("/vgr");
  return { ok: true };
}
