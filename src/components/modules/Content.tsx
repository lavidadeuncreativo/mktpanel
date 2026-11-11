"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { usePanel } from "../panel-context";
import type { ContentItem, ContentStatus, WorkspaceId } from "@/lib/types";
import {
  STATUS_LABELS,
  STATUS_ORDER,
  WEEK_DAYS,
  WORKSPACES,
} from "@/lib/types";
import { statusCounts, todayDayIndex, weeklyProgress } from "@/lib/derive";
import { formatDateShort, formatNumber, uid } from "@/lib/store";
import { WeekPlan } from "../WeekPlan";
import { useTodayIso } from "../useToday";
import { cn } from "../cn";
import {
  Button,
  Dialog,
  EmptyState,
  Field,
  Input,
  Pill,
  Progress,
  SectionHeading,
  Select,
  Stagger,
  StaggerItem,
  Textarea,
} from "../ui";

/** Color de cada estado del pipeline. Lo usa también el Calendario,
 *  para que un Reel se vea igual en los dos sitios. */
export function statusTone(status: ContentStatus): "green" | "blue" | "violet" | "neutral" | "amber" {
  switch (status) {
    case "publicado":
      return "green";
    case "edicion":
      return "blue";
    case "imagenes":
      return "violet";
    case "guion":
      return "amber";
    default:
      return "neutral";
  }
}

function ContentForm({
  initial,
  workspaceId,
  onClose,
}: {
  initial: ContentItem | null;
  workspaceId: WorkspaceId;
  onClose: () => void;
}) {
  const { update } = usePanel();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [status, setStatus] = useState<ContentStatus>(
    initial?.status ?? "idea",
  );
  const [day, setDay] = useState<string>(
    initial?.dayIndex !== null && initial?.dayIndex !== undefined
      ? String(initial.dayIndex)
      : "",
  );
  const [publishDate, setPublishDate] = useState(initial?.publishDate ?? "");
  const [sound, setSound] = useState(initial?.sound ?? "");
  const [script, setScript] = useState(initial?.script ?? "");
  const [copy, setCopy] = useState(initial?.copy ?? "");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    update((d) => {
      const ws = d[workspaceId];
      const item: ContentItem = {
        id: initial?.id ?? uid(),
        title: title.trim(),
        status,
        views: initial?.views ?? null,
        publishDate: publishDate || null,
        dayIndex: day === "" ? null : Number(day),
        sound: sound.trim() || undefined,
        script: script.trim() || undefined,
        copy: copy.trim() || undefined,
      };
      const content = initial
        ? ws.content.map((c) => (c.id === initial.id ? item : c))
        : [...ws.content, item];
      return { ...d, [workspaceId]: { ...ws, content } };
    });
    onClose();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Título del Reel">
        <Input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="El secreto de la calle…"
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Estado">
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as ContentStatus)}
          >
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Día de la semana" hint="Opcional.">
          <Select value={day} onChange={(e) => setDay(e.target.value)}>
            <option value="">Sin asignar</option>
            {WEEK_DAYS.map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Fecha de publicación" hint="Opcional.">
        <Input
          type="date"
          value={publishDate}
          onChange={(e) => setPublishDate(e.target.value)}
        />
      </Field>
      <Field
        label="Sonido usado"
        hint="Opcional: el audio o sonido del Reel. Con el sonido registrado en los Reels publicados, el panel puede recomendarte sonidos después."
      >
        <Input
          value={sound}
          onChange={(e) => setSound(e.target.value)}
          placeholder="Nombre del sonido o audio…"
        />
      </Field>
      <Field
        label="Guion"
        hint="Opcional: el guion de narración. El agente lo genera con tu clave de IA («genera el guion de …») y lo guarda aquí; también puedes escribirlo a mano."
      >
        <Textarea
          value={script}
          onChange={(e) => setScript(e.target.value)}
          placeholder="Guion del Reel…"
        />
      </Field>
      <Field
        label="Copy"
        hint="Opcional: caption + hashtags para publicar. El agente lo genera con tu clave de IA («genera el copy de …»)."
      >
        <Textarea
          value={copy}
          onChange={(e) => setCopy(e.target.value)}
          placeholder="Copy del Reel…"
        />
      </Field>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit">
          {initial ? "Guardar cambios" : "Agregar al pipeline"}
        </Button>
      </div>
    </form>
  );
}

