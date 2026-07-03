import Link from "next/link";
import {
  CalendarClock,
  CheckCircle2,
  MonitorPlay,
  Plus,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPlayerData } from "@/lib/player-data";
import { isScreenOnline } from "@/lib/screen-status";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Slide } from "@/components/player/slide";
import {
  CONTENT_STATUS_LABELS,
  CONTENT_TYPE_LABELS,
  STATUS_BADGE_CLASSES,
} from "@/lib/content";

export const dynamic = "force-dynamic";

const dateTimeFormat = new Intl.DateTimeFormat("nl-NL", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function DashboardPage() {
  const user = await requireUser();
  const now = new Date();

  const [activeCount, scheduledCount, screens, recentItems] =
    await Promise.all([
      prisma.contentItem.count({
        where: {
          organizationId: user.organizationId,
          status: "published",
          isActive: true,
          AND: [
            { OR: [{ startDate: null }, { startDate: { lte: now } }] },
            { OR: [{ endDate: null }, { endDate: { gte: now } }] },
          ],
        },
      }),
      prisma.contentItem.count({
        where: {
          organizationId: user.organizationId,
          isActive: true,
          OR: [
            { status: "scheduled" },
            { status: "published", startDate: { gt: now } },
          ],
        },
      }),
      prisma.screen.findMany({
        where: { organizationId: user.organizationId },
        orderBy: { name: "asc" },
      }),
      prisma.contentItem.findMany({
        where: { organizationId: user.organizationId },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
    ]);

  const onlineCount = screens.filter((s) => isScreenOnline(s.lastSeenAt)).length;
  const previewScreen = screens.find((s) => s.isActive) ?? screens[0];
  const playerData = previewScreen
    ? await getPlayerData(previewScreen.slug)
    : null;
  const previewItem = playerData?.items[0] ?? null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">
            Overzicht van {user.organization.name}.
          </p>
        </div>
        <Button asChild>
          <Link href="/content/new">
            <Plus className="h-4 w-4" /> Nieuw bericht
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <CheckCircle2 className="h-9 w-9 text-emerald-500" />
            <div>
              <p className="text-3xl font-semibold text-slate-900">
                {activeCount}
              </p>
              <p className="text-sm text-slate-500">Actieve berichten</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <CalendarClock className="h-9 w-9 text-amber-500" />
            <div>
              <p className="text-3xl font-semibold text-slate-900">
                {scheduledCount}
              </p>
              <p className="text-sm text-slate-500">Geplande berichten</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <MonitorPlay className="h-9 w-9 text-blue-500" />
            <div>
              <p className="text-3xl font-semibold text-slate-900">
                {onlineCount}
                <span className="text-lg font-normal text-slate-400">
                  /{screens.length}
                </span>
              </p>
              <p className="text-sm text-slate-500">Schermen online</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              Nu op het scherm
              {previewScreen ? ` — ${previewScreen.name}` : ""}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {previewItem && playerData ? (
              <>
                <div className="overflow-hidden rounded-lg border border-slate-200">
                  <div className="aspect-video w-full">
                    <Slide
                      item={previewItem}
                      branding={playerData.organization}
                    />
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  Eerste item van playlist
                  {playerData.playlist ? ` “${playerData.playlist.name}”` : ""}
                  ({playerData.items.length} zichtbare items).
                </p>
              </>
            ) : (
              <p className="py-10 text-center text-sm text-slate-500">
                {previewScreen
                  ? "Er is momenteel geen zichtbare content voor dit scherm."
                  : "Nog geen scherm aangemaakt."}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Laatst bijgewerkte berichten</CardTitle>
          </CardHeader>
          <CardContent>
            {recentItems.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-500">
                Nog geen berichten.{" "}
                <Link href="/content/new" className="underline">
                  Maak het eerste bericht
                </Link>
                .
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {recentItems.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/content/${item.id}/edit`}
                        className="block truncate text-sm font-medium text-slate-900 hover:underline"
                      >
                        {item.title}
                      </Link>
                      <p className="text-xs text-slate-500">
                        {CONTENT_TYPE_LABELS[item.type]} ·{" "}
                        {dateTimeFormat.format(item.updatedAt)}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={STATUS_BADGE_CLASSES[item.status]}
                    >
                      {CONTENT_STATUS_LABELS[item.status]}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
