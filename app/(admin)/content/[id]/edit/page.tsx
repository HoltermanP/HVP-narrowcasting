import { notFound } from "next/navigation";
import { requireEditor } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ContentForm } from "@/components/admin/content-form";
import { CONTENT_TYPE_LABELS } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function EditContentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireEditor();
  const { id } = await params;

  const item = await prisma.contentItem.findFirst({
    where: { id, organizationId: user.organizationId },
  });
  if (!item) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Bewerken: {CONTENT_TYPE_LABELS[item.type]}
        </h1>
        <p className="text-sm text-slate-500">{item.title}</p>
      </div>
      <ContentForm type={item.type} item={item} />
    </div>
  );
}
