import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { Organization, User } from "@prisma/client";

export type AppUser = User & { organization: Organization };

/**
 * Haalt de ingelogde gebruiker op (incl. organisatie). Bij een eerste login
 * wordt automatisch een User-record aangemaakt en gekoppeld aan de (eerste)
 * organisatie; de allereerste gebruiker wordt admin.
 */
export async function requireUser(): Promise<AppUser> {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const existing = await prisma.user.findUnique({
    where: { clerkUserId: userId },
    include: { organization: true },
  });
  if (existing) return existing;

  const clerkUser = await currentUser();

  let organization = await prisma.organization.findFirst({
    orderBy: { createdAt: "asc" },
  });
  if (!organization) {
    organization = await prisma.organization.create({
      data: { name: "Mijn afdeling" },
    });
  }

  const isFirstUser =
    (await prisma.user.count({
      where: { organizationId: organization.id },
    })) === 0;

  return prisma.user.create({
    data: {
      clerkUserId: userId,
      name:
        clerkUser?.fullName ||
        clerkUser?.firstName ||
        clerkUser?.primaryEmailAddress?.emailAddress ||
        "Gebruiker",
      email:
        clerkUser?.primaryEmailAddress?.emailAddress ??
        `${userId}@onbekend.local`,
      role: isFirstUser ? "admin" : "editor",
      organizationId: organization.id,
    },
    include: { organization: true },
  });
}

/** Alleen admins; anderen worden teruggestuurd naar het dashboard. */
export async function requireAdmin(): Promise<AppUser> {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/dashboard");
  return user;
}

/** Admins en editors mogen schrijven; viewers niet. */
export async function requireEditor(): Promise<AppUser> {
  const user = await requireUser();
  if (user.role === "viewer") redirect("/dashboard");
  return user;
}
