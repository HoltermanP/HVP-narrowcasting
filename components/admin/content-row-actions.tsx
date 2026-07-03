"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  MoreHorizontal,
  Pencil,
  Eye,
  Upload,
  Archive,
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
  archiveContentItem,
  deleteContentItem,
  publishContentItem,
} from "@/app/(admin)/content/actions";

export function ContentRowActions({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const run = (
    action: () => Promise<{ ok: boolean; error?: string }>,
    successMessage: string
  ) => {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        toast.success(successMessage);
        router.refresh();
      } else {
        toast.error(result.error ?? "Er ging iets mis");
      }
    });
  };

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
          <DropdownMenuItem asChild>
            <Link href={`/content/${id}/edit`}>
              <Pencil className="h-4 w-4" /> Bewerken
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/content/${id}/preview`}>
              <Eye className="h-4 w-4" /> Preview
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {status !== "published" && (
            <DropdownMenuItem
              onClick={() =>
                run(() => publishContentItem(id), "Bericht gepubliceerd")
              }
            >
              <Upload className="h-4 w-4" /> Publiceren
            </DropdownMenuItem>
          )}
          {status !== "archived" && (
            <DropdownMenuItem
              onClick={() =>
                run(() => archiveContentItem(id), "Bericht gearchiveerd")
              }
            >
              <Archive className="h-4 w-4" /> Archiveren
            </DropdownMenuItem>
          )}
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
            <DialogTitle>Bericht verwijderen?</DialogTitle>
            <DialogDescription>
              Het bericht wordt definitief verwijderd en uit alle playlists
              gehaald. Dit kan niet ongedaan worden gemaakt.
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
                run(() => deleteContentItem(id), "Bericht verwijderd");
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
