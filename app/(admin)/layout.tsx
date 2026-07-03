import { UserButton } from "@clerk/nextjs";
import { MonitorPlay } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { SidebarNav } from "@/components/admin/sidebar-nav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r border-slate-200 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-4">
          <MonitorPlay className="h-6 w-6 text-slate-900" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">
              {user.organization.name}
            </p>
            <p className="text-xs text-slate-500">Narrowcasting</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <SidebarNav />
        </div>
        <div className="flex items-center gap-3 border-t border-slate-200 px-4 py-3">
          <UserButton />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-900">
              {user.name}
            </p>
            <p className="truncate text-xs capitalize text-slate-500">
              {user.role}
            </p>
          </div>
        </div>
      </aside>
      <main className="ml-60 flex-1 px-8 py-8">{children}</main>
    </div>
  );
}
