"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { organizationSchema } from "@/lib/validations";
import type { ActionResult } from "@/app/(admin)/content/actions";

export async function updateOrganization(input: unknown): Promise<ActionResult> {
  const user = await requireAdmin();
  const parsed = organizationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Ongeldige invoer" };
  }

  await prisma.organization.update({
    where: { id: user.organizationId },
    data: {
      name: parsed.data.name,
      logoUrl: parsed.data.logoUrl ?? null,
      primaryColor: parsed.data.primaryColor,
      secondaryColor: parsed.data.secondaryColor,
      backgroundColor: parsed.data.backgroundColor,
      textColor: parsed.data.textColor,
    },
  });

  revalidatePath("/branding");
  revalidatePath("/dashboard");
  return { ok: true };
}