export function Content() {
  const {
    data,
    view,
    update,
    focusContent,
    focusedContentId,
    clearContentFocus,
  } = usePanel();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ContentItem | null>(null);
  // En la vista general el diálogo de "Agregar Reel" necesita saber a
  // qué espacio va: cada grupo tiene su propio botón.
  const [dialogWs, setDialogWs] = useState<WorkspaceId | null>(null);
  const today = todayDayIndex(useTodayIso());

  // El Calendario pide abrir un Reel: se deriva del foco, sin efectos.
  // El diálogo se abre mientras el foco apunta a un Reel que existe; al
  // cerrarlo se limpia el foco (y el estado local), así que no puede
  // reaparecer solo. No hay setState en efectos: la regla de lint lo
  // prohíbe y la derivación lo hace innecesario.
  const focusedItem =
    focusedContentId && view !== "general"
      ? (data[view].content.find((c) => c.id === focusedContentId) ?? null)
      : null;
  const dialogItem = editing ?? focusedItem;
  const dialogIsOpen = dialogOpen || focusedItem !== null;

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
    clearContentFocus();
  };

  if (view === "general") {
    // El pipeline agregado de los tres espacios, agrupado por cuenta:
    // cada Reel se ve con su estado, día y vistas, y tocarlo lo abre
    // en su espacio para editarlo.
    const ids = ["evym", "antojo", "personal"] as WorkspaceId[];
    const totalPublished = ids.reduce(
      (s, id) =>
        s + data[id].content.filter((c) => c.status === "publicado").length,
      0,
    );
    return (
      <div className="space-y-6">
        <SectionHeading
          title="Contenido"
          description={`Pipeline de tus tres espacios: ${totalPublished} publicados en total, de la idea a publicado.`}
        />
        <Stagger>
          {ids.map((wsId) => {
            const ws = data[wsId];
            const meta = WORKSPACES.find((w) => w.id === wsId);
            const published = ws.content.filter(
              (c) => c.status === "publicado",
            ).length;
            const sorted = [...ws.content].sort(
              (a, b) => (a.dayIndex ?? 99) - (b.dayIndex ?? 99),
            );
            return (
              <StaggerItem key={wsId} className="surface p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-base font-semibold tracking-[-0.01em] text-ink">
                    {meta?.name ?? wsId}
                  </h2>
                  <div className="flex items-center gap-3">
                    <p className="text-sm text-muted-fg">
                      {published} publicados · {ws.content.length} en pipeline
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setDialogWs(wsId);
                        setEditing(null);
                        setDialogOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      Agregar Reel
                    </Button>
                  </div>
                </div>
                {sorted.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-fg">
                    Sin Reels todavía en este espacio.
                  </p>
                ) : (
                  <ul className="mt-2">
                    {sorted.map((c, i) => (
                      <li
                        key={c.id}
                        className={cn(
                          "flex items-center gap-3 py-3",
                          i > 0 && "border-t border-line/70",
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => focusContent(c.id, wsId)}
                          aria-label={`Editar ${c.title} en ${meta?.name ?? wsId}`}
                          className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[15px] font-medium text-ink">
                              {c.title}
                            </span>
                            <span className="block text-[13px] text-muted-fg">
                              {c.dayIndex !== null
                                ? WEEK_DAYS[c.dayIndex]
                                : "Sin asignar"}
                              {c.publishDate
                                ? ` · ${formatDateShort(c.publishDate)}`
                                : ""}
                            </span>
                          </span>
                          <span className="shrink-0 text-right text-[15px] font-semibold text-ink">
                            {c.views !== null
                              ? formatNumber(c.views)
                              : "Sin datos"}
                            <span className="block text-xs font-normal text-muted-fg">
                              vistas
                            </span>
                          </span>
                          <Pill tone={statusTone(c.status)}>
                            {STATUS_LABELS[c.status]}
                          </Pill>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </StaggerItem>
            );
          })}
        </Stagger>

        <Dialog
          open={dialogIsOpen}
          onClose={closeDialog}
          title={dialogItem ? "Editar Reel" : "Agregar Reel"}
        >
          <ContentForm
            initial={dialogItem}
            workspaceId={dialogWs ?? "evym"}
            onClose={closeDialog}
          />
        </Dialog>
      </div>
    );
  }

  const ws = data[view];
  const week = weeklyProgress(ws);
  const counts = statusCounts(ws);
  const sorted = [...ws.content].sort(
    (a, b) => (a.dayIndex ?? 99) - (b.dayIndex ?? 99),
  );

  const setStatus = (id: string, status: ContentStatus) => {
    update((d) => ({
      ...d,
      [view]: {
        ...d[view],
        content: d[view].content.map((c) =>
          c.id === id ? { ...c, status } : c,
        ),
      },
    }));
  };

  const removeItem = (id: string, title: string) => {
    if (!window.confirm(`¿Borrar “${title}” del pipeline?`)) return;
    update((d) => ({
      ...d,
      [view]: { ...d[view], content: d[view].content.filter((c) => c.id !== id) },
    }));
  };

  const openAdd = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Contenido"
        description="Pipeline de los 7 Reels semanales: de la idea a publicado."
        action={
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Agregar Reel
          </Button>
        }
      />

      <Stagger>
        {/* Weekly progress */}
        <StaggerItem className="surface surface-hover p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-base font-semibold tracking-[-0.01em] text-ink">
              Avance de la semana
            </h2>
            <p className="text-sm font-semibold text-ink">
              {week.published} de {week.total} publicados ({week.pct}%)
            </p>
          </div>
          <Progress value={week.pct} className="mt-3" />
          <div className="mt-4 flex flex-wrap gap-2">
            {STATUS_ORDER.map((s) => (
              <Pill key={s} tone={statusTone(s)}>
                {STATUS_LABELS[s]}: {counts[s]}
              </Pill>
            ))}
          </div>
        </StaggerItem>

        {/* Week plan: the 7 day-slots, one Reel per day */}
        <StaggerItem className="surface surface-hover p-5">
          <h2 className="text-base font-semibold tracking-[-0.01em] text-ink">
            Plan de la semana
          </h2>
          <p className="mt-0.5 mb-4 text-sm text-muted-fg">
            Un Reel por día. Toca un día para editar su Reel.
          </p>
          <WeekPlan
            ws={ws}
            today={today}
            onSelect={(item) => {
              setEditing(item);
              setDialogOpen(true);
            }}
          />
        </StaggerItem>

        {/* Pipeline table */}
        {sorted.length === 0 ? (
          <EmptyState
            title="Pipeline vacío"
            description="Agrega tu primer Reel y muévelo por los estados: idea, guion, imágenes, edición y publicado. La meta es 7 por semana."
            action={<Button onClick={openAdd}>Agregar primer Reel</Button>}
          />
        ) : (
          <StaggerItem className="surface p-5">
            <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-muted-fg">
                  <th scope="col" className="py-2 pr-3 font-medium">Reel</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Día</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Estado</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Publicación</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Sonido</th>
                  <th scope="col" className="py-2 pr-3 text-right font-medium">Vistas</th>
                  <th scope="col" className="py-2 text-right font-medium">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((c) => (
                  <tr key={c.id} className="border-b border-line last:border-0">
                    <td className="py-3 pr-3 font-medium text-ink">{c.title}</td>
                    <td className="py-3 pr-3 text-muted-fg">
                      {c.dayIndex !== null ? WEEK_DAYS[c.dayIndex] : "Sin asignar"}
                    </td>
                    <td className="py-3 pr-3">
                      <Select
                        aria-label={`Estado de ${c.title}`}
                        value={c.status}
                        onChange={(e) =>
                          setStatus(c.id, e.target.value as ContentStatus)
                        }
                        className="h-9 w-36 text-sm"
                      >
                        {STATUS_ORDER.map((s) => (
                          <option key={s} value={s}>
                            {STATUS_LABELS[s]}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className="py-3 pr-3 text-muted-fg">
                      {c.publishDate
                        ? formatDateShort(c.publishDate)
                        : "Sin programar"}
                    </td>
                    <td className="max-w-[140px] truncate py-3 pr-3 text-muted-fg">
                      {c.sound?.trim() ? c.sound : "Sin registrar"}
                    </td>
                    <td className="py-3 pr-3 text-right font-semibold text-ink">
                      {c.views !== null ? formatNumber(c.views) : "Sin datos"}
                    </td>
                    <td className="py-3 text-right">
                      <span className="inline-flex gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(c);
                            setDialogOpen(true);
                          }}
                          aria-label={`Editar ${c.title}`}
                          className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-muted-fg transition-colors duration-200 ease-apple hover:bg-control hover:text-ink"
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeItem(c.id, c.title)}
                          aria-label={`Borrar ${c.title}`}
                          className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-muted-fg transition-colors duration-200 ease-apple hover:bg-danger-soft hover:text-danger"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </StaggerItem>
        )}
      </Stagger>

      <Dialog
        open={dialogIsOpen}
        onClose={closeDialog}
        title={dialogItem ? "Editar Reel" : "Agregar Reel"}
      >
        <ContentForm
          initial={dialogItem}
          workspaceId={view}
          onClose={closeDialog}
        />
      </Dialog>
    </div>
  );
}
