import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserRoleSelect } from "@/components/admin/user-role-select";

export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium" });

export default async function SettingsPage() {
  const user = await requireUser();
  const isAdmin = user.role === "admin";

  const users = await prisma.user.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Instellingen</h1>
        <p className="text-sm text-slate-500">
          Gebruikers en rollen binnen {user.organization.name}.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gebruikers</CardTitle>
          <CardDescription>
            Nieuwe collega&apos;s maken eerst een account aan via de
            inlogpagina; daarna verschijnen ze hier en kan een admin hun rol
            instellen. <strong>Admin</strong> beheert alles inclusief huisstijl
            en rollen, <strong>editor</strong> beheert content, playlists en
            schermen, <strong>viewer</strong> kan alleen meekijken.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Naam</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Lid sinds</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium text-slate-900">
                    {member.name}
                    {member.id === user.id && (
                      <span className="ml-2 text-xs text-slate-400">(jij)</span>
                    )}
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {member.email}
                  </TableCell>
                  <TableCell>
                    <UserRoleSelect
                      userId={member.id}
                      role={member.role}
                      disabled={!isAdmin || member.id === user.id}
                    />
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {dateFormat.format(member.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
