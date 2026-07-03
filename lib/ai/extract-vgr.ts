import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import {
  PLANNING_SCHEMA_PROPS,
  PLANNING_REQUIRED_FIELDS,
  planningPromptCore,
  planningZodShape,
} from "@/lib/ai/extract-planning";

/**
 * Verwerkt een maandelijkse voortgangsrapportage (VGR): haalt het
 * planningdeel eruit (zelfde vorm als de losse planningimport) én maakt per
 * door de gebruiker gedefinieerd onderwerp een slide, geschikt voor een
 * breed publiek op een narrowcastingscherm.
 */

export type VgrTopicInput = {
  id: string;
  title: string;
  instructions: string | null;
};

const topicSlideSchema = z.object({
  topicId: z.string(),
  title: z.string().trim().min(1).max(120),
  subtitle: z
    .string()
    .trim()
    .max(120)
    .transform((v) => (v ? v : undefined)),
  kind: z.enum(["bullets", "kpi"]),
  bullets: z.array(z.string().trim().min(1).max(200)).max(6),
  kpis: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(80),
        value: z.string().trim().min(1).max(30),
        status: z.enum(["groen", "oranje", "rood"]),
      })
    )
    .max(8),
});

export const extractedVgrSchema = z.object({
  ...planningZodShape,
  topicSlides: z.array(topicSlideSchema).max(12),
});

export type ExtractedVgr = z.infer<typeof extractedVgrSchema>;
export type VgrTopicSlide = z.infer<typeof topicSlideSchema>;

const VGR_OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    ...PLANNING_SCHEMA_PROPS,
    topicSlides: {
      type: "array",
      description:
        "Eén slide per opgegeven onderwerp, in dezelfde volgorde als de onderwerpen.",
      items: {
        type: "object",
        properties: {
          topicId: {
            type: "string",
            description: "Het id van het onderwerp, exact zoals opgegeven.",
          },
          title: {
            type: "string",
            description:
              "Titel van de slide. Kort en aansprekend, mag afwijken van de onderwerpsnaam.",
          },
          subtitle: {
            type: "string",
            description:
              "Korte ondertitel of context, bijv. de rapportagemaand. Lege string als niet nodig.",
          },
          kind: {
            type: "string",
            enum: ["bullets", "kpi"],
            description:
              "'kpi' als het onderwerp vooral cijfers/percentages bevat (dan kpis vullen), anders 'bullets'.",
          },
          bullets: {
            type: "array",
            description:
              "3 tot 6 korte kernpunten (max ± 14 woorden per punt). Leeg bij kind='kpi'.",
            items: { type: "string" },
          },
          kpis: {
            type: "array",
            description:
              "Maximaal 8 cijferkaarten met label, waarde (bijv. '82%' of '12 km') en status. Leeg bij kind='bullets'.",
            items: {
              type: "object",
              properties: {
                label: { type: "string" },
                value: { type: "string" },
                status: { type: "string", enum: ["groen", "oranje", "rood"] },
              },
              required: ["label", "value", "status"],
              additionalProperties: false,
            },
          },
        },
        required: ["topicId", "title", "subtitle", "kind", "bullets", "kpis"],
        additionalProperties: false,
      },
    },
  },
  required: [...PLANNING_REQUIRED_FIELDS, "topicSlides"],
  additionalProperties: false,
} as const;

function buildVgrPrompt(today: string, topics: VgrTopicInput[]): string {
  const topicList = topics
    .map(
      (topic, index) =>
        `${index + 1}. topicId="${topic.id}" — "${topic.title}"${
          topic.instructions ? ` — instructie: ${topic.instructions}` : ""
        }`
    )
    .join("\n");

  return `Je krijgt de maandelijkse voortgangsrapportage (VGR) van een infraproject als PDF. Vandaag is ${today}. Maak hieruit content voor een narrowcastingscherm op de afdeling.

BELANGRIJK — het scherm hangt in een openbare ruimte en wordt door een breed publiek gelezen (uitvoerders, kantoor, bezoekers). Daarom:
- Korte, heldere zinnen. Geen jargon of afkortingen zonder uitleg (schrijf niet "VTW", "ZRO", "TSB", "GEU" — omschrijf in gewone taal of laat weg).
- GEEN gevoelige financiële details: geen bedragen, budgetoverschrijdingen, voorfinanciering of contractdiscussies.
- Persoonsnamen alleen bij in- en uitdiensttredingen (naam + rol); verder geen namen van personen.
- Neutraal tot positief geformuleerd; problemen mogen benoemd worden, maar zakelijk en zonder schuldigen aan te wijzen.

DEEL 1 — Planning. Het document bevat een mijlpalenplanning (hoofdstuk Planning). Verwerk die als volgt:
${planningPromptCore(today)}

DEEL 2 — Onderwerpslides. De beheerder heeft de volgende onderwerpen gedefinieerd. Maak per onderwerp precies één slide (topicSlides, zelfde volgorde), gebaseerd op de inhoud van de VGR en de instructie per onderwerp:
${topicList}

Regels voor de onderwerpslides:
- Kies kind='kpi' als het onderwerp vooral uit cijfers bestaat (percentages, aantallen); geef dan maximaal 8 kpi-kaarten met korte labels. Kies anders kind='bullets' met 3–6 kernpunten.
- Status bij kpi's: groen = op schema/goed, oranje = aandacht, rood = actie vereist/achterstand.
- Gebruik alleen informatie die daadwerkelijk in de VGR staat. Als de VGR voor een onderwerp weinig bevat, maak dan een kortere slide (minimaal 2 punten) in plaats van te verzinnen.
- subtitle: gebruik waar mogelijk de rapportageperiode (bijv. "VGR mei 2026").

Schrijf alles in het Nederlands.`;
}

export async function extractVgrFromPdf(
  pdfBase64: string,
  topics: VgrTopicInput[]
): Promise<ExtractedVgr> {
  const client = new Anthropic();
  const today = new Date().toISOString().slice(0, 10);

  // Streaming voorkomt HTTP-timeouts bij lange verwerkingstijd
  const stream = client.messages.stream({
    model: "claude-opus-4-8",
    max_tokens: 32000,
    thinking: { type: "adaptive" },
    output_config: {
      format: {
        type: "json_schema",
        schema: VGR_OUTPUT_SCHEMA,
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
          { type: "text", text: buildVgrPrompt(today, topics) },
        ],
      },
    ],
  });
  const response = await stream.finalMessage();

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

  const parsed = extractedVgrSchema.safeParse(JSON.parse(textBlock.text));
  if (!parsed.success) {
    throw new Error(
      `Het AI-resultaat had een onverwachte vorm: ${parsed.error.issues[0]?.message}`
    );
  }

  // Defensieve correcties
  const projects = parsed.data.projects.map((project) =>
    project.end < project.start ? { ...project, end: project.start } : project
  );
  const knownTopicIds = new Set(topics.map((topic) => topic.id));
  const topicSlides = parsed.data.topicSlides.filter((slide) =>
    knownTopicIds.has(slide.topicId)
  );

  return { ...parsed.data, projects, topicSlides };
}
