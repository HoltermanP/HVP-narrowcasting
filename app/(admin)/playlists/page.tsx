import Link from "next/link";
import { Plus, Star } from "lucide-react";
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
import { PlaylistFormDialog } from "@/components/admin/playlist-form-dialog";

export const dynamic = "force-dynamic";

export default async function PlaylistsPage() {
  const user = await requireUser();

  const [playlists, screens] = await Promise.all([
    prisma.playlist.findMany({
      where: { organizationId: user.organizationId },
      include: {
        screen: { select: { name: true } },
        _count: { select: { items: true } },
      },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    }),
    prisma.screen.findMany({
      where: { organizationId: user.organizationId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Playlists</h1>
          <p className="text-sm text-slate-500">
            Bepaal welke berichten in welke volgorde op de schermen draaien.
          </p>
        </div>
        <PlaylistFormDialog
          screens={screens}
          trigger={
            <Button>
              <Plus className="h-4 w-4" /> Nieuwe playlist
            </Button>
          }
        />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Naam</TableHead>
              <TableHead>Gekoppeld scherm</TableHead>
              <TableHead>Aantal items</TableHead>
              <TableHead>Standaard</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {playlists.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-10 text-center text-slate-500"
                >
                  Nog geen playlists. Maak een nieuwe playlist aan.
                </TableCell>
              </TableRow>
            )}
            {playlists.map((playlist) => (
              <TableRow key={playlist.id}>
                <TableCell>
                  <Link
                    href={`/playlists/${playlist.id}`}
                    className="font-medium text-slate-900 hover:underline"
                  >
                    {playlist.name}
                  </Link>
                </TableCell>
                <TableCell className="text-slate-600">
                  {playlist.screen?.name ?? "—"}
                </TableCell>
                <TableCell className="text-slate-600">
                  {playlist._count.items}
                </TableCell>
                <TableCell>
                  {playlist.isDefault && (
                    <Badge
                      variant="outline"
                      className="border-amber-200 bg-amber-50 text-amber-800"
                    >
                      <Star className="h-3 w-3" /> Standaard
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
