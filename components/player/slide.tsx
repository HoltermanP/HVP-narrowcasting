import type {
  ContentMetadata,
  GanttTask,
  HighlightGroups,
  KpiRow,
  TrafficLight,
} from "@/lib/content";
import type { PlayerBranding, PlayerContentItem } from "@/lib/player-types";
import { darken, lighten, withAlpha } from "@/lib/color";

const TRAFFIC_COLORS: Record<TrafficLight, string> = {
  groen: "#22c55e",
  oranje: "#f59e0b",
  rood: "#ef4444",
};

const TRAFFIC_LABELS: Record<TrafficLight, string> = {
  groen: "Op schema",
  oranje: "Aandacht nodig",
  rood: "Actie vereist",
};

/** Gedeelde kaartstijl: subtiele gradiënt, rand en schaduw voor diepte. */
function cardStyle(branding: PlayerBranding): React.CSSProperties {
  return {
    background: `linear-gradient(180deg, ${withAlpha(branding.textColor, "1a")} 0%, ${withAlpha(branding.textColor, "0c")} 100%)`,
    border: `1px solid ${withAlpha(branding.textColor, "21")}`,
    boxShadow: "0 0.5cqw 2cqw rgba(0, 0, 0, 0.18)",
  };
}

/** Achtergrond met rustige diepte: schuine gradiënt + gloed in de accentkleur. */
function slideBackground(branding: PlayerBranding): string {
  return [
    `radial-gradient(95cqw 70cqh at 88% -12%, ${withAlpha(branding.secondaryColor, "26")} 0%, transparent 58%)`,
    `radial-gradient(70cqw 55cqh at -8% 110%, ${withAlpha(branding.primaryColor, "30")} 0%, transparent 55%)`,
    `linear-gradient(155deg, ${lighten(branding.backgroundColor, 0.06)} 0%, ${branding.backgroundColor} 45%, ${darken(branding.backgroundColor, 0.14)} 100%)`,
  ].join(", ");
}

/**
 * Rendert één slide. De wrapper is een CSS-container; alle maten staan in
 * cqw-eenheden zodat de slide identiek schaalt op 1080p, 4K en in de preview.
 */
export function Slide({
  item,
  branding,
}: {
  item: PlayerContentItem;
  branding: PlayerBranding;
}) {
  return (
    <div
      className="h-full w-full overflow-hidden"
      style={{
        containerType: "size",
        backgroundColor: branding.backgroundColor,
        background: slideBackground(branding),
        color: branding.textColor,
      }}
    >
      <SlideBody item={item} branding={branding} />
    </div>
  );
}

function SlideBody({
  item,
  branding,
}: {
  item: PlayerContentItem;
  branding: PlayerBranding;
}) {
  const metadata = (item.metadata ?? {}) as ContentMetadata;

  switch (item.type) {
    case "news":
      return <NewsSlide item={item} branding={branding} />;
    case "announcement":
      return <AnnouncementSlide item={item} branding={branding} />;
    case "project_update":
      return (
        <ProjectUpdateSlide item={item} branding={branding} metadata={metadata} />
      );
    case "incident":
      return <IncidentSlide item={item} metadata={metadata} />;
    case "planning":
      return (
        <PlanningSlide item={item} branding={branding} metadata={metadata} />
      );
    case "kpi":
      return <KpiSlide item={item} branding={branding} metadata={metadata} />;
  }
}

