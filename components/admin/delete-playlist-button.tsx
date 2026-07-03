"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
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
import { deletePlaylist } from "@/app/(admin)/playlists/actions";

export function DeletePlaylistButton({
  playlistId,
  trigger,
}: {
  playlistId: string;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Playlist verwijderen?</DialogTitle>
          <DialogDescription>
            De playlist en de volgorde worden verwijderd. De berichten zelf
            blijven bestaan. Een scherm dat deze playlist gebruikt, valt terug
            op de standaardplaylist.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuleren
          </Button>
          <Button
            variant="destructive"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                const result = await deletePlaylist(playlistId);
                if (result.ok) {
                  toast.success("Playlist verwijderd");
                  router.push("/playlists");
                  router.refresh();
                } else {
                  toast.error(result.error ?? "Er ging iets mis");
                }
              })
            }
          >
            Verwijderen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
