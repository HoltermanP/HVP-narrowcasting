import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  extractPlanningFromPdf,
  type ExtractedPlanning,
} from "@/lib/ai/extract-planning";
import {
  upsertGanttSlides,
  upsertImportedItem,
  type UpsertResult,
} from "@/lib/import-content";

export const dynamic = "force-dynamic";
// AI-verwerking van een PDF kan ruim een minuut duren
export const maxDuration = 180;

const MAX_PDF_BYTES = 15 * 1024 * 1024; // ruim onder de API-limiet van 32 MB

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (!user || user.role === "viewer") {
    return NextResponse.json({ error: "Geen rechten" }, { status: 403 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is niet ingesteld op de server" },
      { status: 500 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Geen bestand ontvangen" },
      { status: 400 }
    );
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json(
      { error: "Alleen PDF-bestanden worden ondersteund" },
      { status: 400 }
    );
  }
  if (file.size > MAX_PDF_BYTES) {
    return NextResponse.json(
      { error: "Bestand is te groot (maximaal 15 MB)" },
      { status: 400 }
    );
  }

  let planning: ExtractedPlanning;
  try {
    const pdfBase64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    planning = await extractPlanningFromPdf(pdfBase64);
  } catch (e) {
    console.error("Planning-import mislukt:", e);
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "De AI kon de planning niet verwerken",
      },
      { status: 502 }
    );
  }

  const subtitle = planning.statusDate
    ? `Stand per ${formatDutchDate(planning.statusDate)}`
    : `Periode: ${planning.period}`;

  const gantt = await upsertGanttSlides(
    user.organizationId,
    user.id,
    planning.importKey,
    {
      title: planning.title,
      subtitle,
      period: planning.period,
      tasks: planning.projects.map((project) => ({
        label: project.label,
        start: project.start,
        end: project.end,
        status: project.status,
        phase: project.phase,
        milestoneLabel: project.nextMilestoneLabel,
        milestoneDate: project.nextMilestoneDate,
      })),
    }
  );

  const highlightGroups = {
    achieved: planning.achievedHighlights,
    upcoming: planning.upcomingHighlights,
    progress: planning.progressHighlights,
  };
  const highlightCount =
    highlightGroups.achieved.length +
    highlightGroups.upcoming.length +
    highlightGroups.progress.length;

  let highlightsResult: UpsertResult | null = null;
  if (highlightCount > 0) {
    highlightsResult = await upsertImportedItem(
      user.organizationId,
      user.id,
      `${planning.importKey}-highlights`,
      "planning",
      {
        title: `Highlights — ${planning.title}`,
        subtitle,
        metadata: {
          period: planning.period,
          planningView: "lijst",
          highlightGroups,
          importKey: `${planning.importKey}-highlights`,
        },
      }
    );
  }

  revalidatePath("/content");
  revalidatePath("/dashboard");

  return NextResponse.json({
    ok: true,
    gantt,
    highlights: highlightsResult,
    taskCount: planning.projects.length,
    highlightCount,
  });
}

function formatDutchDate(isoDate: string): string {
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return new Intl.DateTimeFormat("nl-NL", { dateStyle: "long" }).format(parsed);
}