function NewsSlide({
  item,
  branding,
}: {
  item: PlayerContentItem;
  branding: PlayerBranding;
}) {
  const hasImage = Boolean(item.imageUrl);
  const bullets = (item.metadata ?? {}).bullets ?? [];
  return (
    <div className="flex h-full w-full" style={{ padding: "5cqw" }}>
      <div
        className="flex min-w-0 flex-1 flex-col justify-center"
        style={{ gap: "2cqw", paddingRight: hasImage ? "4cqw" : 0 }}
      >
        <div
          style={{
            width: "6cqw",
            height: "0.5cqw",
            backgroundColor: branding.secondaryColor,
            borderRadius: "1cqw",
          }}
        />
        <h1
          className="font-bold leading-tight"
          style={{ fontSize: bullets.length > 0 ? "3.8cqw" : "4.6cqw" }}
        >
          {item.title}
        </h1>
        {item.subtitle && (
          <p
            className="leading-snug"
            style={{ fontSize: "2.2cqw", color: branding.secondaryColor }}
          >
            {item.subtitle}
          </p>
        )}
        {bullets.length > 0 ? (
          <div className="flex flex-col" style={{ gap: "1.4cqw" }}>
            {bullets.map((bullet, index) => (
              <div
                key={index}
                className="flex items-start"
                style={{ gap: "1.2cqw" }}
              >
                <span
                  className="shrink-0 rounded-full"
                  style={{
                    width: "0.9cqw",
                    height: "0.9cqw",
                    marginTop: "0.85cqw",
                    backgroundColor: branding.secondaryColor,
                  }}
                />
                <span
                  className="leading-snug opacity-95"
                  style={{ fontSize: "2.1cqw" }}
                >
                  {bullet}
                </span>
              </div>
            ))}
          </div>
        ) : (
          item.body && (
            <p
              className="leading-relaxed opacity-90"
              style={{ fontSize: "2.1cqw" }}
            >
              {item.body}
            </p>
          )
        )}
      </div>
      {hasImage && (
        <div className="flex w-2/5 shrink-0 items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.imageUrl!}
            alt=""
            className="h-auto max-h-full w-full object-cover"
            style={{ borderRadius: "1.2cqw" }}
          />
        </div>
      )}
    </div>
  );
}

function AnnouncementSlide({
  item,
  branding,
}: {
  item: PlayerContentItem;
  branding: PlayerBranding;
}) {
  const urgent = item.priority === "urgent" || item.priority === "high";
  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center text-center"
      style={{ padding: "6cqw", gap: "2.5cqw" }}
    >
      {urgent && (
        <div
          className="font-semibold uppercase tracking-widest"
          style={{
            fontSize: "1.6cqw",
            color: "#fff",
            backgroundColor: item.priority === "urgent" ? "#ef4444" : "#f59e0b",
            padding: "0.6cqw 2cqw",
            borderRadius: "2cqw",
          }}
        >
          {item.priority === "urgent" ? "Urgent" : "Belangrijk"}
        </div>
      )}
      <h1 className="font-bold leading-tight" style={{ fontSize: "6cqw" }}>
        {item.title}
      </h1>
      {item.subtitle && (
        <p style={{ fontSize: "2.4cqw", color: branding.secondaryColor }}>
          {item.subtitle}
        </p>
      )}
      {item.body && (
        <p
          className="leading-relaxed opacity-90"
          style={{ fontSize: "2.6cqw", maxWidth: "70cqw" }}
        >
          {item.body}
        </p>
      )}
      {item.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.imageUrl}
          alt=""
          className="object-contain"
          style={{ maxHeight: "30cqh", borderRadius: "1.2cqw" }}
        />
      )}
    </div>
  );
}

function ProjectUpdateSlide({
  item,
  branding,
  metadata,
}: {
  item: PlayerContentItem;
  branding: PlayerBranding;
  metadata: ContentMetadata;
}) {
  const status = metadata.projectStatus ?? "groen";
  const statusColor = TRAFFIC_COLORS[status];

  return (
    <div
      className="flex h-full w-full flex-col justify-center"
      style={{ padding: "5cqw", gap: "2.5cqw" }}
    >
      <div className="flex items-center" style={{ gap: "2cqw" }}>
        <span
          className="rounded-full"
          style={{
            width: "2.2cqw",
            height: "2.2cqw",
            backgroundColor: statusColor,
            boxShadow: `0 0 2cqw ${statusColor}`,
          }}
        />
        <span
          className="font-semibold uppercase tracking-wider"
          style={{ fontSize: "1.8cqw", color: statusColor }}
        >
          {TRAFFIC_LABELS[status]}
        </span>
      </div>
      <h1 className="font-bold leading-tight" style={{ fontSize: "4.4cqw" }}>
        {item.title}
      </h1>
      {item.body && (
        <p className="opacity-90" style={{ fontSize: "2cqw" }}>
          {item.body}
        </p>
      )}
      <div className="grid grid-cols-2" style={{ gap: "2cqw" }}>
        {metadata.milestone && (
          <InfoCard
            label="Mijlpaal"
            text={metadata.milestone}
            accent={branding.secondaryColor}
          />
        )}
        {metadata.attentionPoint && (
          <InfoCard
            label="Aandachtspunt"
            text={metadata.attentionPoint}
            accent="#f59e0b"
          />
        )}
      </div>
      {metadata.owner && (
        <p className="opacity-70" style={{ fontSize: "1.7cqw" }}>
          Eigenaar: {metadata.owner}
        </p>
      )}
    </div>
  );
}

