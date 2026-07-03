import { prisma } from "@/lib/prisma";
import type { ContentMetadata, GanttTask } from "@/lib/content";
import type { ContentType, Prisma } from "@prisma/client";

/**
 * Gedeelde logica voor AI-imports: contentitems aanmaken/bijwerken op basis
 * van een stabiele importKey, en Gantt-planningen over meerdere slides
 * verdelen als er te veel projecten zijn voor één leesbaar scherm.
 */

/** Maximaal aantal Gantt-regels per slide; daarboven wordt gesplitst. */
export const MAX_GANTT_ROWS = 8;

/** Hoogste aantal delen waarvoor oude slides worden opgeruimd. */
const MAX_GANTT_PARTS = 6;

export type UpsertResult = { id: string; created: boolean };

/** Verdeelt taken in gebalanceerde delen van maximaal MAX_GANTT_ROWS. */
export function splitGanttTasks(tasks: GanttTask[]): GanttTask[][] {
  if (tasks.length <= MAX_GANTT_ROWS) return [tasks];
  const parts = Math.ceil(tasks.length / MAX_GANTT_ROWS);
  const baseSize = Math.floor(tasks.length / parts);
  const remainder = tasks.length % parts;

  const chunks: GanttTask[][] = [];
  let offset = 0;
  for (let i = 0; i < parts; i++) {
    const size = baseSize + (i < remainder ? 1 : 0);
    chunks.push(tasks.slice(offset, offset + size));
    offset += size;
  }
  return chunks;
}

export async function upsertImportedItem(
  organizationId: string,
  createdBy: string | null,
  importKey: string,
  type: ContentType,
  data: { title: string; subtitle: string; metadata: ContentMetadata }
): Promise<UpsertResult> {
  const existing = await prisma.contentItem.findFirst({
    where: {
      organizationId,
      metadata: { path: ["importKey"], equals: importKey },
    },
  });

  if (existing) {
    await prisma.contentItem.update({
      where: { id: existing.id },
      data: {
        title: data.title,
        subtitle: data.subtitle,
        type,
        metadata: data.metadata as Prisma.InputJsonValue,
      },
    });
    return { id: existing.id, created: false };
  }

  const item = await prisma.contentItem.create({
    data: {
      organizationId,
      title: data.title,
      subtitle: data.subtitle,
      type,
      status: "published",
      priority: "normal",
      durationSeconds: type === "planning" ? 20 : 15,
      metadata: data.metadata as Prisma.InputJsonValue,
      createdBy,
    },
  });

  // Nieuw item direct in de standaardplaylist zetten
  const defaultPlaylist = await prisma.playlist.findFirst({
    where: { organizationId, isDefault: true },
  });
  if (defaultPlaylist) {
    const maxOrder = await prisma.playlistItem.aggregate({
      where: { playlistId: defaultPlaylist.id },
      _max: { sortOrder: true },
    });
    await prisma.playlistItem.create({
      data: {
        playlistId: defaultPlaylist.id,
        contentItemId: item.id,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
    });
  }

  return { id: item.id, created: true };
}

async function deleteImportedItem(
  organizationId: string,
  importKey: string
): Promise<void> {
  await prisma.contentItem.deleteMany({
    where: {
      organizationId,
      metadata: { path: ["importKey"], equals: importKey },
    },
  });
}

/**
 * Maakt of werkt de Gantt-slide(s) bij. Bij meer dan MAX_GANTT_ROWS projecten
 * wordt de planning over meerdere slides verdeeld ("(1/2)", "(2/2)"); delen
 * die door een kleinere upload overbodig worden, worden opgeruimd.
 */
export async function upsertGanttSlides(
  organizationId: string,
  createdBy: string | null,
  baseImportKey: string,
  data: {
    title: string;
    subtitle: string;
    period: string;
    tasks: GanttTask[];
  }
): Promise<UpsertResult[]> {
  const parts = splitGanttTasks(data.tasks);
  const results: UpsertResult[] = [];

  // Gedeelde tijdas zodat alle delen dezelfde schaal hebben
  const ganttDomain =
    parts.length > 1 && data.tasks.length > 0
      ? {
          start: data.tasks
            .map((task) => task.start)
            .sort()[0],
          end: data.tasks
            .map((task) => (task.end >= task.start ? task.end : task.start))
            .sort()
            .at(-1)!,
        }
      : undefined;

  for (let index = 0; index < parts.length; index++) {
    const importKey =
      index === 0 ? baseImportKey : `${baseImportKey}-${index + 1}`;
    const title =
      parts.length > 1
        ? `${data.title} (${index + 1}/${parts.length})`
        : data.title;
    results.push(
      await upsertImportedItem(organizationId, createdBy, importKey, "planning", {
        title,
        subtitle: data.subtitle,
        metadata: {
          period: data.period,
          planningView: "gantt",
          tasks: parts[index],
          ganttDomain,
          importKey,
        },
      })
    );
  }

  // Oude delen opruimen als de planning nu in minder slides past
  for (let index = parts.length; index < MAX_GANTT_PARTS; index++) {
    await deleteImportedItem(organizationId, `${baseImportKey}-${index + 1}`);
  }

  return results;
}
