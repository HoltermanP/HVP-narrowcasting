"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Copy,
  ExternalLink,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScreenFormDialog } from "@/components/admin/screen-form-dialog";
import {
  assignPlaylistToScreen,
  deleteScreen,
} from "@/app/(admin)/screens/actions";

const NONE = "none";

export type PlaylistOption = { id: string; name: string };

export function ScreenPlaylistSelect({
  screenId,
  currentPlaylistId,
  playlists,
}: {
  screenId: string;
  currentPlaylistId: string | null;
  playlists: PlaylistOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Select
      value={currentPlaylistId ?? NONE}
      disabled={isPending}
      onValueChange={(value) =>
        startTransition(async () => {
          const result = await assignPlaylistToScreen(
            screenId,
            value === NONE ? null : value
          );
          if (result.ok) {
            toast.success("Playlistkoppeling bijgewerkt");
            router.refresh();
          } else {
            toast.error(result.error ?? "Er ging iets mis");
          }
        })
      }
    >
      <SelectTrigger className="h-8 w-48 bg-white">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>Standaardplaylist</SelectItem>
        {playlists.map((playlist) => (
          <SelectItem key={playlist.id} value={playlist.id}>
            {playlist.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function ScreenRowActions({
  screen,
}: {
  screen: {
    id: string;
    name: string;
    location: string | null;
    slug: string;
    isActive: boolean;
  };
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const playerPath = `/player/${screen.slug}`;

  function copyUrl() {
    const url = `${window.location.origin}${playerPath}`;
    navigator.clipboard
      .writeText(url)
      .then(() => toast.success("Player-URL gekopieerd"))
      .catch(() => toast.error("Kopiëren mislukt"));
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" disabled={isPending}>
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Acties</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <ScreenFormDialog
            screen={screen}
            trigger={
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <Pencil className="h-4 w-4" /> Bewerken
              </DropdownMenuItem>
            }
          />
          <DropdownMenuItem onClick={copyUrl}>
            <Copy className="h-4 w-4" /> Kopieer player-URL
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href={playerPath} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" /> Open player
            </a>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="h-4 w-4" /> Verwijderen
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Scherm verwijderen?</DialogTitle>
            <DialogDescription>
              Het scherm en de heartbeat-geschiedenis worden verwijderd. De
              player-URL werkt daarna niet meer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              Annuleren
            </Button>
            <Button
              variant="destructive"
              disabled={isPending}
              onClick={() => {
                setConfirmDelete(false);
                startTransition(async () => {
                  const result = await deleteScreen(screen.id);
                  if (result.ok) {
                    toast.success("Scherm verwijderd");
                    router.refresh();
                  } else {
                    toast.error(result.error ?? "Er ging iets mis");
                  }
                });
              }}
            >
              Verwijderen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