function IncidentSlide({
  item,
  metadata,
}: {
  item: PlayerContentItem;
  metadata: ContentMetadata;
}) {
  const incidentDate = metadata.incidentDate
    ? new Intl.DateTimeFormat("nl-NL", { dateStyle: "long" }).format(
        new Date(metadata.incidentDate)
      )
    : null;

  return (
    <div
      className="flex h-full w-full flex-col"
      style={{
        background:
          "radial-gradient(80cqw 60cqh at 90% -10%, rgba(255,120,80,0.14) 0%, transparent 55%), linear-gradient(155deg, #55110f 0%, #450a0a 50%, #310607 100%)",
        color: "#fef2f2",
      }}
    >
      <div
        className="flex items-center font-bold uppercase tracking-wider"
        style={{
          background: "linear-gradient(90deg, #ef4444 0%, #b91c1c 100%)",
          color: "#fff",
          padding: "1.2cqw 5cqw",
          gap: "1.5cqw",
          fontSize: "2cqw",
          boxShadow: "0 0.4cqw 1.6cqw rgba(0,0,0,0.3)",
        }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          style={{ width: "2.6cqw", height: "2.6cqw" }}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
          />
        </svg>
        Incidentmelding
        {incidentDate && (
          <span className="ml-auto font-medium normal-case opacity-90">
            {incidentDate}
          </span>
        )}
      </div>
      <div
        className="flex flex-1 flex-col justify-center"
        style={{ padding: "4cqw 5cqw", gap: "2cqw" }}
      >
        <h1 className="font-bold leading-tight" style={{ fontSize: "4cqw" }}>
          {item.title}
        </h1>
        {item.body && (
          <p className="leading-relaxed opacity-95" style={{ fontSize: "2.1cqw" }}>
            {item.body}
          </p>
        )}
        <div className="grid grid-cols-2" style={{ gap: "2cqw" }}>
          {metadata.lesson && (
            <InfoCard
              label="Leerpunt"
              text={metadata.lesson}
              accent="#fbbf24"
              dark
            />
          )}
          {metadata.measure && (
            <InfoCard
              label="Maatregel"
              text={metadata.measure}
              accent="#4ade80"
              dark
            />
          )}
        </div>
      </div>
    </div>
  );
}

function PlanningSlide({
  item,
  branding,
  metadata,
}: {
  item: PlayerContentItem;
  branding: PlayerBranding;
  metadata: ContentMetadata;
}) {
  const ganttTasks = (metadata.tasks ?? []).filter(
    (task) => task.label && task.start && task.end
  );
  if (metadata.planningView === "gantt" && ganttTasks.length > 0) {
    return <GanttSlide item={item} branding={branding} metadata={metadata} tasks={ganttTasks} />;
  }

  const groups = metadata.highlightGroups;
  if (
    groups &&
    (groups.achieved.length > 0 ||
      groups.upcoming.length > 0 ||
      groups.progress.length > 0)
  ) {
    return <HighlightsSlide item={item} branding={branding} groups={groups} />;
  }

  const activities = metadata.activities ?? [];
  const twoColumns = activities.length > 6;

  return (
    <div
      className="flex h-full w-full flex-col"
      style={{ padding: "5cqw", gap: "2.5cqw" }}
    >
      <div className="flex items-baseline" style={{ gap: "2cqw" }}>
        <h1 className="font-bold leading-tight" style={{ fontSize: "4cqw" }}>
          {item.title}
        </h1>
        {metadata.period && (
          <span
            className="font-semibold"
            style={{
              fontSize: "2.2cqw",
              color: branding.backgroundColor,
              backgroundColor: branding.secondaryColor,
              padding: "0.3cqw 1.5cqw",
              borderRadius: "0.8cqw",
            }}
          >
            {metadata.period}
          </span>
        )}
      </div>
      <div
        className={twoColumns ? "grid flex-1 grid-cols-2" : "flex flex-1 flex-col"}
        style={{ gap: "1.4cqw", alignContent: "start" }}
      >
        {activities.map((activity, index) => (
          <div
            key={index}
            className="flex items-center"
            style={{
              gap: "1.5cqw",
              ...cardStyle(branding),
              borderLeft: `0.5cqw solid ${branding.secondaryColor}`,
              padding: "1cqw 1.8cqw",
              borderRadius: "0.8cqw",
              fontSize: "1.9cqw",
            }}
          >
            {activity}
          </div>
        ))}
        {activities.length === 0 && item.body && (
          <p style={{ fontSize: "2.2cqw" }}>{item.body}</p>
        )}
      </div>
    </div>
  );
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Parseert "YYYY-MM-DD" naar UTC-middernacht, zodat alle posities consistent zijn. */
function parseDay(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

type AxisTick = { position: number; label: string };

const SHORT_MONTHS = [
  "jan", "feb", "mrt", "apr", "mei", "jun",
  "jul", "aug", "sep", "okt", "nov", "dec",
];
const SHORT_DAYS = ["zo", "ma", "di", "wo", "do", "vr", "za"];

/**
 * Genereert maximaal ~7 maatstrepen op natuurlijke grenzen (dag, maandag,
 * 1e van de maand/kwartaal/halfjaar/jaar), zodat labels nooit overlappen.
 */
function buildAxisTicks(domainStart: number, domainEnd: number): AxisTick[] {
  const total = domainEnd - domainStart;
  const position = (t: number) => ((t - domainStart) / total) * 100;

  const dayTicks = (filter: (d: Date) => boolean, label: (d: Date) => string) => {
    const ticks: AxisTick[] = [];
    for (let t = domainStart; t < domainEnd; t += DAY_MS) {
      const date = new Date(t);
      if (filter(date)) ticks.push({ position: position(t), label: label(date) });
    }
    return ticks;
  };

  const monthTicks = (stepMonths: number) => {
    const ticks: AxisTick[] = [];
    const first = new Date(domainStart);
    let year = first.getUTCFullYear();
    let month = first.getUTCMonth();
    // eerstvolgende maandgrens die op de stap valt
    while (Date.UTC(year, month, 1) < domainStart || month % stepMonths !== 0) {
      month++;
      if (month > 11) {
        month = 0;
        year++;
      }
    }
    for (
      let t = Date.UTC(year, month, 1);
      t < domainEnd;
      month += stepMonths,
        year += Math.floor(month / 12),
        month %= 12,
        t = Date.UTC(year, month, 1)
    ) {
      ticks.push({
        position: position(t),
        label: `${SHORT_MONTHS[new Date(t).getUTCMonth()]} '${String(
          new Date(t).getUTCFullYear()
        ).slice(2)}`,
      });
    }
    return ticks;
  };

  const candidates: (() => AxisTick[])[] = [
    () => dayTicks(() => true, (d) => `${SHORT_DAYS[d.getUTCDay()]} ${d.getUTCDate()}`),
    () => dayTicks((d) => d.getUTCDay() === 1, (d) => `${d.getUTCDate()} ${SHORT_MONTHS[d.getUTCMonth()]}`),
    () => monthTicks(1),
    () => monthTicks(3),
    () => monthTicks(6),
    () => monthTicks(12),
  ];

  for (const candidate of candidates) {
    const ticks = candidate();
    if (ticks.length <= 7) return ticks;
  }
  return monthTicks(12);
}

const MILESTONE_DATE_FORMAT = (iso: string) => {
  const t = parseDay(iso);
  if (Number.isNaN(t)) return iso;
  const d = new Date(t);
  return `${d.getUTCDate()} ${SHORT_MONTHS[d.getUTCMonth()]} '${String(
    d.getUTCFullYear()
  ).slice(2)}`;
};

function GanttSlide({
  item,
  branding,
  metadata,
  tasks,
}: {
  item: PlayerContentItem;
  branding: PlayerBranding;
  metadata: ContentMetadata;
  tasks: GanttTask[];
}) {
  const starts = tasks.map((task) => parseDay(task.start));
  const ends = tasks.map((task) =>
    Math.max(parseDay(task.end), parseDay(task.start))
  );
  // Vaste tijdas (bij gesplitste delen) of afgeleid van de eigen taken.
  // Einddatum is inclusief: de balk loopt tot het einde van die dag.
  const domainStart = metadata.ganttDomain
    ? parseDay(metadata.ganttDomain.start)
    : Math.min(...starts);
  const domainEnd =
    (metadata.ganttDomain
      ? Math.max(parseDay(metadata.ganttDomain.end), ...ends)
      : Math.max(...ends)) + DAY_MS;
  const total = domainEnd - domainStart;
  const ticks = buildAxisTicks(domainStart, domainEnd);

  const now = new Date();
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const todayPosition =
    todayUtc >= domainStart && todayUtc < domainEnd
      ? ((todayUtc + DAY_MS / 2 - domainStart) / total) * 100
      : null;

  const hasMilestones = tasks.some((t) => t.milestoneLabel && t.milestoneDate);
  const gridColor = withAlpha(branding.textColor, "1a");
  const labelColumn = "17cqw";
  const milestoneColumn = hasMilestones ? "21cqw" : "0cqw";
  const compact = tasks.length > 8;
  const rowFont = compact ? "1.45cqw" : "1.7cqw";

  return (
    <div
      className="flex h-full w-full flex-col"
      style={{ padding: "3.5cqw 4cqw", gap: compact ? "1.2cqw" : "1.8cqw" }}
    >
      <div className="flex items-baseline justify-between">
        <div className="flex items-baseline" style={{ gap: "1.8cqw" }}>
          <h1 className="font-bold leading-tight" style={{ fontSize: "3.2cqw" }}>
            {item.title}
          </h1>
          {metadata.period && (
            <span
              className="font-semibold"
              style={{
                fontSize: "1.7cqw",
                color: branding.backgroundColor,
                backgroundColor: branding.secondaryColor,
                padding: "0.25cqw 1.3cqw",
                borderRadius: "0.7cqw",
              }}
            >
              {metadata.period}
            </span>
          )}
        </div>
        {item.subtitle && (
          <span style={{ fontSize: "1.5cqw", opacity: 0.65 }}>
            {item.subtitle}
          </span>
        )}
      </div>

      {/* Askop met datumlabels */}
      <div className="flex" style={{ gap: "1.2cqw" }}>
        <div style={{ width: labelColumn, flexShrink: 0 }} />
        <div className="relative flex-1" style={{ height: "1.9cqw" }}>
          {ticks.map((tick, i) => (
            <span
              key={i}
              className="absolute whitespace-nowrap"
              style={{
                left: `${tick.position}%`,
                fontSize: "1.25cqw",
                opacity: 0.6,
                transform: "translateX(0.5cqw)",
              }}
            >
              {tick.label}
            </span>
          ))}
        </div>
        {hasMilestones && (
          <div
            className="flex items-end font-semibold uppercase tracking-wider"
            style={{
              width: milestoneColumn,
              flexShrink: 0,
              fontSize: "1.15cqw",
              opacity: 0.6,
              paddingLeft: "1.2cqw",
            }}
          >
            Volgende mijlpaal
          </div>
        )}
      </div>

      {/* Rijen met tijdbalken */}
      <div
        className="flex min-h-0 flex-1 flex-col"
        style={{ gap: compact ? "0.7cqw" : "1cqw" }}
      >
        {tasks.map((task, index) => {
          const startPos = ((parseDay(task.start) - domainStart) / total) * 100;
          const endPos =
            ((Math.max(parseDay(task.end), parseDay(task.start)) +
              DAY_MS -
              domainStart) /
              total) *
            100;
          const barWidth = Math.max(endPos - startPos, 0.8);
          const barColor = TRAFFIC_COLORS[task.status ?? "groen"];
          const milestonePos =
            task.milestoneDate &&
            parseDay(task.milestoneDate) >= domainStart &&
            parseDay(task.milestoneDate) < domainEnd
              ? ((parseDay(task.milestoneDate) + DAY_MS / 2 - domainStart) /
                  total) *
                100
              : null;

          return (
            <div
              key={index}
              className="flex min-h-0 flex-1 items-center"
              style={{ gap: "1.2cqw", maxHeight: "6.5cqw" }}
            >
              <div
                className="flex flex-col justify-center text-right"
                style={{ width: labelColumn, flexShrink: 0 }}
              >
                <span
                  className="truncate font-semibold leading-tight"
                  style={{ fontSize: rowFont }}
                >
                  {task.label}
                </span>
              </div>

              <div className="relative h-full flex-1">
                {/* Gridlijnen */}
                {ticks.map((tick, i) => (
                  <span
                    key={i}
                    className="absolute inset-y-0"
                    style={{
                      left: `${tick.position}%`,
                      width: "1px",
                      backgroundColor: gridColor,
                    }}
                  />
                ))}
                {/* Vandaag-lijn */}
                {todayPosition !== null && (
                  <span
                    className="absolute inset-y-0"
                    style={{
                      left: `${todayPosition}%`,
                      width: "0.2cqw",
                      backgroundColor: branding.secondaryColor,
                      opacity: 0.9,
                    }}
                  />
                )}
                {/* Taakbalk met fase */}
                <span
                  className="absolute top-1/2 flex -translate-y-1/2 items-center justify-center overflow-hidden"
                  style={{
                    left: `${startPos}%`,
                    width: `${barWidth}%`,
                    height: compact ? "52%" : "48%",
                    background: `linear-gradient(180deg, ${lighten(barColor, 0.16)} 0%, ${barColor} 55%, ${darken(barColor, 0.1)} 100%)`,
                    boxShadow: `0 0.35cqw 1.2cqw ${withAlpha(darken(barColor, 0.4), "59")}`,
                    borderRadius: "0.55cqw",
                    padding: "0 0.8cqw",
                  }}
                >
                  {task.phase && barWidth >= 13 && (
                    <span
                      className="truncate font-semibold"
                      style={{
                        fontSize: compact ? "1.1cqw" : "1.25cqw",
                        color: "rgba(255,255,255,0.95)",
                        textShadow: "0 1px 2px rgba(0,0,0,0.35)",
                      }}
                    >
                      {task.phase}
                    </span>
                  )}
                </span>
                {/* Mijlpaal-ruit */}
                {milestonePos !== null && (
                  <span
                    className="absolute top-1/2"
                    style={{
                      left: `${milestonePos}%`,
                      width: compact ? "1.1cqw" : "1.3cqw",
                      height: compact ? "1.1cqw" : "1.3cqw",
                      transform: "translate(-50%, -50%) rotate(45deg)",
                      backgroundColor: branding.textColor,
                      border: `0.18cqw solid ${branding.backgroundColor}`,
                      borderRadius: "0.15cqw",
                    }}
                  />
                )}
              </div>

              {hasMilestones && (
                <div
                  className="flex min-w-0 flex-col justify-center"
                  style={{
                    width: milestoneColumn,
                    flexShrink: 0,
                    paddingLeft: "1.2cqw",
                    borderLeft: `1px solid ${gridColor}`,
                  }}
                >
                  {task.milestoneLabel && task.milestoneDate ? (
                    <>
                      <span
                        className="truncate leading-tight"
                        style={{ fontSize: compact ? "1.3cqw" : "1.45cqw" }}
                      >
                        {task.milestoneLabel}
                      </span>
                      <span
                        className="font-semibold"
                        style={{
                          fontSize: compact ? "1.2cqw" : "1.35cqw",
                          color: branding.secondaryColor,
                        }}
                      >
                        {MILESTONE_DATE_FORMAT(task.milestoneDate)}
                      </span>
                    </>
                  ) : (
                    <span style={{ fontSize: "1.3cqw", opacity: 0.35 }}>—</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legenda + vandaag-indicator */}
      <div
        className="flex items-center"
        style={{ gap: "2.2cqw", fontSize: "1.25cqw", opacity: 0.85 }}
      >
        {(["groen", "oranje", "rood"] as TrafficLight[]).map((status) => (
          <span key={status} className="flex items-center" style={{ gap: "0.5cqw" }}>
            <span
              className="rounded-full"
              style={{
                width: "0.9cqw",
                height: "0.9cqw",
                backgroundColor: TRAFFIC_COLORS[status],
              }}
            />
            {TRAFFIC_LABELS[status]}
          </span>
        ))}
        <span className="flex items-center" style={{ gap: "0.5cqw" }}>
          <span
            style={{
              width: "0.9cqw",
              height: "0.9cqw",
              transform: "rotate(45deg)",
              backgroundColor: branding.textColor,
              borderRadius: "0.12cqw",
            }}
          />
          Volgende mijlpaal
        </span>
        {todayPosition !== null && (
          <span className="flex items-center" style={{ gap: "0.5cqw" }}>
            <span
              style={{
                width: "0.2cqw",
                height: "1.3cqw",
                backgroundColor: branding.secondaryColor,
              }}
            />
            Vandaag
          </span>
        )}
      </div>
    </div>
  );
}

const HIGHLIGHT_SECTIONS: {
  key: keyof HighlightGroups;
  title: string;
  accent: string;
  marker: "check" | "diamond" | "arrow";
}[] = [
  { key: "achieved", title: "Behaald", accent: "#22c55e", marker: "check" },
  { key: "upcoming", title: "Komende mijlpalen", accent: "#f59e0b", marker: "diamond" },
  { key: "progress", title: "Voortgang", accent: "#3b82f6", marker: "arrow" },
];

function HighlightMarker({ type, color }: { type: string; color: string }) {
  if (type === "diamond") {
    return (
      <span
        className="mt-[0.55cqw] shrink-0"
        style={{
          width: "1cqw",
          height: "1cqw",
          transform: "rotate(45deg)",
          backgroundColor: color,
          borderRadius: "0.12cqw",
        }}
      />
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={3}
      className="mt-[0.35cqw] shrink-0"
      style={{ width: "1.5cqw", height: "1.5cqw" }}
    >
      {type === "check" ? (
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 12h14m-5-6l6 6-6 6" />
      )}
    </svg>
  );
}

function HighlightsSlide({
  item,
  branding,
  groups,
}: {
  item: PlayerContentItem;
  branding: PlayerBranding;
  groups: HighlightGroups;
}) {
  const sections = HIGHLIGHT_SECTIONS.filter(
    (section) => groups[section.key].length > 0
  );

  return (
    <div
      className="flex h-full w-full flex-col"
      style={{ padding: "3.5cqw 4cqw", gap: "2.2cqw" }}
    >
      <div className="flex items-baseline justify-between">
        <h1 className="font-bold leading-tight" style={{ fontSize: "3.2cqw" }}>
          {item.title}
        </h1>
        {item.subtitle && (
          <span style={{ fontSize: "1.5cqw", opacity: 0.65 }}>
            {item.subtitle}
          </span>
        )}
      </div>

      <div
        className="grid min-h-0 flex-1"
        style={{
          gridTemplateColumns: `repeat(${sections.length || 1}, minmax(0, 1fr))`,
          gap: "2cqw",
        }}
      >
        {sections.map((section) => (
          <div
            key={section.key}
            className="flex min-h-0 flex-col"
            style={{
              ...cardStyle(branding),
              borderTop: `0.45cqw solid ${section.accent}`,
              borderRadius: "1.1cqw",
              padding: "1.8cqw",
              gap: "1.4cqw",
            }}
          >
            <p
              className="font-bold uppercase tracking-wider"
              style={{ fontSize: "1.5cqw", color: section.accent }}
            >
              {section.title}
            </p>
            <div className="flex min-h-0 flex-col" style={{ gap: "1.2cqw" }}>
              {groups[section.key].map((text, index) => (
                <div
                  key={index}
                  className="flex items-start"
                  style={{ gap: "0.9cqw" }}
                >
                  <HighlightMarker type={section.marker} color={section.accent} />
                  <span className="leading-snug" style={{ fontSize: "1.65cqw" }}>
                    {text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function KpiSlide({
  item,
  branding,
  metadata,
}: {
  item: PlayerContentItem;
  branding: PlayerBranding;
  metadata: ContentMetadata;
}) {
  const kpis: KpiRow[] = metadata.kpis ?? [];
  const columns =
    kpis.length <= 2
      ? kpis.length || 1
      : kpis.length <= 4
        ? 2
        : kpis.length <= 6
          ? 3
          : 4;
  // Compacter bij veel kaarten, zodat alles binnen de slide blijft
  const compact = kpis.length > 6;

  return (
    <div
      className="flex h-full w-full flex-col"
      style={{ padding: "3.5cqw 4cqw", gap: compact ? "2cqw" : "3cqw" }}
    >
      <div>
        <h1 className="font-bold leading-tight" style={{ fontSize: "3.4cqw" }}>
          {item.title}
        </h1>
        {item.subtitle && (
          <p style={{ fontSize: "1.8cqw", color: branding.secondaryColor }}>
            {item.subtitle}
          </p>
        )}
      </div>
      <div
        className="grid min-h-0 flex-1"
        style={{
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          gap: compact ? "1.4cqw" : "2cqw",
          alignContent: "center",
        }}
      >
        {kpis.map((kpi, index) => (
          <div
            key={index}
            className="flex min-h-0 flex-col justify-center overflow-hidden"
            style={{
              ...cardStyle(branding),
              borderTop: `0.55cqw solid ${TRAFFIC_COLORS[kpi.status]}`,
              borderRadius: "1.1cqw",
              padding: compact ? "1.3cqw 1.6cqw" : "2cqw 2.5cqw",
              gap: "0.6cqw",
            }}
          >
            <p
              className="leading-snug opacity-80"
              style={{ fontSize: compact ? "1.35cqw" : "1.7cqw" }}
            >
              {kpi.label}
            </p>
            <p
              className="font-bold leading-none"
              style={{ fontSize: compact ? "3.2cqw" : "4.5cqw" }}
            >
              {kpi.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function InfoCard({
  label,
  text,
  accent,
  dark = false,
}: {
  label: string;
  text: string;
  accent: string;
  dark?: boolean;
}) {
  return (
    <div
      style={{
        background: dark
          ? "linear-gradient(180deg, rgba(255,255,255,0.11) 0%, rgba(255,255,255,0.05) 100%)"
          : "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.045) 100%)",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 0.5cqw 2cqw rgba(0, 0, 0, 0.18)",
        borderLeft: `0.5cqw solid ${accent}`,
        borderRadius: "0.9cqw",
        padding: "1.6cqw 2cqw",
      }}
    >
      <p
        className="font-semibold uppercase tracking-wider"
        style={{ fontSize: "1.4cqw", color: accent }}
      >
        {label}
      </p>
      <p className="leading-snug" style={{ fontSize: "1.9cqw", marginTop: "0.6cqw" }}>
        {text}
      </p>
    </div>
  );
}
