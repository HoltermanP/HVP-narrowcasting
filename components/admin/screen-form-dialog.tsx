"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createScreen, updateScreen } from "@/app/(admin)/screens/actions";

function randomSlugSuffix(length = 8): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);
  for (let i = 0; i < length; i++) {
    result += chars[values[i] % chars.length];
  }
  return result;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function ScreenFormDialog({
  screen,
  trigger,
}: {
  screen?: {
    id: string;
    name: string;
    location: string | null;
    slug: string;
    isActive: boolean;
  };
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(screen?.name ?? "");
  const [location, setLocation] = useState(screen?.location ?? "");
  const [slug, setSlug] = useState(screen?.slug ?? "");
  const [isActive, setIsActive] = useState(screen?.isActive ?? true);

  function generateSlug() {
    const base = slugify(name) || "scherm";
    setSlug(`${base}-${randomSlugSuffix()}`);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const input = { name, location: location || undefined, slug, isActive };
    startTransition(async () => {
      const result = screen
        ? await updateScreen(screen.id, input)
        : await createScreen(input);
      if (result.ok) {
        toast.success(screen ? "Scherm bijgewerkt" : "Scherm aangemaakt");
        setOpen(false);
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
              {screen ? "Scherm bewerken" : "Nieuw scherm"}
            </DialogTitle>
            <DialogDescription>
              Een scherm is een fysiek beeldscherm met een eigen player-URL.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="screen-name">Naam *</Label>
            <Input
              id="screen-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Bijv. Scherm kantine"
              required
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="screen-location">Locatie</Label>
            <Input
              id="screen-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Bijv. Kantine, hal 1"
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="screen-slug">Slug (player-URL) *</Label>
            <div className="flex gap-2">
              <Input
                id="screen-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="bijv. kantine-x7k2m9ab"
                required
                minLength={8}
                pattern="[a-z0-9-]+"
                className="font-mono text-sm"
              />
              <Button type="button" variant="outline" onClick={generateSlug}>
                <RefreshCw className="h-4 w-4" /> Genereer
              </Button>
            </div>
            <p className="text-xs text-slate-500">
              De player draait op <span className="font-mono">/player/&lt;slug&gt;</span>.
              Gebruik een moeilijk te raden slug; iedereen met de URL kan
              meekijken.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-md border border-slate-200 p-3">
            <div>
              <Label htmlFor="screen-active">Actief</Label>
              <p className="text-xs text-slate-500">
                Inactieve schermen tonen geen content.
              </p>
            </div>
            <Switch
              id="screen-active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Annuleren
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {screen ? "Opslaan" : "Aanmaken"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
