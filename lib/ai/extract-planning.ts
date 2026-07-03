import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

/**
 * Extraheert een hoogover projectplanning (per fase, met eerstvolgende
 * mijlpaal) + echte highlights uit een geüploade planning-PDF via de Claude API.
 */

const trafficLight = z.enum(["groen", "oranje", "rood"]);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

// Lege strings uit structured output normaliseren naar undefined
const optionalIsoDate = z
  .string()
  .transform((v) => (v ? v : undefined))
  .pipe(isoDate.optional());
const optionalText = z
  .string()
  .trim()
  .max(120)
  .transform((v) => (v ? v : undefined));

/** Gedeelde Zod-vorm voor het planningdeel (ook gebruikt door de VGR-import). */
export const planningZodShape = {
  title: z.string().trim().min(1).max(120),
  period: z.string().trim().max(60),
  importKey: z
    .string()
    .trim()
    .min(3)
    .max(80)
    .regex(/^[a-z0-9-]+$/),
  statusDate: z.string().trim().max(30).optional(),
  projects: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(120),
        phase: z.string().trim().min(1).max(60),
        start: isoDate,
        end: isoDate,
        status: trafficLight,
        nextMilestoneLabel: optionalText,
        nextMilestoneDate: optionalIsoDate,
      })
    )
    .min(1)
    .max(12),
  achievedHighlights: z.array(z.string().trim().min(1).max(200)).max(8),
  upcomingHighlights: z.array(z.string().trim().min(1).max(200)).max(8),
  progressHighlights: z.array(z.string().trim().min(1).max(200)).max(8),
} as const;

export const extractedPlanningSchema = z.object(planningZodShape);

export type ExtractedPlanning = z.infer<typeof extractedPlanningSchema>;

// JSON-schema-properties voor het planningdeel (gedeeld met de VGR-import)
export const PLANNING_SCHEMA_PROPS = {
    title: {
      type: "string",
      description:
        "Korte titel van de planning, zonder datums of versienummers. Bijv. 'Mijlpalenplanning NuLelie'.",
    },
    period: {
      type: "string",
      description:
        "Korte aanduiding van de periode die de planning bestrijkt, bijv. '2026 – 2028'.",
    },
    importKey: {
      type: "string",
      description:
        "Stabiele sleutel in kebab-case, afgeleid van de titel ZONDER datums/versies, bijv. 'mijlpalenplanning-nulelie'. Moet bij elke upload van hetzelfde soort document identiek zijn.",
    },
    statusDate: {
      type: "string",
      description:
        "Statusdatum van het document (ISO YYYY-MM-DD), indien vermeld.",
    },
    projects: {
      type: "array",
      description:
        "Hoogover planning: precies één regel per (deel)project, maximaal 12.",
      items: {
        type: "object",
        properties: {
          label: {
            type: "string",
            description:
              "Korte projectnaam, bijv. 'Urk Noord (WP2)'. Zonder programmaprefix.",
          },
          phase: {
            type: "string",
            description:
              "De huidige fase van het project, kort. Kies uit: 'Ontwerp', 'Contractvorming', 'Uitvoering', 'Oplevering', 'Gereed', 'On hold' (of een vergelijkbare korte fasenaam die uit het document blijkt).",
          },
          start: { type: "string", format: "date" },
          end: { type: "string", format: "date" },
          status: { type: "string", enum: ["groen", "oranje", "rood"] },
          nextMilestoneLabel: {
            type: "string",
            description:
              "Kort label (max ± 4 woorden) van de EERSTVOLGENDE mijlpaal na vandaag, bijv. 'UO gereed' of 'Start boren'. Lege string als er geen komende mijlpaal is.",
          },
          nextMilestoneDate: {
            type: "string",
            description:
              "ISO-datum (YYYY-MM-DD) van die eerstvolgende mijlpaal. Lege string als er geen is.",
          },
        },
        required: [
          "label",
          "phase",
          "start",
          "end",
          "status",
          "nextMilestoneLabel",
          "nextMilestoneDate",
        ],
        additionalProperties: false,
      },
    },
    achievedHighlights: {
      type: "array",
      description:
        "Alleen recent BEHAALDE mijlpalen (max ± 3 maanden terug), kort, beginnend met de projectnaam. Maximaal 5. Leeg als er geen zijn.",
      items: { type: "string" },
    },
    upcomingHighlights: {
      type: "array",
      description:
        "Alleen mijlpalen die de KOMENDE ± 8 weken gehaald moeten worden, kort, beginnend met de projectnaam, inclusief datum. Maximaal 5.",
      items: { type: "string" },
    },
    progressHighlights: {
      type: "array",
      description:
        "Voortgang op de BELANGRIJKSTE projecten (grootste impact of grootste afwijking), kort. Maximaal 4.",
      items: { type: "string" },
    },
} as const;

