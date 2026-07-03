import type { ContentStatus, ContentType, Priority } from "@prisma/client";

export const CONTENT_TYPES: ContentType[] = [
  "news",
  "project_update",
  "incident",
  "planning",
  "announcement",
  "kpi",
];

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  news: "Nieuwsbericht",
  project_update: "Projectupdate",
  incident: "Incidentmelding",
  planning: "Planning",
  announcement: "Aankondiging",
  kpi: "KPI",
};

export const CONTENT_STATUS_LABELS: Record<ContentStatus, string> = {
  draft: "Concept",
  scheduled: "Gepland",
  published: "Gepubliceerd",
  archived: "Gearchiveerd",
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: "Laag",
  normal: "Normaal",
  high: "Hoog",
  urgent: "Urgent",
};

export const STATUS_BADGE_CLASSES: Record<ContentStatus, string> = {
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  scheduled: "bg-amber-100 text-amber-800 border-amber-200",
  published: "bg-emerald-100 text-emerald-800 border-emerald-200",
  archived: "bg-slate-100 text-slate-400 border-slate-200",
};

export const PRIORITY_BADGE_CLASSES: Record<Priority, string> = {
  low: "bg-slate-100 text-slate-500 border-slate-200",
  normal: "bg-blue-50 text-blue-700 border-blue-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  urgent: "bg-red-100 text-red-800 border-red-200",
};

export type TrafficLight = "groen" | "oranje" | "rood";

export type ProjectUpdateMetadata = {
  projectStatus?: TrafficLight;
  milestone?: string;
  attentionPoint?: string;
  owner?: string;
};

export type IncidentMetadata = {
  incidentDate?: string;
  lesson?: string;
  measure?: string;
};

export type PlanningView = "lijst" | "gantt";

export type GanttTask = {
  label: string;
  /** ISO-datum (YYYY-MM-DD) */
  start: string;
  end: string;
  status?: TrafficLight;
  /** Huidige fase, bijv. "Uitvoering" of "Ontwerp" */
  phase?: string;
  /** Eerstvolgende mijlpaal (kort label + ISO-datum) */
  milestoneLabel?: string;
  milestoneDate?: string;
};

export type HighlightGroups = {
  /** Recent behaalde mijlpalen */
  achieved: string[];
  /** Mijlpalen die er de komende weken aankomen */
  upcoming: string[];
  /** Voortgang op de belangrijkste projecten */
  progress: string[];
};

export type PlanningMetadata = {
  period?: string;
  activities?: string[];
  planningView?: PlanningView;
  tasks?: GanttTask[];
  /** Vaste tijdas (ISO-datums) zodat gesplitste Gantt-delen dezelfde schaal delen. */
  ganttDomain?: { start: string; end: string };
  /** Gestructureerde highlights (AI-import); rendert als eigen template. */
  highlightGroups?: HighlightGroups;
  /** Stabiele sleutel voor AI-imports: her-uploads werken hetzelfde item bij. */
  importKey?: string;
};

export type KpiRow = { label: string; value: string; status: TrafficLight };

export type KpiMetadata = {
  kpis?: KpiRow[];
};

export type ContentMetadata = ProjectUpdateMetadata &
  IncidentMetadata &
  PlanningMetadata &
  KpiMetadata & {
    /** Kernpunten-opsomming (o.a. VGR-import); rendert als bulletlijst. */
    bullets?: string[];
  };

/** Bepaalt of een item nu zichtbaar hoort te zijn op de player. */
export function isCurrentlyVisible(item: {
  status: ContentStatus;
  isActive: boolean;
  startDate: Date | null;
  endDate: Date | null;
}): boolean {
  if (!item.isActive) return false;
  if (item.status !== "published" && item.status !== "scheduled") return false;
  const now = new Date();
  if (item.startDate && item.startDate > now) return false;
  if (item.endDate && item.endDate < now) return false;
  return true;
}
