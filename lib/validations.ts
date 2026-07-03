import { z } from "zod";

const trafficLight = z.enum(["groen", "oranje", "rood"]);

const optionalTrimmed = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .transform((v) => (v ? v : undefined));

export const contentMetadataSchema = z.object({
  projectStatus: trafficLight.optional(),
  milestone: optionalTrimmed,
  attentionPoint: optionalTrimmed,
  owner: optionalTrimmed,
  incidentDate: optionalTrimmed,
  lesson: optionalTrimmed,
  measure: optionalTrimmed,
  period: optionalTrimmed,
  activities: z.array(z.string().trim().min(1).max(300)).max(20).optional(),
  planningView: z.enum(["lijst", "gantt"]).optional(),
  importKey: z
    .string()
    .trim()
    .max(80)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  tasks: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(120),
        start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ongeldige startdatum"),
        end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ongeldige einddatum"),
        status: trafficLight.optional(),
        phase: z.string().trim().max(60).optional(),
        milestoneLabel: z.string().trim().max(120).optional(),
        milestoneDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, "Ongeldige mijlpaaldatum")
          .optional(),
      })
    )
    .max(12)
    .optional(),
  bullets: z.array(z.string().trim().min(1).max(250)).max(8).optional(),
  ganttDomain: z
    .object({
      start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    })
    .optional(),
  highlightGroups: z
    .object({
      achieved: z.array(z.string().trim().min(1).max(200)).max(8),
      upcoming: z.array(z.string().trim().min(1).max(200)).max(8),
      progress: z.array(z.string().trim().min(1).max(200)).max(8),
    })
    .optional(),
  kpis: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(100),
        value: z.string().trim().min(1).max(50),
        status: trafficLight,
      })
    )
    .max(12)
    .optional(),
});

export const contentItemSchema = z.object({
  title: z.string().trim().min(1, "Titel is verplicht").max(200),
  subtitle: optionalTrimmed,
  body: z
    .string()
    .trim()
    .max(5000)
    .optional()
    .transform((v) => (v ? v : undefined)),
  type: z.enum([
    "news",
    "project_update",
    "incident",
    "planning",
    "announcement",
    "kpi",
  ]),
  status: z.enum(["draft", "scheduled", "published", "archived"]),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  imageUrl: z
    .string()
    .trim()
    .url("Ongeldige afbeeldings-URL")
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
  durationSeconds: z.coerce
    .number()
    .int()
    .min(3, "Minimaal 3 seconden")
    .max(600, "Maximaal 600 seconden"),
  metadata: contentMetadataSchema.optional(),
});

export type ContentItemInput = z.infer<typeof contentItemSchema>;

export const screenSchema = z.object({
  name: z.string().trim().min(1, "Naam is verplicht").max(100),
  location: optionalTrimmed,
  slug: z
    .string()
    .trim()
    .min(8, "Slug moet minimaal 8 tekens zijn (moeilijk te raden)")
    .max(100)
    .regex(
      /^[a-z0-9-]+$/,
      "Alleen kleine letters, cijfers en streepjes toegestaan"
    ),
  isActive: z.boolean(),
});

export type ScreenInput = z.infer<typeof screenSchema>;

export const playlistSchema = z.object({
  name: z.string().trim().min(1, "Naam is verplicht").max(100),
  screenId: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined)),
  isDefault: z.boolean(),
});

export type PlaylistInput = z.infer<typeof playlistSchema>;

export const organizationSchema = z.object({
  name: z.string().trim().min(1, "Naam is verplicht").max(100),
  logoUrl: z
    .string()
    .trim()
    .url("Ongeldige logo-URL")
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Ongeldige kleurcode"),
  secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Ongeldige kleurcode"),
  backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Ongeldige kleurcode"),
  textColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Ongeldige kleurcode"),
});

export type OrganizationInput = z.infer<typeof organizationSchema>;
