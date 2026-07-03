"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createPlaylist, updatePlaylist } from "@/app/(admin)/playlists/actions";

const NONE = "none";

export type ScreenOption = { id: string; name: string };

export function PlaylistFormDialog({
  screens,
  playlist,
  trigger,
}: {
  screens: ScreenOption[];
  playlist?: {
    id: string;
    name: string;
    screenId: string | null;
    isDefault: boolean;
  };
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(playlist?.name ?? "");
  const [screenId, setScreenId] = useState(playlist?.screenId ?? NONE);
  const [isDefault, setIsDefault] = useState(playlist?.isDefault ?? false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const input = {
      name,
      screenId: screenId === NONE ? undefined : screenId,
      isDefault,
    };
    startTransition(async () => {
      const result = playlist
        ? await updatePlaylist(playlist.id, input)
        : await createPlaylist(input);
      if (result.ok) {
        toast.success(playlist ? "Playlist bijgewerkt" : "Playlist aangemaakt");
        setOpen(false);
        if (!playlist) setName("");
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
              {playlist ? "Playlist bewerken" : "Nieuwe playlist"}
            </DialogTitle>
            <DialogDescription>
              Een playlist bepaalt welke berichten in welke volgorde op een
              scherm verschijnen.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="playlist-name">Naam *</Label>
            <Input
              id="playlist-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label>Gekoppeld scherm</Label>
            <Select value={screenId} onValueChange={setScreenId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Geen scherm</SelectItem>
                {screens.map((screen) => (
                  <SelectItem key={screen.id} value={screen.id}>
                    {screen.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-md border border-slate-200 p-3">
            <div>
              <Label htmlFor="playlist-default">Standaardplaylist</Label>
              <p className="text-xs text-slate-500">
                Wordt gebruikt voor schermen zonder eigen playlist.
              </p>
            </div>
            <Switch
              id="playlist-default"
              checked={isDefault}
              onCheckedChange={setIsDefault}
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
              {playlist ? "Opslaan" : "Aanmaken"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
