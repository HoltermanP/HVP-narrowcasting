"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireEditor } from "@/lib/auth";
import { contentItemSchema } from "@/lib/validations";
import type { ContentStatus } from "@prisma/client";

export type ActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

function firstZodError(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "Ongeldige invoer";
}

export async function createContentItem(input: unknown): Promise<ActionResult> {
  const user = await requireEditor();
  const parsed = contentItemSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstZodError(parsed.error) };

  const data = parsed.data;
  const item = await prisma.contentItem.create({
    data: {
      organizationId: user.organizationId,
      title: data.title,
      subtitle: data.subtitle ?? null,
      body: data.body ?? null,
      type: data.type,
      status: data.status,
      priority: data.priority,
      imageUrl: data.imageUrl ?? null,
      startDate: data.startDate ?? null,
      endDate: data.endDate ?? null,
      durationSeconds: data.durationSeconds,
      metadata: data.metadata ?? undefined,
      createdBy: user.id,
    },
  });

  revalidatePath("/content");
  revalidatePath("/dashboard");
  return { ok: true, id: item.id };
}

export async function updateContentItem(
  id: string,
  input: unknown
): Promise<ActionResult> {
  const user = await requireEditor();
  const parsed = contentItemSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstZodError(parsed.error) };

  const existing = await prisma.contentItem.findFirst({
    where: { id, organizationId: user.organizationId },
  });
  if (!existing) return { ok: false, error: "Bericht niet gevonden" };

  const data = parsed.data;
  await prisma.contentItem.update({
    where: { id },
    data: {
      title: data.title,
      subtitle: data.subtitle ?? null,
      body: data.body ?? null,
      type: data.type,
      status: data.status,
      priority: data.priority,
      imageUrl: data.imageUrl ?? null,
      startDate: data.startDate ?? null,
      endDate: data.endDate ?? null,
      durationSeconds: data.durationSeconds,
      metadata: data.metadata ?? undefined,
    },
  });

  revalidatePath("/content");
  revalidatePath("/dashboard");
  return { ok: true, id };
}

async function setStatus(
  id: string,
  status: ContentStatus
): Promise<ActionResult> {
  const user = await requireEditor();
  const existing = await prisma.contentItem.findFirst({
    where: { id, organizationId: user.organizationId },
  });
  if (!existing) return { ok: false, error: "Bericht niet gevonden" };

  await prisma.contentItem.update({ where: { id }, data: { status } });
  revalidatePath("/content");
  revalidatePath("/dashboard");
  return { ok: true, id };
}

export async function publishContentItem(id: string): Promise<ActionResult> {
  return setStatus(id, "published");
}

export async function archiveContentItem(id: string): Promise<ActionResult> {
  return setStatus(id, "archived");
}

export async function deleteContentItem(id: string): Promise<ActionResult> {
  const user = await requireEditor();
  const existing = await prisma.contentItem.findFirst({
    where: { id, organizationId: user.organizationId },
  });
  if (!existing) return { ok: false, error: "Bericht niet gevonden" };

  await prisma.contentItem.delete({ where: { id } });
  revalidatePath("/content");
  revalidatePath("/dashboard");
  return { ok: true };
}
