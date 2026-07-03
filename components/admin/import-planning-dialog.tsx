"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { FileUp, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type ImportResponse = {
  ok: boolean;
  gantt: { id: string; created: boolean }[];
  highlights: { id: string; created: boolean } | null;
  taskCount: number;
  highlightCount: number;
};

export function ImportPlanningDialog() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
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
      const res = await fetch("/api/import-planning", {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error ?? "Import mislukt");
      }
      setResult(data as ImportResponse);
      toast.success(
        data.gantt[0]?.created
          ? "Planning aangemaakt en aan de standaardplaylist toegevoegd"
          : "Bestaande planning bijgewerkt"
      );
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import mislukt");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setFile(null);
    setResult(null);
    setBusy(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <Sparkles className="h-4 w-4" /> Planning importeren (AI)
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Planning importeren met AI</DialogTitle>
          <DialogDescription>
            Upload een planning als PDF (bijv. een mijlpalenplanning). De AI
            maakt er een hoogover Gantt-slide van plus een highlights-slide.
            Upload je later een nieuwe versie van hetzelfde document, dan worden
            de bestaande slides bijgewerkt.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
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
              <span className="text-sm">Klik om een PDF te kiezen (max 15 MB)</span>
            )}
          </button>

          {busy && (
            <p className="flex items-center gap-2 text-sm text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              De AI analyseert de planning — dit kan een minuut duren…
            </p>
          )}

          {result && (
            <div className="space-y-1 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
              {result.gantt.map((part, index) => (
                <p key={part.id}>
                  ✓ Gantt-planning
                  {result.gantt.length > 1
                    ? ` deel ${index + 1}/${result.gantt.length}`
                    : ` (${result.taskCount} projecten)`}{" "}
                  {part.created ? "aangemaakt" : "bijgewerkt"} —{" "}
                  <Link
                    href={`/content/${part.id}/preview`}
                    className="underline"
                    onClick={() => setOpen(false)}
                  >
                    bekijk preview
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
                    onClick={() => setOpen(false)}
                  >
                    bekijk preview
                  </Link>
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
            Sluiten
          </Button>
          <Button onClick={handleImport} disabled={!file || busy}>
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Importeren
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
