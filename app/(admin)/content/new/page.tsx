import Link from "next/link";
import {
  Newspaper,
  ClipboardList,
  TriangleAlert,
  CalendarDays,
  Megaphone,
  Gauge,
} from "lucide-react";
import type { ContentType } from "@prisma/client";
import { requireEditor } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { ContentForm } from "@/components/admin/content-form";
import { CONTENT_TYPE_LABELS, CONTENT_TYPES } from "@/lib/content";

export const dynamic = "force-dynamic";

const TYPE_META: Record<
  ContentType,
  { icon: React.ComponentType<{ className?: string }>; description: string }
> = {
  news: { icon: Newspaper, description: "Algemeen nieuws voor de afdeling" },
  project_update: {
    icon: ClipboardList,
    description: "Status, mijlpaal en aandachtspunt van een project",
  },
  incident: {
    icon: TriangleAlert,
    description: "Incident met leerpunt en maatregel",
  },
  planning: {
    icon: CalendarDays,
    description: "Week- of dagplanning met activiteiten",
  },
  announcement: {
    icon: Megaphone,
    description: "Korte aankondiging of mededeling",
  },
  kpi: { icon: Gauge, description: "Cijfers en prestaties in één oogopslag" },
};

export default async function NewContentPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  await requireEditor();
  const { type } = await searchParams;

  const validType = CONTENT_TYPES.includes(type as ContentType)
    ? (type as ContentType)
    : null;

  if (!validType) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Nieuw bericht
          </h1>
          <p className="text-sm text-slate-500">
            Kies het type bericht dat je wilt maken.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {CONTENT_TYPES.map((contentType) => {
            const meta = TYPE_META[contentType];
            return (
              <Link key={contentType} href={`/content/new?type=${contentType}`}>
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardContent className="flex items-start gap-4 pt-6">
                    <meta.icon className="h-8 w-8 shrink-0 text-slate-700" />
                    <div>
                      <p className="font-medium text-slate-900">
                        {CONTENT_TYPE_LABELS[contentType]}
                      </p>
                      <p className="text-sm text-slate-500">
                        {meta.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Nieuw bericht: {CONTENT_TYPE_LABELS[validType]}
        </h1>
        <p className="text-sm text-slate-500">
          Vul de velden in en publiceer het bericht of sla het op als concept.
        </p>
      </div>
      <ContentForm type={validType} />
    </div>
  );
}
