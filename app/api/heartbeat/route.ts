import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const heartbeatSchema = z.object({
  slug: z.string().min(1).max(100),
});

const HEARTBEAT_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = heartbeatSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ongeldige aanvraag" }, { status: 400 });
  }

  const screen = await prisma.screen.findUnique({
    where: { slug: parsed.data.slug },
  });
  if (!screen) {
    return NextResponse.json({ error: "Scherm niet gevonden" }, { status: 404 });
  }

  const userAgent = request.headers.get("user-agent")?.slice(0, 500) ?? null;
  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  await prisma.$transaction([
    prisma.screen.update({
      where: { id: screen.id },
      data: { lastSeenAt: new Date() },
    }),
    prisma.screenHeartbeat.create({
      data: { screenId: screen.id, userAgent, ipAddress },
    }),
    // Bewaar maximaal 7 dagen geschiedenis
    prisma.screenHeartbeat.deleteMany({
      where: {
        screenId: screen.id,
        timestamp: { lt: new Date(Date.now() - HEARTBEAT_RETENTION_MS) },
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
