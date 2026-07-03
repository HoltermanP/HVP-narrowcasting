"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  addContentToPlaylist,
  movePlaylistItem,
  removePlaylistItem,
  updatePlaylistItemDuration,
} from "@/app/(admin)/playlists/actions";
import {
  CONTENT_STATUS_LABELS,
  CONTENT_TYPE_LABELS,
  STATUS_BADGE_CLASSES,
} from "@/lib/content";
import type { ContentStatus, ContentType } from "@prisma/client";

export type PlaylistItemRow = {
  id: string;
  sortOrder: number;
  durationSeconds: number | null;
  contentItem: {
    id: string;
    title: string;
    type: ContentType;
    status: ContentStatus;
    durationSeconds: number;
  };
};

export type AvailableContent = {
  id: string;
  title: string;
  type: ContentType;
  status: ContentStatus;
};

export function PlaylistItems({
  playlistId,
  items,
  availableContent,
}: {
  playlistId: string;
  items: PlaylistItemRow[];
  availableContent: AvailableContent[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [addOpen, setAddOpen] = useState(false);

  const run = (
    action: () => Promise<{ ok: boolean; error?: string }>,
    successMessage?: string
  ) => {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        if (successMessage) toast.success(successMessage);
        router.refresh();
      } else {
        toast.error(result.error ?? "Er ging iets mis");
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">
          Items ({items.length})
        </h2>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Plus className="h-4 w-4" /> Bericht toevoegen
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Bericht toevoegen</DialogTitle>
              <DialogDescription>
                Kies een bericht om aan deze playlist toe te voegen.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              {availableContent.length === 0 && (
                <p className="py-6 text-center text-sm text-slate-500">
                  Alle berichten staan al in deze playlist, of er is nog geen
                  content.
                </p>
              )}
              {availableContent.map((content) => (
                <button
                  key={content.id}
                  type="button"
                  disabled={isPending}
                  className="flex w-full items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-left hover:bg-slate-50 disabled:opacity-50"
                  onClick={() => {
                    setAddOpen(false);
                    run(
                      () => addContentToPlaylist(playlistId, content.id),
                      "Bericht toegevoegd"
                    );
                  }}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-slate-900">
                      {content.title}
                    </span>
                    <span className="text-xs text-slate-500">
                      {CONTENT_TYPE_LABELS[content.type]}
                    </span>
                  </span>
                  <Badge
                    variant="outline"
                    className={STATUS_BADGE_CLASSES[content.status]}
                  >
                    {CONTENT_STATUS_LABELS[content.status]}
                  </Badge>
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">Volgorde</TableHead>
              <TableHead>Titel</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-36">Duur (sec)</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-slate-500"
                >
                  Deze playlist is nog leeg. Voeg berichten toe.
                </TableCell>
              </TableRow>
            )}
            {items.map((item, index) => (
              <TableRow key={item.id}>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={isPending || index === 0}
                      onClick={() => run(() => movePlaylistItem(item.id, "up"))}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={isPending || index === items.length - 1}
                      onClick={() =>
                        run(() => movePlaylistItem(item.id, "down"))
                      }
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <span className="ml-1 text-sm text-slate-500">
                      {index + 1}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="font-medium text-slate-900">
                  {item.contentItem.title}
                </TableCell>
                <TableCell className="text-slate-600">
                  {CONTENT_TYPE_LABELS[item.contentItem.type]}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={STATUS_BADGE_CLASSES[item.contentItem.status]}
                  >
                    {CONTENT_STATUS_LABELS[item.contentItem.status]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min={3}
                    max={600}
                    className="h-8 w-24"
                    defaultValue={
                      item.durationSeconds ?? item.contentItem.durationSeconds
                    }
                    onBlur={(e) => {
                      const value = Number(e.target.value);
                      const fallback =
                        item.durationSeconds ??
                        item.contentItem.durationSeconds;
                      if (!value || value === fallback) return;
                      run(
                        () => updatePlaylistItemDuration(item.id, value),
                        "Duur aangepast"
                      );
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={isPending}
                    onClick={() =>
                      run(() => removePlaylistItem(item.id), "Item verwijderd")
                    }
                  >
                    <Trash2 className="h-4 w-4 text-slate-500" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-slate-500">
        De duur per item overschrijft de standaardduur van het bericht. Alleen
        gepubliceerde berichten binnen hun publicatieperiode zijn zichtbaar op
        het scherm.
      </p>
    </div>
  );
}
