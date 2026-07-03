"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  createVgrTopic,
  deleteVgrTopic,
  moveVgrTopic,
  toggleVgrTopic,
  updateVgrTopic,
} from "@/app/(admin)/vgr/actions";

export type VgrTopicRow = {
  id: string;
  title: string;
  instructions: string | null;
  isActive: boolean;
};

function TopicDialog({
  topic,
  trigger,
}: {
  topic?: VgrTopicRow;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState(topic?.title ?? "");
  const [instructions, setInstructions] = useState(topic?.instructions ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const input = { title, instructions: instructions || undefined };
    startTransition(async () => {
      const result = topic
        ? await updateVgrTopic(topic.id, input)
        : await createVgrTopic(input);
      if (result.ok) {
        toast.success(topic ? "Onderwerp bijgewerkt" : "Onderwerp toegevoegd");
        setOpen(false);
        if (!topic) {
          setTitle("");
          setInstructions("");
        }
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>
              {topic ? "Onderwerp bewerken" : "Nieuw onderwerp"}
            </DialogTitle>
            <DialogDescription>
              Per onderwerp maakt de AI bij elke VGR-upload één slide. Gebruik
              de instructie om te sturen wat erop komt.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="topic-title">Onderwerp *</Label>
            <Input
              id="topic-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Bijv. Veiligheid"
              required
              maxLength={100}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="topic-instructions">Instructie voor de AI</Label>
            <Textarea
              id="topic-instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Bijv. Toon de veiligheidsmeldingen van deze maand en sluit af met een leerpunt."
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuleren
            </Button>
            <Button type="submit" disabled={isPending}>
              {topic ? "Opslaan" : "Toevoegen"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function VgrTopics({ topics }: { topics: VgrTopicRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const run = (action: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      const result = await action();
      if (result.ok) router.refresh();
      else toast.error(result.error ?? "Er ging iets mis");
    });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">
          Onderwerpen ({topics.filter((t) => t.isActive).length} actief)
        </h2>
        <TopicDialog
          trigger={
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4" /> Onderwerp toevoegen
            </Button>
          }
        />
      </div>

      <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
        {topics.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-500">
            Nog geen onderwerpen. Voeg een onderwerp toe om te bepalen welke
            slides er uit de VGR worden gemaakt.
          </p>
        )}
        {topics.map((topic, index) => (
          <div key={topic.id} className="flex items-center gap-3 px-4 py-3">
            <div className="flex flex-col">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                disabled={isPending || index === 0}
                onClick={() => run(() => moveVgrTopic(topic.id, "up"))}
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                disabled={isPending || index === topics.length - 1}
                onClick={() => run(() => moveVgrTopic(topic.id, "down"))}
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="min-w-0 flex-1">
              <p
                className={`text-sm font-medium ${
                  topic.isActive ? "text-slate-900" : "text-slate-400"
                }`}
              >
                {topic.title}
              </p>
              {topic.instructions && (
                <p className="truncate text-xs text-slate-500">
                  {topic.instructions}
                </p>
              )}
            </div>
            <Switch
              checked={topic.isActive}
              disabled={isPending}
              onCheckedChange={(checked) =>
                run(() => toggleVgrTopic(topic.id, checked))
              }
            />
            <TopicDialog
              topic={topic}
              trigger={
                <Button variant="ghost" size="icon" disabled={isPending}>
                  <Pencil className="h-4 w-4" />
                </Button>
              }
            />
            <Button
              variant="ghost"
              size="icon"
              disabled={isPending}
              onClick={() => run(() => deleteVgrTopic(topic.id))}
            >
              <Trash2 className="h-4 w-4 text-slate-500" />
            </Button>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-500">
        Slides worden per onderwerp bijgewerkt bij elke upload (niet
        gedupliceerd). Zet een onderwerp uit om het bij de volgende upload over
        te slaan; de bestaande slide blijft dan ongewijzigd staan.
      </p>
    </div>
  );
}
