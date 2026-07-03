import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { extractVgrFromPdf, type ExtractedVgr } from "@/lib/ai/extract-vgr";
import {
  deleteVgrSlidesExcept,
  upsertGanttSlides,
  upsertImportedItem,
  type UpsertResult,
} from "@/lib/import-content";

export const dynamic = "force-dynamic";
// AI-verwerking van een volledige VGR kan enkele minuten duren
export const maxDuration = 300;

const MAX_PDF_BYTES = 20 * 1024 * 1024;

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

  const topics = await prisma.vgrTopic.findMany({
    where: { organizationId: user.organizationId, isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  if (topics.length === 0) {
    return NextResponse.json(
      { error: "Voeg eerst minimaal één onderwerp toe" },
      { status: 400 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Geen bestand ontvangen" }, { status: 400 });
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json(
      { error: "Alleen PDF-bestanden worden ondersteund" },
      { status: 400 }
    );
  }
  if (file.size > MAX_PDF_BYTES) {
    return NextResponse.json(
      { error: "Bestand is te groot (maximaal 20 MB)" },
      { status: 400 }
    );
  }

  let vgr: ExtractedVgr;
  try {
    const pdfBase64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    vgr = await extractVgrFromPdf(
      pdfBase64,
      topics.map((topic) => ({
        id: topic.id,
        title: topic.title,
        instructions: topic.instructions,
      }))
    );
  } catch (e) {
    console.error("VGR-import mislukt:", e);
    return NextResponse.json(
      {
        error:
          e instanceof Error ? e.message : "De AI kon de VGR niet verwerken",
      },
      { status: 502 }
    );
  }

  const subtitle = vgr.statusDate
    ? `Stand per ${formatDutchDate(vgr.statusDate)}`
    : `Periode: ${vgr.period}`;

  // 1. Planning (gantt) — automatisch gesplitst bij veel projecten.
  // Vaste importKey ("vgr-planning") zodat een nieuwe upload de vorige altijd
  // vervangt, ongeacht welke sleutel de AI zou verzinnen.
  const gantt = await upsertGanttSlides(
    user.organizationId,
    user.id,
    "vgr-planning",
    {
      title: vgr.title,
      subtitle,
      period: vgr.period,
      tasks: vgr.projects.map((project) => ({
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

  // 2. Highlights
  const highlightGroups = {
    achieved: vgr.achievedHighlights,
    upcoming: vgr.upcomingHighlights,
    progress: vgr.progressHighlights,
  };
  const highlightCount =
    highlightGroups.achieved.length +
    highlightGroups.upcoming.length +
    highlightGroups.progress.length;
  let highlights: UpsertResult | null = null;
  if (highlightCount > 0) {
    highlights = await upsertImportedItem(
      user.organizationId,
      user.id,
      "vgr-highlights",
      "planning",
      {
        title: `Highlights — ${vgr.title}`,
        subtitle,
        metadata: {
          period: vgr.period,
          planningView: "lijst",
          highlightGroups,
          importKey: "vgr-highlights",
        },
      }
    );
  }

  // 3. Onderwerpslides
  const topicResults: {
    topicId: string;
    title: string;
    id: string;
    created: boolean;
    importKey: string;
  }[] = [];
  for (const slide of vgr.topicSlides) {
    const importKey = `vgr-topic-${slide.topicId}`;
    const isKpi = slide.kind === "kpi" && slide.kpis.length > 0;
    const result = await upsertImportedItem(
      user.organizationId,
      user.id,
      importKey,
      isKpi ? "kpi" : "news",
      {
        title: slide.title,
        subtitle: slide.subtitle ?? subtitle,
        metadata: isKpi
          ? { kpis: slide.kpis, importKey }
          : { bullets: slide.bullets, importKey },
      }
    );
    topicResults.push({ topicId: slide.topicId, title: slide.title, ...result });
  }

  // Alles wat bij een vórige VGR-upload hoorde maar nu niet meer voorkomt
  // (verdwenen onderwerpen, weggevallen highlights, oude planningdelen) wissen.
  const keepKeys = [
    ...gantt.map((r) => r.importKey),
    ...(highlights ? [highlights.importKey] : []),
    ...topicResults.map((r) => r.importKey),
  ];
  const removed = await deleteVgrSlidesExcept(user.organizationId, keepKeys);

  revalidatePath("/content");
  revalidatePath("/vgr");
  revalidatePath("/dashboard");

  return NextResponse.json({
    ok: true,
    gantt,
    highlights,
    topics: topicResults,
    projectCount: vgr.projects.length,
    highlightCount,
    removed,
  });
}

function formatDutchDate(isoDate: string): string {
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return new Intl.DateTimeFormat("nl-NL", { dateStyle: "long" }).format(parsed);
}
