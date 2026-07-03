# Narrowcasting

Cloudgebaseerde narrowcastingapplicatie voor intern gebruik op een afdeling. Bestaat uit een **beheeromgeving** (dashboard, content, playlists, schermen, huisstijl) en een **full-screen player** voor een groot scherm.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- PostgreSQL via [Neon](https://neon.tech)
- Prisma ORM
- [Clerk](https://clerk.com) voor authenticatie
- Vercel Blob voor afbeeldingen
- Deploybaar op Vercel

## Installatie (lokaal)

### 1. Dependencies

```bash
npm install
```

### 2. Omgevingsvariabelen

```bash
cp .env.example .env
```

Vul daarna in `.env` in:

| Variabele | Waar te vinden |
|---|---|
| `DATABASE_URL` | Neon dashboard → project → *Connection string* (pooled) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk dashboard → *API Keys* |
| `CLERK_SECRET_KEY` | Clerk dashboard → *API Keys* |
| `BLOB_READ_WRITE_TOKEN` | Vercel dashboard → *Storage* → Blob store → *.env.local* tab |
| `ANTHROPIC_API_KEY` | [platform.claude.com](https://platform.claude.com) → API keys |

> Zonder `BLOB_READ_WRITE_TOKEN` werkt alles behalve het uploaden van afbeeldingen/logo's. Zonder `ANTHROPIC_API_KEY` werkt alles behalve "Planning importeren (AI)".

### 3. Database

```bash
npm run db:migrate   # voert de migraties uit (prisma migrate deploy)
npm run db:seed      # seed: organisatie, scherm, playlist en 5 voorbeeldberichten
```

### 4. Starten

```bash
npm run dev
```

- Beheer: <http://localhost:3000> → inloggen via Clerk. **De eerste gebruiker die inlogt wordt automatisch admin.**
- Player (seed-scherm): <http://localhost:3000/player/hvp-hal-1-x7k2m9>

## Structuur

| Route | Doel |
|---|---|
| `/dashboard` | Overzicht: actieve/geplande berichten, schermen online, live preview |
| `/content` | Berichten beheren (6 types, filters, publiceren, archiveren, preview) |
| `/playlists` | Playlists: volgorde, duur per item, koppeling aan scherm, standaardplaylist |
| `/screens` | Schermen: slug, locatie, activeren, online-status, laatste heartbeat |
| `/branding` | Huisstijl: naam, logo, kleuren (alleen admin) |
| `/settings` | Gebruikers en rollen (admin/editor/viewer) |
| `/player/[slug]` | Full-screen player (publiek via moeilijk te raden slug) |

### API-routes

| Route | Methode | Auth | Doel |
|---|---|---|---|
| `/api/player/[slug]` | GET | publiek (slug) | Read-only playerdata (playlist + huisstijl) |
| `/api/heartbeat` | POST | publiek (slug) | Heartbeat van de player, bijhouden online-status |
| `/api/upload` | POST | Clerk (editor+) | Afbeelding/logo upload naar Vercel Blob |
| `/api/import-planning` | POST | Clerk (editor+) | AI-import: PDF-planning → Gantt- en highlights-slide |

Alle beheeracties (content, playlists, schermen, huisstijl) lopen via server actions met Clerk-authenticatie en Zod-validatie.

## VGR importeren met AI

Via **VGR-import** in het menu upload je de maandelijkse voortgangsrapportage (PDF). Je definieert zelf **onderwerpen** (titel + instructie voor de AI, bijv. "Veiligheid: toon de meldingen en sluit af met een leerpunt"). Per upload maakt Claude:

- per actief onderwerp één slide — als kernpuntenlijst of als KPI-kaarten, afhankelijk van de inhoud;
- de hoogover **Gantt-planning** en **highlights** uit het planninghoofdstuk (zelfde slides als de losse planningimport).

De inhoud wordt geschikt gemaakt voor een breed publiek: korte zinnen, geen jargon of afkortingen (VTW/ZRO/KLIC worden omschreven), geen financiële bedragen, persoonsnamen alleen bij in-/uitdiensttredingen. Alle slides worden per onderwerp bijgewerkt bij een volgende upload (via `importKey` in de metadata), dus maandelijks opnieuw uploaden volstaat.

## Planning importeren met AI

Via **Content → Planning importeren (AI)** upload je een planning-PDF (bijv. een mijlpalenplanning). Claude (Opus 4.8) extraheert:

- een **hoogover Gantt-planning**: één balk per (deel)project met start, einde en stoplichtstatus (op basis van GEREED/ACTUEEL/ON HOLD en afwijking t.o.v. baseline);
- de **highlights**: de belangrijkste status-opmerkingen als aparte slide.

Beide worden als planning-content aangemaakt en (bij de eerste import) aan de standaardplaylist toegevoegd. Elk item krijgt een stabiele `importKey` in de metadata: **upload je periodiek een nieuwe versie van hetzelfde document, dan worden de bestaande slides bijgewerkt** in plaats van gedupliceerd. Handmatig bijstellen kan daarna gewoon via het planningformulier.

## Player

De player draait op een mini-pc of signage-speler in een browser in kioskmodus, bijv.:

```bash
chromium --kiosk --noerrdialogs --disable-session-crashed-bubble https://<jouw-domein>/player/<slug>
```

Gedrag:

- Haalt elke 60 seconden de actuele playlist op en stuurt elke 60 seconden een heartbeat.
- Toont alleen gepubliceerde content binnen de publicatieperiode, in playlistvolgorde, elk item volgens de ingestelde duur, in een oneindige loop.
- Bewaart de laatst opgehaalde playlist in `localStorage`; valt daar op terug als de API onbereikbaar is (met subtiele offline-indicator).
- Herlaadt zichzelf elke nacht om 03:00.
- Gebruikt de huisstijl (logo en kleuren) uit de beheeromgeving; layout is geschikt voor 16:9 (1080p en 4K).

## Beveiliging

- De hele beheeromgeving vereist login via Clerk (middleware in `proxy.ts`).
- Rollen: **admin** (alles incl. huisstijl en rollen), **editor** (content/playlists/schermen), **viewer** (alleen lezen).
- De player-API is read-only en alleen bereikbaar via de moeilijk te raden scherm-slug (minimaal 8 tekens, generator in de UI). Een scherm heeft geen beheerrechten.

## Deployment op Vercel

1. Push het project naar een Git-repository en importeer het in Vercel.
2. Voeg een **Neon Postgres**-database toe (of Vercel Postgres) en zet `DATABASE_URL` bij de environment variables.
3. Voeg een **Blob store** toe (Storage → Blob); `BLOB_READ_WRITE_TOKEN` wordt automatisch gezet.
4. Zet de Clerk-keys (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`) en gebruik in productie de *production instance* van Clerk.
5. Voer eenmalig de migraties + seed uit vanaf je eigen machine tegen de productiedatabase:
   ```bash
   DATABASE_URL="<neon-url>" npm run db:migrate
   DATABASE_URL="<neon-url>" npm run db:seed   # optioneel
   ```
   (Of zet het build command op `prisma migrate deploy && next build`.)

## Handige scripts

| Script | Doel |
|---|---|
| `npm run dev` | Lokale ontwikkelserver |
| `npm run build` | Productiebuild |
| `npm run db:migrate` | Migraties uitvoeren (`prisma migrate deploy`) |
| `npm run db:push` | Schema direct pushen (alleen voor snel prototypen) |
| `npm run db:seed` | Voorbeelddata laden |
| `npm run db:studio` | Prisma Studio (database-GUI) |

## Datamodel

`Organization` (huisstijl) → `User` (rol), `Screen` (slug, heartbeat), `Playlist` (koppeling scherm, standaard), `ContentItem` (6 types met status, prioriteit, publicatieperiode, duur; typespecifieke velden in `metadata` JSON), `PlaylistItem` (volgorde, duur-override), `ScreenHeartbeat` (historie, 7 dagen bewaard).
