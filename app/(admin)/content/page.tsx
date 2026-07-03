import Link from "next/link";
import { Plus } from "lucide-react";
import type { ContentStatus, ContentType, Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ContentFilters } from "@/components/admin/content-filters";
import { ContentRowActions } from "@/components/admin/content-row-actions";
import {
  CONTENT_STATUS_LABELS,
  CONTENT_TYPE_LABELS,
  PRIORITY_BADGE_CLASSES,
  PRIORITY_LABELS,
  STATUS_BADGE_CLASSES,
} from "@/lib/content";

export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("nl-NL", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function formatPeriod(start: Date | null, end: Date | null) {
  if (!start && !end) return "Altijd";
  const from = start ? dateFormat.format(start) : "…";
  const to = end ? dateFormat.format(end) : "…";
  return `${from} – ${to}`;
}

export default async function ContentPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; status?: string; period?: string }>;
}) {
  const user = await requireUser();
  const { type, status, period } = await searchParams;

  const where: Prisma.ContentItemWhereInput = {
    organizationId: user.organizationId,
  };
  if (type) where.type = type as ContentType;
  if (status) where.status = status as ContentStatus;

  const now = new Date();
  if (period === "current") {
    where.AND = [
      { OR: [{ startDate: null }, { startDate: { lte: now } }] },
      { OR: [{ endDate: null }, { endDate: { gte: now } }] },
    ];
  } else if (period === "upcoming") {
    where.startDate = { gt: now };
  } else if (period === "expired") {
    where.endDate = { lt: now };
  }

  const items = await prisma.contentItem.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: { creator: { select: { name: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Content</h1>
          <p className="text-sm text-slate-500">
            Beheer alle berichten voor het scherm.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/content/new">
              <Plus className="h-4 w-4" /> Nieuw bericht
            </Link>
          </Button>
        </div>
      </div>

      <ContentFilters />

      <div className="rounded-lg border border-slate-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titel</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Prioriteit</TableHead>
              <TableHead>Publicatieperiode</TableHead>
              <TableHead>Duur</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-10 text-center text-slate-500"
                >
                  Geen berichten gevonden. Maak een nieuw bericht aan.
                </TableCell>
              </TableRow>
            )}
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <Link
                    href={`/content/${item.id}/edit`}
                    className="font-medium text-slate-900 hover:underline"
                  >
                    {item.title}
                  </Link>
                  {item.creator && (
                    <p className="text-xs text-slate-400">
                      door {item.creator.name}
                    </p>
                  )}
                </TableCell>
                <TableCell>{CONTENT_TYPE_LABELS[item.type]}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={STATUS_BADGE_CLASSES[item.status]}
                  >
                    {CONTENT_STATUS_LABELS[item.status]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={PRIORITY_BADGE_CLASSES[item.priority]}
                  >
                    {PRIORITY_LABELS[item.priority]}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-slate-600">
                  {formatPeriod(item.startDate, item.endDate)}
                </TableCell>
                <TableCell className="text-sm text-slate-600">
                  {item.durationSeconds}s
                </TableCell>
                <TableCell>
                  <ContentRowActions id={item.id} status={item.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
