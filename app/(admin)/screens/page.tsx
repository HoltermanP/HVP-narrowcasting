import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScreenFormDialog } from "@/components/admin/screen-form-dialog";
import {
  ScreenPlaylistSelect,
  ScreenRowActions,
} from "@/components/admin/screen-row-actions";
import { formatLastSeen, isScreenOnline } from "@/lib/screen-status";

export const dynamic = "force-dynamic";

export default async function ScreensPage() {
  const user = await requireUser();

  const [screens, playlists] = await Promise.all([
    prisma.screen.findMany({
      where: { organizationId: user.organizationId },
      include: { playlists: { select: { id: true, name: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.playlist.findMany({
      where: { organizationId: user.organizationId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Schermen</h1>
          <p className="text-sm text-slate-500">
            Beheer de fysieke schermen en hun player-URL&apos;s.
          </p>
        </div>
        <ScreenFormDialog
          trigger={
            <Button>
              <Plus className="h-4 w-4" /> Nieuw scherm
            </Button>
          }
        />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Naam</TableHead>
              <TableHead>Locatie</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Playlist</TableHead>
              <TableHead>Laatste heartbeat</TableHead>
              <TableHead>Player-URL</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {screens.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-10 text-center text-slate-500"
                >
                  Nog geen schermen. Maak een nieuw scherm aan.
                </TableCell>
              </TableRow>
            )}
            {screens.map((screen) => {
              const online = isScreenOnline(screen.lastSeenAt);
              return (
                <TableRow key={screen.id}>
                  <TableCell className="font-medium text-slate-900">
                    {screen.name}
                    {!screen.isActive && (
                      <Badge
                        variant="outline"
                        className="ml-2 border-slate-200 bg-slate-100 text-slate-500"
                      >
                        Inactief
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {screen.location ?? "—"}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 text-sm">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          online ? "bg-emerald-500" : "bg-slate-300"
                        }`}
                      />
                      {online ? "Online" : "Offline"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <ScreenPlaylistSelect
                      screenId={screen.id}
                      currentPlaylistId={screen.playlists[0]?.id ?? null}
                      playlists={playlists}
                    />
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">
                    {formatLastSeen(screen.lastSeenAt)}
                  </TableCell>
                  <TableCell>
                    <code className="rounded bg-slate-100 px-2 py-1 text-xs">
                      /player/{screen.slug}
                    </code>
                  </TableCell>
                  <TableCell>
                    <ScreenRowActions
                      screen={{
                        id: screen.id,
                        name: screen.name,
                        location: screen.location,
                        slug: screen.slug,
                        isActive: screen.isActive,
                      }}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
