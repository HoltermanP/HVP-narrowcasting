import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { VgrTopics } from "@/components/admin/vgr-topics";
import { VgrUpload } from "@/components/admin/vgr-upload";

export const dynamic = "force-dynamic";

export default async function VgrPage() {
  const user = await requireUser();

  const topics = await prisma.vgrTopic.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">VGR-import</h1>
        <p className="text-sm text-slate-500">
          Upload de maandelijkse voortgangsrapportage en bepaal zelf van welke
          onderwerpen slides worden gemaakt.
        </p>
      </div>

      <VgrUpload
        activeTopicCount={topics.filter((topic) => topic.isActive).length}
      />

      <VgrTopics
        topics={topics.map((topic) => ({
          id: topic.id,
          title: topic.title,
          instructions: topic.instructions,
          isActive: topic.isActive,
        }))}
      />
    </div>
  );
}
