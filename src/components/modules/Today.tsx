"use client";

import {
  Check,
  Clapperboard,
  Flame,
  Lightbulb,
  ListVideo,
} from "lucide-react";
import { usePanel } from "../panel-context";
import type {
  ContentItem,
  ContentStatus,
  PanelData,
  WorkspaceData,
  WorkspaceId,
} from "@/lib/types";
import { STATUS_LABELS, STATUS_ORDER, WEEK_DAYS } from "@/lib/types";
import {
  nextSuggestedIdea,
  publishQueue,
  streak,
  todayDayIndex,
  todayReel,
} from "@/lib/derive";
import { formatDateLong, formatDateShort, todayIso, uid } from "@/lib/store";
import { WeekPlan } from "../WeekPlan";
import { useTodayIso } from "../useToday";
import { Button, EmptyState, Pill, SectionHeading, Switch } from "../ui";

const NEXT_STEP: Record<ContentStatus, { label: string; action: string }> = {
  idea: { label: "Escribe el guion", action: "Empezar guion" },
  guion: { label: "Prepara las imágenes", action: "Pasar a imágenes" },
  imagenes: { label: "Edita el video", action: "Pasar a edición" },
  edicion: { label: "Publícalo hoy", action: "Publicar hoy" },
  publicado: { label: "Publicado", action: "Publicado" },
};

