import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.upsert({
    where: { id: "seed-org" },
    update: {},
    create: {
      id: "seed-org",
      name: "Afdeling Hoogvliet",
      primaryColor: "#1e3a8a",
      secondaryColor: "#3b82f6",
      backgroundColor: "#0f172a",
      textColor: "#f8fafc",
    },
  });

  const screen = await prisma.screen.upsert({
    where: { slug: "hvp-hal-1-x7k2m9" },
    update: {},
    create: {
      name: "Scherm hal 1",
      slug: "hvp-hal-1-x7k2m9",
      location: "Kantine, hal 1",
      organizationId: org.id,
      isActive: true,
    },
  });

  const playlist = await prisma.playlist.upsert({
    where: { id: "seed-playlist" },
    update: {},
    create: {
      id: "seed-playlist",
      name: "Standaard playlist",
      organizationId: org.id,
      screenId: screen.id,
      isDefault: true,
    },
  });

  const now = new Date();
  const inThirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const addDays = (days: number) =>
    new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

  const items = [
    {
      id: "seed-content-1",
      title: "Welkom bij het nieuwe informatiescherm",
      subtitle: "Vanaf vandaag zie je hier al het afdelingsnieuws",
      body: "Op dit scherm vind je voortaan nieuws, projectupdates, planningen en veiligheidsinformatie. Heb je zelf een bericht voor het scherm? Meld het bij je teamleider.",
      type: "news" as const,
      priority: "normal" as const,
      durationSeconds: 15,
    },
    {
      id: "seed-content-2",
      title: "Project Lijn 3 modernisering",
      subtitle: "Projectupdate",
      body: "De ombouw van lijn 3 ligt op schema.",
      type: "project_update" as const,
      priority: "normal" as const,
      durationSeconds: 15,
      metadata: {
        projectStatus: "groen",
        milestone: "Installatie nieuwe besturing gereed op 15 juli",
        attentionPoint: "Levertijd onderdelen aandrijving in de gaten houden",
        owner: "Jan de Vries",
      },
    },
    {
      id: "seed-content-3",
      title: "Bijna-aanrijding heftruck",
      subtitle: "Incidentmelding",
      body: "Bij de expeditie is een medewerker bijna aangereden door een heftruck bij het oversteken van het pad.",
      type: "incident" as const,
      priority: "high" as const,
      durationSeconds: 20,
      metadata: {
        incidentDate: now.toISOString().slice(0, 10),
        lesson: "Kijk altijd twee kanten op bij het oversteken van rijpaden.",
        measure: "Extra spiegels geplaatst op kruispunt expeditie. Looppad opnieuw gemarkeerd.",
      },
    },
    {
      id: "seed-content-4",
      title: "Planning week 28",
      subtitle: "Weekplanning",
      type: "planning" as const,
      priority: "normal" as const,
      durationSeconds: 20,
      metadata: {
        period: "Week 28",
        activities: [
          "Maandag: onderhoud lijn 2 (ochtend)",
          "Dinsdag: audit kwaliteitsteam",
          "Woensdag: toolboxmeeting veiligheid, 09:00",
          "Donderdag: leverancier op bezoek, hal 2",
          "Vrijdag: opruimen en 5S-ronde",
        ],
      },
    },
    {
      id: "seed-content-5",
      title: "Productie-KPI's deze week",
      subtitle: "Stand van zaken",
      type: "kpi" as const,
      priority: "normal" as const,
      durationSeconds: 15,
      metadata: {
        kpis: [
          { label: "OEE lijn 1", value: "82%", status: "groen" },
          { label: "OEE lijn 2", value: "74%", status: "oranje" },
          { label: "Dagen zonder incident", value: "37", status: "groen" },
          { label: "Leverbetrouwbaarheid", value: "96%", status: "groen" },
        ],
      },
    },
    {
      id: "seed-content-6",
      title: "Projectplanning onderhoud",
      subtitle: "Planning",
      type: "planning" as const,
      priority: "normal" as const,
      durationSeconds: 20,
      metadata: {
        period: "Juli",
        planningView: "gantt",
        tasks: [
          {
            label: "Voorbereiding & inkoop",
            start: addDays(-7),
            end: addDays(-1),
            status: "groen",
            phase: "Gereed",
          },
          {
            label: "Ombouw lijn 3",
            start: addDays(-2),
            end: addDays(6),
            status: "oranje",
            phase: "Uitvoering",
            milestoneLabel: "Besturing gereed",
            milestoneDate: addDays(4),
          },
          {
            label: "Testdraaien",
            start: addDays(5),
            end: addDays(9),
            status: "groen",
            phase: "Test",
            milestoneLabel: "Testrapport",
            milestoneDate: addDays(9),
          },
          {
            label: "Oplevering & overdracht",
            start: addDays(10),
            end: addDays(12),
            status: "rood",
            phase: "Oplevering",
            milestoneLabel: "Overdracht",
            milestoneDate: addDays(12),
          },
        ],
      },
    },
  ];

  for (const [index, item] of items.entries()) {
    const content = await prisma.contentItem.upsert({
      where: { id: item.id },
      update: {},
      create: {
        ...item,
        organizationId: org.id,
        status: "published",
        startDate: now,
        endDate: inThirtyDays,
        isActive: true,
      },
    });

    await prisma.playlistItem.upsert({
      where: { id: `seed-pli-${index}` },
      update: {},
      create: {
        id: `seed-pli-${index}`,
        playlistId: playlist.id,
        contentItemId: content.id,
        sortOrder: index,
      },
    });
  }

  // Standaard VGR-onderwerpen (alleen aanmaken als er nog geen zijn)
  const topicCount = await prisma.vgrTopic.count({
    where: { organizationId: org.id },
  });
  if (topicCount === 0) {
    await prisma.vgrTopic.createMany({
      data: [
        {
          organizationId: org.id,
          title: "Voortgang uitvoering",
          instructions:
            "Vat de voortgang van de realisatie samen: kabel trekken, boringen en stations. Gebruik percentages per deelproject waar beschikbaar.",
          sortOrder: 0,
        },
        {
          organizationId: org.id,
          title: "Veiligheid",
          instructions:
            "Toon de veiligheidsmeldingen van deze maand en positieve veiligheidsacties. Sluit af met een leerpunt.",
          sortOrder: 1,
        },
        {
          organizationId: org.id,
          title: "Personeel",
          instructions:
            "Verwelkom nieuwe collega's met naam en rol, noem vertrekkende collega's kort en vermeld openstaande vacatures.",
          sortOrder: 2,
        },
        {
          organizationId: org.id,
          title: "Samenwerking & mijlpalen",
          instructions:
            "De belangrijkste ontwikkelingen in de samenwerking en behaalde successen van deze maand, positief geformuleerd.",
          sortOrder: 3,
        },
      ],
    });
  }

  console.log("Seed voltooid:");
  console.log(`  Organisatie: ${org.name}`);
  console.log(`  Scherm:      /player/${screen.slug}`);
  console.log(`  Playlist:    ${playlist.name} (5 items)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
