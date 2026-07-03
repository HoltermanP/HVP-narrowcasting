"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { ImagePlus, Loader2, Plus, Trash2 } from "lucide-react";
import type { ContentItem, ContentType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  createContentItem,
  updateContentItem,
} from "@/app/(admin)/content/actions";
import {
  CONTENT_TYPE_LABELS,
  PRIORITY_LABELS,
  CONTENT_STATUS_LABELS,
  type ContentMetadata,
  type GanttTask,
  type KpiRow,
  type PlanningView,
  type TrafficLight,
} from "@/lib/content";

const TRAFFIC_LIGHT_OPTIONS: { value: TrafficLight; label: string }[] = [
  { value: "groen", label: "Groen — op schema" },
  { value: "oranje", label: "Oranje — aandacht nodig" },
  { value: "rood", label: "Rood — actie vereist" },
];

function toDatetimeLocal(date: Date | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function ContentForm({
  type,
  item,
}: {
  type: ContentType;
  item?: ContentItem;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const metadata = (item?.metadata ?? {}) as ContentMetadata;

  const [title, setTitle] = useState(item?.title ?? "");
  const [subtitle, setSubtitle] = useState(item?.subtitle ?? "");
  const [body, setBody] = useState(item?.body ?? "");
  const [status, setStatus] = useState(item?.status ?? "draft");
  const [priority, setPriority] = useState(item?.priority ?? "normal");
  const [imageUrl, setImageUrl] = useState(item?.imageUrl ?? "");
  const [startDate, setStartDate] = useState(toDatetimeLocal(item?.startDate));
  const [endDate, setEndDate] = useState(toDatetimeLocal(item?.endDate));
  const [durationSeconds, setDurationSeconds] = useState(
    String(item?.durationSeconds ?? 15)
  );

  // Typespecifieke velden
  const [projectStatus, setProjectStatus] = useState<TrafficLight>(
    metadata.projectStatus ?? "groen"
  );
  const [milestone, setMilestone] = useState(metadata.milestone ?? "");
  const [attentionPoint, setAttentionPoint] = useState(
    metadata.attentionPoint ?? ""
  );
  const [owner, setOwner] = useState(metadata.owner ?? "");
  const [incidentDate, setIncidentDate] = useState(metadata.incidentDate ?? "");
  const [lesson, setLesson] = useState(metadata.lesson ?? "");
  const [measure, setMeasure] = useState(metadata.measure ?? "");
  const [period, setPeriod] = useState(metadata.period ?? "");
  const [activitiesText, setActivitiesText] = useState(
    (metadata.activities ?? []).join("\n")
  );
  const [planningView, setPlanningView] = useState<PlanningView>(
    metadata.planningView ?? "lijst"
  );
  const [tasks, setTasks] = useState<GanttTask[]>(
    metadata.tasks?.length
      ? metadata.tasks
      : [{ label: "", start: "", end: "", status: "groen" }]
  );
  const [kpis, setKpis] = useState<KpiRow[]>(
    metadata.kpis?.length
      ? metadata.kpis
      : [{ label: "", value: "", status: "groen" }]
  );

  const supportsImage = type === "news" || type === "announcement";
  const supportsBody =
    type === "news" || type === "announcement" || type === "incident";
  const supportsPriority = type === "incident" || type === "announcement";

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Upload mislukt");
      }
      const data = (await res.json()) as { url: string };
      setImageUrl(data.url);
      toast.success("Afbeelding geüpload");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload mislukt");
    } finally {
      setUploading(false);
    }
  }

  function buildMetadata(): ContentMetadata | undefined {
    switch (type) {
      case "project_update":
        return {
          projectStatus,
          milestone: milestone || undefined,
          attentionPoint: attentionPoint || undefined,
          owner: owner || undefined,
        };
      case "incident":
        return {
          incidentDate: incidentDate || undefined,
          lesson: lesson || undefined,
          measure: measure || undefined,
        };
      case "planning":
        return {
          period: period || undefined,
          planningView,
          // Behoud AI-importvelden bij handmatig bewerken
          importKey: metadata.importKey,
          highlightGroups: metadata.highlightGroups,
          activities:
            planningView === "lijst"
              ? activitiesText
                  .split("\n")
                  .map((line) => line.trim())
                  .filter(Boolean)
              : undefined,
          tasks:
            planningView === "gantt"
              ? tasks.filter(
                  (task) => task.label.trim() && task.start && task.end
                )
              : undefined,
        };
      case "kpi":
        return {
          kpis: kpis.filter((row) => row.label.trim() && row.value.trim()),
          importKey: metadata.importKey,
        };
      default:
        // Behoud AI-importvelden (bullets, importKey) bij handmatig bewerken
        if (metadata.bullets?.length || metadata.importKey) {
          return { bullets: metadata.bullets, importKey: metadata.importKey };
        }
        return undefined;
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const input = {
      title,
      subtitle: subtitle || undefined,
      body: body || undefined,
      type,
      status,
      priority: supportsPriority ? priority : priority,
      imageUrl: imageUrl || undefined,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      durationSeconds: Number(durationSeconds),
      metadata: buildMetadata(),
    };

    if (input.startDate && input.endDate && input.endDate < input.startDate) {
      toast.error("De einddatum ligt vóór de startdatum");
      return;
    }

    if (type === "planning" && planningView === "gantt") {
      const invalidTask = tasks.find(
        (task) =>
          task.label.trim() && task.start && task.end && task.end < task.start
      );
      if (invalidTask) {
        toast.error(
          `De einddatum ligt vóór de startdatum bij "${invalidTask.label}"`
        );
        return;
      }
    }

    startTransition(async () => {
      const result = item
        ? await updateContentItem(item.id, input)
        : await createContentItem(input);
      if (result.ok) {
        toast.success(item ? "Bericht bijgewerkt" : "Bericht aangemaakt");
        router.push("/content");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{CONTENT_TYPE_LABELS[type]}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">
              {type === "project_update" ? "Projectnaam" : "Titel"} *
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subtitle">Ondertitel (optioneel)</Label>
            <Input
              id="subtitle"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              maxLength={200}
            />
          </div>

          {supportsBody && (
            <div className="space-y-2">
              <Label htmlFor="body">
                {type === "incident" ? "Wat is er gebeurd?" : "Korte tekst"}
                {type === "incident" ? " *" : ""}
              </Label>
              <Textarea
                id="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                required={type === "incident"}
                maxLength={5000}
              />
            </div>
          )}

          {supportsImage && (
            <div className="space-y-2">
              <Label>Afbeelding (optioneel)</Label>
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUpload(file);
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ImagePlus className="h-4 w-4" />
                  )}
                  {imageUrl ? "Andere afbeelding" : "Afbeelding uploaden"}
                </Button>
                {imageUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setImageUrl("")}
                  >
                    <Trash2 className="h-4 w-4" /> Verwijderen
                  </Button>
                )}
              </div>
              {imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUrl}
                  alt="Voorbeeld"
                  className="mt-2 max-h-40 rounded-md border border-slate-200 object-cover"
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {type === "project_update" && (
        <Card>
          <CardHeader>
            <CardTitle>Projectgegevens</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Projectstatus *</Label>
              <Select
                value={projectStatus}
                onValueChange={(v) => setProjectStatus(v as TrafficLight)}
              >
                <SelectTrigger className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRAFFIC_LIGHT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="milestone">Mijlpaal</Label>
              <Input
                id="milestone"
                value={milestone}
                onChange={(e) => setMilestone(e.target.value)}
                placeholder="Bijv. Installatie gereed op 15 juli"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="attentionPoint">Aandachtspunt</Label>
              <Input
                id="attentionPoint"
                value={attentionPoint}
                onChange={(e) => setAttentionPoint(e.target.value)}
                placeholder="Bijv. Levertijd onderdelen bewaken"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="owner">Eigenaar</Label>
              <Input
                id="owner"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                placeholder="Naam van de projecteigenaar"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {type === "incident" && (
        <Card>
          <CardHeader>
            <CardTitle>Incidentgegevens</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="incidentDate">Datum incident</Label>
              <Input
                id="incidentDate"
                type="date"
                value={incidentDate}
                onChange={(e) => setIncidentDate(e.target.value)}
                className="w-48"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lesson">Leerpunt</Label>
              <Textarea
                id="lesson"
                value={lesson}
                onChange={(e) => setLesson(e.target.value)}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="measure">Maatregel</Label>
              <Textarea
                id="measure"
                value={measure}
                onChange={(e) => setMeasure(e.target.value)}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {type === "planning" && (
        <Card>
          <CardHeader>
            <CardTitle>Planning</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="period">Datum of weeknummer</Label>
              <Input
                id="period"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                placeholder="Bijv. Week 28 of 14 juli"
                className="w-64"
              />
            </div>
            <div className="space-y-2">
              <Label>Weergave</Label>
              <Select
                value={planningView}
                onValueChange={(v) => setPlanningView(v as PlanningView)}
              >
                <SelectTrigger className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lijst">
                    Lijst — activiteiten onder elkaar
                  </SelectItem>
                  <SelectItem value="gantt">
                    Gantt-grafiek — taken op een tijdlijn
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {planningView === "lijst" && (
              <div className="space-y-2">
                <Label htmlFor="activities">
                  Activiteiten (één per regel)
                </Label>
                <Textarea
                  id="activities"
                  value={activitiesText}
                  onChange={(e) => setActivitiesText(e.target.value)}
                  rows={6}
                  placeholder={"Maandag: onderhoud lijn 2\nDinsdag: audit kwaliteitsteam"}
                />
              </div>
            )}

            {planningView === "gantt" && (
              <div className="space-y-3">
                {tasks.map((task, index) => (
                  <div
                    key={index}
                    className="space-y-2 rounded-md border border-slate-200 p-3"
                  >
                    <div className="flex items-end gap-2">
                      <div className="flex-1 space-y-1">
                        <Label>Project / taak</Label>
                        <Input
                          value={task.label}
                          placeholder="Bijv. Ombouw lijn 3"
                          maxLength={120}
                          onChange={(e) =>
                            setTasks((rows) =>
                              rows.map((r, i) =>
                                i === index ? { ...r, label: e.target.value } : r
                              )
                            )
                          }
                        />
                      </div>
                      <div className="w-36 space-y-1">
                        <Label>Start</Label>
                        <Input
                          type="date"
                          value={task.start}
                          onChange={(e) =>
                            setTasks((rows) =>
                              rows.map((r, i) =>
                                i === index ? { ...r, start: e.target.value } : r
                              )
                            )
                          }
                        />
                      </div>
                      <div className="w-36 space-y-1">
                        <Label>Einde</Label>
                        <Input
                          type="date"
                          value={task.end}
                          onChange={(e) =>
                            setTasks((rows) =>
                              rows.map((r, i) =>
                                i === index ? { ...r, end: e.target.value } : r
                              )
                            )
                          }
                        />
                      </div>
                      <div className="w-32 space-y-1">
                        <Label>Status</Label>
                        <Select
                          value={task.status ?? "groen"}
                          onValueChange={(v) =>
                            setTasks((rows) =>
                              rows.map((r, i) =>
                                i === index
                                  ? { ...r, status: v as TrafficLight }
                                  : r
                              )
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="groen">Groen</SelectItem>
                            <SelectItem value="oranje">Oranje</SelectItem>
                            <SelectItem value="rood">Rood</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={tasks.length === 1}
                        onClick={() =>
                          setTasks((rows) => rows.filter((_, i) => i !== index))
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-end gap-2">
                      <div className="w-44 space-y-1">
                        <Label className="text-slate-500">Fase (op de balk)</Label>
                        <Input
                          value={task.phase ?? ""}
                          placeholder="Bijv. Uitvoering"
                          maxLength={60}
                          onChange={(e) =>
                            setTasks((rows) =>
                              rows.map((r, i) =>
                                i === index
                                  ? { ...r, phase: e.target.value || undefined }
                                  : r
                              )
                            )
                          }
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <Label className="text-slate-500">
                          Volgende mijlpaal (optioneel)
                        </Label>
                        <Input
                          value={task.milestoneLabel ?? ""}
                          placeholder="Bijv. UO gereed"
                          maxLength={120}
                          onChange={(e) =>
                            setTasks((rows) =>
                              rows.map((r, i) =>
                                i === index
                                  ? {
                                      ...r,
                                      milestoneLabel:
                                        e.target.value || undefined,
                                    }
                                  : r
                              )
                            )
                          }
                        />
                      </div>
                      <div className="w-36 space-y-1">
                        <Label className="text-slate-500">Mijlpaaldatum</Label>
                        <Input
                          type="date"
                          value={task.milestoneDate ?? ""}
                          onChange={(e) =>
                            setTasks((rows) =>
                              rows.map((r, i) =>
                                i === index
                                  ? {
                                      ...r,
                                      milestoneDate:
                                        e.target.value || undefined,
                                    }
                                  : r
                              )
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={tasks.length >= 12}
                  onClick={() =>
                    setTasks((rows) => [
                      ...rows,
                      { label: "", start: "", end: "", status: "groen" },
                    ])
                  }
                >
                  <Plus className="h-4 w-4" /> Taak toevoegen
                </Button>
                <p className="text-xs text-slate-500">
                  Elke taak wordt een balk op de tijdlijn, gekleurd volgens de
                  status. De tijdas loopt automatisch van de eerste tot de
                  laatste datum.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {type === "kpi" && (
        <Card>
          <CardHeader>
            <CardTitle>KPI-regels</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {kpis.map((row, index) => (
              <div key={index} className="flex items-end gap-2">
                <div className="flex-1 space-y-1">
                  {index === 0 && <Label>Label</Label>}
                  <Input
                    value={row.label}
                    placeholder="Bijv. OEE lijn 1"
                    onChange={(e) =>
                      setKpis((rows) =>
                        rows.map((r, i) =>
                          i === index ? { ...r, label: e.target.value } : r
                        )
                      )
                    }
                  />
                </div>
                <div className="w-32 space-y-1">
                  {index === 0 && <Label>Waarde</Label>}
                  <Input
                    value={row.value}
                    placeholder="82%"
                    onChange={(e) =>
                      setKpis((rows) =>
                        rows.map((r, i) =>
                          i === index ? { ...r, value: e.target.value } : r
                        )
                      )
                    }
                  />
                </div>
                <div className="w-40 space-y-1">
                  {index === 0 && <Label>Status</Label>}
                  <Select
                    value={row.status}
                    onValueChange={(v) =>
                      setKpis((rows) =>
                        rows.map((r, i) =>
                          i === index
                            ? { ...r, status: v as TrafficLight }
                            : r
                        )
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="groen">Groen</SelectItem>
                      <SelectItem value="oranje">Oranje</SelectItem>
                      <SelectItem value="rood">Rood</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={kpis.length === 1}
                  onClick={() =>
                    setKpis((rows) => rows.filter((_, i) => i !== index))
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={kpis.length >= 12}
              onClick={() =>
                setKpis((rows) => [
                  ...rows,
                  { label: "", value: "", status: "groen" },
                ])
              }
            >
              <Plus className="h-4 w-4" /> KPI-regel toevoegen
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Publicatie</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as typeof status)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    Object.entries(CONTENT_STATUS_LABELS) as [
                      typeof status,
                      string,
                    ][]
                  ).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prioriteit</Label>
              <Select
                value={priority}
                onValueChange={(v) => setPriority(v as typeof priority)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    Object.entries(PRIORITY_LABELS) as [
                      typeof priority,
                      string,
                    ][]
                  ).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Weergaveduur (seconden)</Label>
              <Input
                id="duration"
                type="number"
                min={3}
                max={600}
                value={durationSeconds}
                onChange={(e) => setDurationSeconds(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startDate">Zichtbaar vanaf</Label>
              <Input
                id="startDate"
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Zichtbaar tot en met</Label>
              <Input
                id="endDate"
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Laat de datums leeg om het bericht altijd te tonen zolang het
            gepubliceerd is.
          </p>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending || uploading}>
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {item ? "Wijzigingen opslaan" : "Bericht aanmaken"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/content")}
        >
          Annuleren
        </Button>
      </div>
    </form>
  );
}
