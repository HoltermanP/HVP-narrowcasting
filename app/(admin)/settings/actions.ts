"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import type { ActionResult } from "@/app/(admin)/content/actions";
import type { Role } from "@prisma/client";

const ROLES: Role[] = ["admin", "editor", "viewer"];

export async function updateUserRole(
  userId: string,
  role: Role
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!ROLES.includes(role)) return { ok: false, error: "Ongeldige rol" };
  if (userId === admin.id) {
    return { ok: false, error: "Je kunt je eigen rol niet wijzigen" };
  }

  const target = await prisma.user.findFirst({
    where: { id: userId, organizationId: admin.organizationId },
  });
  if (!target) return { ok: false, error: "Gebruiker niet gevonden" };

  await prisma.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/settings");
  return { ok: true };
}
