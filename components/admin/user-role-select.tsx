"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import type { Role } from "@prisma/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateUserRole } from "@/app/(admin)/settings/actions";

const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  editor: "Editor",
  viewer: "Viewer",
};

export function UserRoleSelect({
  userId,
  role,
  disabled,
}: {
  userId: string;
  role: Role;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (disabled) {
    return <span className="text-sm text-slate-600">{ROLE_LABELS[role]}</span>;
  }

  return (
    <Select
      value={role}
      disabled={isPending}
      onValueChange={(value) =>
        startTransition(async () => {
          const result = await updateUserRole(userId, value as Role);
          if (result.ok) {
            toast.success("Rol bijgewerkt");
            router.refresh();
          } else {
            toast.error(result.error ?? "Er ging iets mis");
          }
        })
      }
    >
      <SelectTrigger className="h-8 w-32 bg-white">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(ROLE_LABELS) as Role[]).map((value) => (
          <SelectItem key={value} value={value}>
            {ROLE_LABELS[value]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