export const PLANNING_REQUIRED_FIELDS = [
  "title",
  "period",
  "importKey",
  "projects",
  "achievedHighlights",
  "upcomingHighlights",
  "progressHighlights",
] as const;

const OUTPUT_SCHEMA = {
  type: "object",
  properties: PLANNING_SCHEMA_PROPS,
  required: PLANNING_REQUIRED_FIELDS,
  additionalProperties: false,
} as const;

/** Instructies voor het planningdeel (gedeeld met de VGR-import). */
export function planningPromptCore(today: string): string {
  return `Per (deel)project (maximaal 12, geen losse mijlpalen als aparte regels):
- phase: bepaal de HUIDIGE fase uit de mijlpaalnamen en welke daarvan al gepasseerd/afgevinkt zijn. Richtlijn: DO/UO-mijlpalen → 'Ontwerp'; contractvorming → 'Contractvorming'; start boren/koudwerk → 'Uitvoering'; opleveren → 'Oplevering'; alles afgerond → 'Gereed'; on hold → 'On hold'.
- start = de vroegste relevante mijlpaaldatum van het project.
- end = de opleverdatum of laatste uitvoeringsmijlpaal (bijv. 'Opleveren', 'Koudwerk gereed'). Negeer administratieve einddata die jaren later liggen (zoals IBN-data) als die het beeld vertekenen.
- status: 'groen' bij GEREED of op schema (geen of positieve afwijking t.o.v. baseline); 'oranje' bij duidelijke achterstand (tientallen dagen negatief); 'rood' bij ON HOLD of zeer grote achterstand (± half jaar of meer).
- nextMilestoneLabel/-Date: de EERSTVOLGENDE mijlpaal op of na vandaag (${today}). Kies de mijlpaal met de vroegste datum >= vandaag. Houd het label kort (max ± 4 woorden, zonder mijlpaalcodes).

Highlights — wees streng, alleen échte highlights:
- achievedHighlights: uitsluitend mijlpalen die recent daadwerkelijk zijn behaald (bijv. gemarkeerd als actueel/gereed, of met datum kort vóór vandaag).
- upcomingHighlights: uitsluitend mijlpalen die de komende ± 8 weken gehaald moeten worden, mét datum (bijv. 'Urk Noord: koudwerk gereed — 20 nov').
- progressHighlights: voortgang op de belangrijkste projecten: grote verschuivingen, projecten on hold, gestarte uitvoering. GEEN opsomming van elk project; alleen wat er echt toe doet.
- Elke highlight: kort (max ± 12 woorden), leesbaar op een groot scherm, beginnend met de projectnaam.

Datums in het document kunnen als DD-MM-YY genoteerd zijn; converteer naar ISO (YYYY-MM-DD). Schrijf alles in het Nederlands. De importKey moet stabiel zijn over uploads heen: baseer hem alleen op de documentsoort/projectnaam, nooit op datums, periodes of versienummers.`;
}

function buildPrompt(today: string): string {
  return `Je krijgt een projectplanning (bijv. een mijlpalenplanning) als PDF. Analyseer die grondig en maak er een hoogover weergave van voor een narrowcastingscherm op de afdeling. Vandaag is ${today}.

${planningPromptCore(today)}`;
}

export async function extractPlanningFromPdf(
  pdfBase64: string
): Promise<ExtractedPlanning> {
  const client = new Anthropic();
  const today = new Date().toISOString().slice(0, 10);

  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    output_config: {
      format: {
        type: "json_schema",
        schema: OUTPUT_SCHEMA,
      },
    },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: pdfBase64,
            },
          },
          { type: "text", text: buildPrompt(today) },
        ],
      },
    ],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("De AI kon dit document niet verwerken.");
  }
  if (response.stop_reason === "max_tokens") {
    throw new Error("Het document is te groot om te verwerken.");
  }

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Geen resultaat ontvangen van de AI.");
  }

  const parsed = extractedPlanningSchema.safeParse(JSON.parse(textBlock.text));
  if (!parsed.success) {
    throw new Error(
      `Het AI-resultaat had een onverwachte vorm: ${parsed.error.issues[0]?.message}`
    );
  }

  // Einddatum vóór startdatum kan de AI niet garanderen; corrigeer defensief
  const projects = parsed.data.projects.map((project) =>
    project.end < project.start ? { ...project, end: project.start } : project
  );

  return { ...parsed.data, projects };
}
