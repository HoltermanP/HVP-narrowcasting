"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { FileUp, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ImportResponse = {
  ok: boolean;
  gantt: { id: string; created: boolean }[];
  highlights: { id: string; created: boolean } | null;
  topics: { topicId: string; title: string; id: string; created: boolean }[];
  projectCount: number;
  highlightCount: number;
};

export function VgrUpload({ activeTopicCount }: { activeTopicCount: number }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResponse | null>(null);

  async function handleImport() {
    if (!file) return;
    setBusy(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/import-vgr", {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error ?? "Import mislukt");
      }
      setResult(data as ImportResponse);
      toast.success("VGR verwerkt — slides zijn bijgewerkt");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import mislukt");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>VGR uploaden</CardTitle>
        <CardDescription>
          Upload de maandelijkse voortgangsrapportage (PDF). De AI maakt per
          actief onderwerp een slide, plus de planning (Gantt) en de
          highlights. Bestaande slides worden bijgewerkt.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setResult(null);
          }}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => fileInputRef.current?.click()}
          className="flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed border-slate-300 px-4 py-8 text-slate-500 transition-colors hover:border-slate-400 hover:text-slate-700 disabled:opacity-50"
        >
          <FileUp className="h-8 w-8" />
          {file ? (
            <span className="text-sm font-medium text-slate-900">
              {file.name}
            </span>
          ) : (
            <span className="text-sm">
              Klik om de VGR-PDF te kiezen (max 20 MB)
            </span>
          )}
        </button>

        {busy && (
          <p className="flex items-center gap-2 text-sm text-slate-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            De AI analyseert de VGR en maakt {activeTopicCount} onderwerpslides
            + planning — dit kan enkele minuten duren…
          </p>
        )}

        {result && (
          <div className="space-y-1 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
            {result.gantt.map((part, index) => (
              <p key={part.id}>
                ✓ Planning
                {result.gantt.length > 1
                  ? ` deel ${index + 1}/${result.gantt.length}`
                  : ` (${result.projectCount} projecten)`}{" "}
                {part.created ? "aangemaakt" : "bijgewerkt"} —{" "}
                <Link href={`/content/${part.id}/preview`} className="underline">
                  preview
                </Link>
              </p>
            ))}
            {result.highlights && (
              <p>
                ✓ Highlights ({result.highlightCount}){" "}
                {result.highlights.created ? "aangemaakt" : "bijgewerkt"} —{" "}
                <Link
                  href={`/content/${result.highlights.id}/preview`}
                  className="underline"
                >
                  preview
                </Link>
              </p>
            )}
            {result.topics.map((topic) => (
              <p key={topic.topicId}>
                ✓ {topic.title} {topic.created ? "aangemaakt" : "bijgewerkt"} —{" "}
                <Link href={`/content/${topic.id}/preview`} className="underline">
                  preview
                </Link>
              </p>
            ))}
          </div>
        )}

        <Button
          onClick={handleImport}
          disabled={!file || busy || activeTopicCount === 0}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          VGR verwerken met AI
        </Button>
        {activeTopicCount === 0 && (
          <p className="text-xs text-amber-600">
            Voeg eerst minimaal één actief onderwerp toe.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