function statusTone(status: ContentStatus): "green" | "blue" | "violet" | "amber" | "neutral" {
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

function advance(
  item: ContentItem,
  wsId: WorkspaceId,
  update: (fn: (d: PanelData) => PanelData) => void,
) {
  const idx = STATUS_ORDER.indexOf(item.status);
  const next = STATUS_ORDER[Math.min(idx + 1, STATUS_ORDER.length - 1)];
  update((d) => ({
    ...d,
    [wsId]: {
      ...d[wsId],
      content: d[wsId].content.map((c) =>
        c.id === item.id
          ? {
              ...c,
              status: next,
              publishDate: next === "publicado" ? todayIso() : c.publishDate,
            }
          : c,
      ),
    },
  }));
}

function TodayWorkspace({
  wsId,
  ws,
  showName,
}: {
  wsId: WorkspaceId;
  ws: WorkspaceData;
  showName: boolean;
}) {
  const { update, setModule } = usePanel();
  const iso = useTodayIso();
  const today = todayDayIndex(iso);
  const reel = todayReel(ws, iso);
  const streakCount = streak(ws, iso);
  const suggestion = nextSuggestedIdea(ws);
  const queue = publishQueue(ws);
  const step = reel ? NEXT_STEP[reel.status] : null;

  const moveSuggestionToScript = () => {
    if (!suggestion) return;
    update((d) => ({
      ...d,
      [wsId]: {
        ...d[wsId],
        ideas: d[wsId].ideas.filter((i) => i.id !== suggestion.id),
        content: [
          ...d[wsId].content,
          {
            id: uid(),
            title: suggestion.title,
            status: "guion",
            views: null,
            publishDate: null,
            dayIndex: null,
          },
        ],
      },
    }));
    setModule("contenido");
  };

  const toggleTask = (taskId: string, done: boolean) => {
    update((d) => ({
      ...d,
      [wsId]: {
        ...d[wsId],
        tasks: d[wsId].tasks.map((t) =>
          t.id === taskId ? { ...t, done } : t,
        ),
      },
    }));
  };

  return (
    <section aria-label={showName ? `Hoy en ${wsId}` : "Hoy"}>
      {showName ? (
        <h3 className="mb-3 text-lg font-semibold tracking-[-0.01em] text-ink">
          {wsId === "evym"
            ? "Entre Vivos y Muertos"
            : wsId === "antojo"
              ? "Antojo"
              : "Perfil personal"}
        </h3>
      ) : null}

      {/* Today's reel: the one bold element */}
      <div className="surface p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-muted-fg">
              {WEEK_DAYS[today]}, {formatDateLong(iso).replace(/^\w+, /, "")}
            </p>
            <h2 className="mt-1 text-[28px] leading-tight font-semibold tracking-[-0.02em] text-ink sm:text-[34px]">
              {reel ? reel.title : "Hoy no hay Reel asignado"}
            </h2>
            <p className="mt-1.5 text-[15px] text-muted-fg">
              {reel
                ? step?.label
                : "Agrega un Reel al pipeline o pasa una idea a guion y el día queda cubierto."}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-soft px-3 py-1.5 text-sm font-semibold text-amber-text">
            <Flame className="h-4 w-4" aria-hidden="true" />
            {streakCount === 0
              ? "Sin racha todavía"
              : streakCount === 1
                ? "Racha: 1 día"
                : `Racha: ${streakCount} días`}
          </span>
        </div>

        {reel ? (
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Pill tone={statusTone(reel.status)}>
              {STATUS_LABELS[reel.status]}
            </Pill>
            {reel.publishDate ? (
              <span className="text-sm text-muted-fg">
                {formatDateShort(reel.publishDate)}
              </span>
            ) : null}
            {reel.status !== "publicado" ? (
              <Button onClick={() => advance(reel, wsId, update)}>
                {step?.action}
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => setModule("metricas")}
              >
                Registrar métricas del Reel
              </Button>
            )}
            <Button variant="ghost" onClick={() => setModule("contenido")}>
              Abrir pipeline
            </Button>
          </div>
        ) : (
          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={() => setModule("contenido")}>
              Agregar Reel al pipeline
            </Button>
            <Button variant="outline" onClick={() => setModule("ideas")}>
              Ver banco de ideas
            </Button>
          </div>
        )}
      </div>

      {/* Week plan */}
      <div className="mt-6">
        <SectionHeading
          title="La semana"
          description="Un Reel por día. Toca un día para abrirlo en Contenido."
        />
        <WeekPlan
          ws={ws}
          today={today}
          onSelect={() => setModule("contenido")}
        />
      </div>

      {/* Next suggested topic */}
      <div className="mt-8">
        <SectionHeading
          title="Siguiente tema"
          description="El tema más fuerte de tu banco de ideas, listo para guion."
        />
        {suggestion ? (
          <div className="surface flex flex-wrap items-center justify-between gap-4 p-5">
            <div className="flex min-w-0 items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                <Lightbulb className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-base font-semibold tracking-[-0.01em] text-ink">
                  {suggestion.title}
                </p>
                <p className="mt-0.5 text-sm text-muted-fg">
                  {suggestion.score} de 10
                  {suggestion.notes ? ` — ${suggestion.notes}` : ""}
                </p>
              </div>
            </div>
            <Button onClick={moveSuggestionToScript}>
              <Clapperboard className="h-4 w-4" aria-hidden="true" />
              Pasar a guion
            </Button>
          </div>
        ) : (
          <EmptyState
            title="Sin ideas en el banco"
            description="Guarda temas en Ideas con su puntuación y aquí aparecerá el siguiente sugerido."
            action={
              <Button variant="outline" onClick={() => setModule("ideas")}>
                Ir a Ideas
              </Button>
            }
          />
        )}
      </div>

      {/* Publish queue */}
      <div className="mt-8">
        <SectionHeading
          title="A continuación"
          description="Lo próximo a publicar, en orden."
        />
        {queue.length === 0 ? (
          <EmptyState
            title="Cola vacía"
            description="Cuando agregues Reels al pipeline, aparecerán aquí en el orden en que toca publicarlos."
          />
        ) : (
          <ul className="surface divide-y divide-line px-5">
            {queue.map((item) => (
              <li key={item.id} className="flex items-center gap-3 py-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-muted text-muted-fg">
                  <ListVideo className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium text-ink">
                    {item.title}
                  </span>
                  <span className="block text-xs text-muted-fg">
                    {item.dayIndex !== null
                      ? WEEK_DAYS[item.dayIndex]
                      : "Sin día asignado"}
                    {item.publishDate
                      ? ` — ${formatDateShort(item.publishDate)}`
                      : ""}
                  </span>
                </span>
                <Pill tone={statusTone(item.status)}>
                  {STATUS_LABELS[item.status]}
                </Pill>
                {item.status === "publicado" ? (
                  <Check
                    className="h-4 w-4 shrink-0 text-accent-text"
                    aria-hidden="true"
                  />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Today's checklist */}
      <div className="mt-8">
        <SectionHeading
          title="Checklist de hoy"
          description="Lo que falta para que el Reel de hoy salga bien."
        />
        {ws.tasks.length === 0 ? (
          <EmptyState
            title="Sin pendientes"
            description="Carga el checklist de publicación y marca cada paso conforme lo haces."
            action={
              <Button variant="outline" onClick={() => setModule("pendientes")}>
                Cargar checklist
              </Button>
            }
          />
        ) : (
          <ul className="surface divide-y divide-line px-5">
            {ws.tasks.map((t) => (
              <li key={t.id} className="flex items-center gap-3 py-2.5">
                <Switch
                  checked={t.done}
                  onChange={(next) => toggleTask(t.id, next)}
                  label={t.done ? `Marcar como pendiente: ${t.label}` : `Marcar como hecho: ${t.label}`}
                />
                <span
                  className={
                    t.done
                      ? "flex-1 text-[15px] text-muted-fg line-through"
                      : "flex-1 text-[15px] text-ink"
                  }
                >
                  {t.label}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export function Today() {
  const { data, view } = usePanel();

  if (view === "general") {
    const scopes: WorkspaceId[] = ["evym", "antojo", "personal"];
    return (
      <div className="space-y-10">
        <SectionHeading
          title="Hoy"
          description="Qué toca hoy en cada espacio, y la racha que llevas."
        />
        {scopes.map((id) => (
          <TodayWorkspace
            key={id}
            wsId={id}
            ws={data[id]}
            showName
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <TodayWorkspace wsId={view} ws={data[view]} showName={false} />
    </div>
  );
}
