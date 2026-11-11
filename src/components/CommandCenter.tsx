"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  Check,
  ChevronDown,
  Clapperboard,
  Flame,
  Lightbulb,
  ListVideo,
} from "lucide-react";
import { MODULES, usePanel, type ModuleId } from "./panel-context";
import type {
  ContentItem,
  ContentStatus,
  PanelData,
  WorkspaceData,
  WorkspaceId,
} from "@/lib/types";
import {
  NETWORK_LABELS,
  STATUS_LABELS,
  STATUS_ORDER,
  WEEK_DAYS,
} from "@/lib/types";
import {
  latestByNetwork,
  nextSuggestedIdea,
  previousByNetwork,
  publishQueue,
  streak,
  todayDayIndex,
  todayReel,
  weeklyProgress,
  workspaceTotals,
} from "@/lib/derive";
import {
  formatDateLong,
  formatDateShort,
  formatDeltaPct,
  formatNumber,
  todayIso,
  uid,
} from "@/lib/store";
import { WeekPlan } from "./WeekPlan";
import { useTodayIso } from "./useToday";
import { Button, Pill, Switch } from "./ui";
import { cn } from "./cn";

/* ------------------------------------------------------------------ */
/* Una sola pantalla responde cuatro preguntas: qué publico hoy,      */
/* cómo va la semana, qué funcionó ayer, qué sigue. Nada más.         */
/* ------------------------------------------------------------------ */

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isDesktop;
}

/**
 * Lo secundario en móvil: colapsado detrás de un título, nunca un
 * scroll infinito. En escritorio siempre está abierto: es parte de
 * la rejilla de una pantalla.
 */
function Collapsible({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: ReactNode;
}) {
  const isDesktop = useIsDesktop();
  const [open, setOpen] = useState(false);
  const expanded = isDesktop || open;
  return (
    <section className={cn("min-h-0", className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={expanded}
        className="mb-2 flex w-full cursor-pointer items-center justify-between rounded-[14px] bg-white/70 px-4 py-3 text-left text-[15px] font-semibold text-ink lg:hidden"
      >
        {title}
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-fg transition-transform duration-200 ease-apple",
            expanded && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>
      {expanded ? children : null}
    </section>
  );
}

function Card({
  title,
  actionLabel,
  onAction,
  className,
  children,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        "surface flex h-full min-h-0 flex-col p-5",
        className,
      )}
    >
      <div className="mb-3 flex shrink-0 items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold tracking-[-0.01em] text-ink">
          {title}
        </h2>
        {actionLabel && onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="shrink-0 cursor-pointer text-sm font-medium text-primary transition-opacity duration-200 ease-apple hover:opacity-70"
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
        {children}
      </div>
    </section>
  );
}

const NEXT_STEP: Record<ContentStatus, { label: string; action: string }> = {
  idea: { label: "Escribe el guion", action: "Empezar guion" },
  guion: { label: "Prepara las imágenes", action: "Pasar a imágenes" },
  imagenes: { label: "Edita el video", action: "Pasar a edición" },
  edicion: { label: "Publícalo hoy", action: "Publicar hoy" },
  publicado: { label: "Publicado", action: "Publicado" },
};

function statusTone(
  status: ContentStatus,
): "green" | "blue" | "violet" | "amber" | "neutral" {
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

export function CommandCenter() {
  const { data, view, update, openModule } = usePanel();
  const iso = useTodayIso();

  // "General" ya no se ofrece en la interfaz; si llegara, se cae a EVYM.
  const wsId: WorkspaceId = view === "general" ? "evym" : view;
  const ws: WorkspaceData = data[wsId];

  const today = todayDayIndex(iso);
  const reel = todayReel(ws, iso);
  const streakCount = streak(ws, iso);
  const suggestion = nextSuggestedIdea(ws);
  const queue = publishQueue(ws);
  const week = weeklyProgress(ws);
  const totals = workspaceTotals(ws);
  const step = reel ? NEXT_STEP[reel.status] : null;

  const latest = latestByNetwork(ws.snapshots);
  const previous = previousByNetwork(ws.snapshots);
  const netsWithDelta = (Object.keys(latest) as (keyof typeof latest)[]).filter(
    (n) => previous[n],
  );
  const curViews = netsWithDelta.reduce(
    (s, n) => s + (latest[n]?.views ?? 0),
    0,
  );
  const prevViews = netsWithDelta.reduce(
    (s, n) => s + (previous[n]?.views ?? 0),
    0,
  );
  const viewsDelta =
    netsWithDelta.length > 0 ? formatDeltaPct(curViews, prevViews) : null;

  const lastPublished = [...ws.content]
    .filter((c) => c.status === "publicado" && c.publishDate)
    .sort((a, b) => (b.publishDate ?? "").localeCompare(a.publishDate ?? ""))[0];

  const pendingTasks = [...ws.tasks].sort(
    (a, b) => Number(a.done) - Number(b.done),
  );
  const doneCount = ws.tasks.filter((t) => t.done).length;

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
    openModule("contenido");
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

  const open = (m: ModuleId) => () => openModule(m);

  return (
    <div className="flex flex-col gap-3 p-4 lg:grid lg:h-full lg:grid-cols-12 lg:grid-rows-[minmax(0,1.55fr)_minmax(0,0.8fr)_minmax(0,1fr)_auto] lg:gap-4 lg:p-5">
      {/* 1 · HOY: el Reel del día. La única cosa grande de la pantalla. */}
      <section
        aria-label="Hoy"
        className="surface flex min-h-0 flex-col p-5 sm:p-6 lg:col-span-8 lg:row-start-1"
      >
        <div className="flex shrink-0 flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-muted-fg">
              {WEEK_DAYS[today]},{" "}
              {formatDateLong(iso).replace(/^\w+, /, "")}
            </p>
            <h1 className="mt-1 max-w-2xl text-[28px] leading-tight font-semibold tracking-[-0.02em] text-ink sm:text-[34px] lg:line-clamp-2">
              {reel ? reel.title : "Hoy no hay Reel asignado"}
            </h1>
            <p className="mt-1.5 text-[15px] text-muted-fg">
              {reel
                ? step?.label
                : "Agrega un Reel al pipeline o pasa una idea a guion y el día queda cubierto."}
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-amber-soft px-3 py-1.5 text-sm font-semibold text-amber-text">
            <Flame className="h-4 w-4" aria-hidden="true" />
            {streakCount === 0
              ? "Sin racha todavía"
              : streakCount === 1
                ? "Racha: 1 día"
                : `Racha: ${streakCount} días`}
          </span>
        </div>

        {reel ? (
          <div className="mt-4 flex shrink-0 flex-wrap items-center gap-3">
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
              <Button variant="outline" onClick={open("metricas")}>
                Registrar métricas del Reel
              </Button>
            )}
            <Button variant="ghost" onClick={open("contenido")}>
              Abrir pipeline
            </Button>
          </div>
        ) : (
          <div className="mt-4 flex shrink-0 flex-wrap gap-2">
            <Button onClick={open("contenido")}>
              Agregar Reel al pipeline
            </Button>
            <Button variant="outline" onClick={open("ideas")}>
              Ver banco de ideas
            </Button>
          </div>
        )}

        <div className="mt-4 shrink-0 border-t border-line/70 pt-3">
          <p className="text-sm text-muted-fg">
            {lastPublished ? (
              <>
                Lo último publicado:{" "}
                <span className="font-medium text-ink">
                  {lastPublished.title}
                </span>
                {lastPublished.views !== null
                  ? ` — ${formatNumber(lastPublished.views)} reproducciones`
                  : ""}
              </>
            ) : (
              "Todavía no hay Reels publicados en este espacio."
            )}
          </p>
        </div>
      </section>

      {/* 2 · EL NÚMERO: vistas y seguidores, con veredicto, no solo datos. */}
      <Card
        title="El número"
        actionLabel="Ver métricas"
        onAction={open("metricas")}
        className="lg:col-span-4 lg:row-start-1"
      >
        <p className="text-[44px] leading-none font-semibold tracking-[-0.02em] text-ink">
          {formatNumber(totals.views)}
        </p>
        <p className="mt-1.5 text-sm font-medium text-ink">
          vistas en total · {formatNumber(totals.followers)} seguidores
        </p>
        {totals.networksWithData.length > 0 ? (
          <ul className="mt-3 space-y-1">
            {totals.networksWithData.map((n) => (
              <li key={n} className="text-sm text-muted-fg">
                {NETWORK_LABELS[n]}: {formatNumber(latest[n]?.views ?? 0)}{" "}
                vistas · {formatNumber(latest[n]?.followers ?? 0)} seguidores
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted-fg">
            Sin capturas todavía. Registra la primera en Métricas.
          </p>
        )}
        <div className="mt-4 border-t border-line/70 pt-3">
          {viewsDelta === null ? (
            <p className="text-sm text-muted-fg">
              Línea base. Registra una segunda captura y aquí verás si subes
              o bajas.
            </p>
          ) : (
            <p className="text-sm text-ink">
              <span
                className={curViews >= prevViews ? "font-semibold text-accent-text" : "font-semibold text-danger-text"}
              >
                Vistas {viewsDelta}
              </span>{" "}
              vs la captura anterior.
            </p>
          )}
          <p className="mt-1.5 text-sm font-medium text-ink">
            {reel
              ? reel.status === "publicado"
                ? `Hoy ya salió: ${reel.title}.`
                : `Hoy toca publicar: ${reel.title}.`
              : "Hoy no hay Reel asignado."}
          </p>
        </div>
      </Card>

      {/* 3 · LA SEMANA: 7 celdas, un vistazo. */}
      <Card
        title="La semana"
        actionLabel={`${week.published} de 7`}
        onAction={open("contenido")}
        className="lg:col-span-8 lg:row-start-2"
      >
        <WeekPlan ws={ws} today={today} onSelect={() => openModule("contenido")} />
      </Card>

      {/* 4 · SIGUIENTE TEMA: lo que sigue, listo para guion. */}
      <Collapsible
        title="Siguiente tema"
        className="lg:col-span-4 lg:row-start-2"
      >
        <Card
          title="Siguiente tema"
          actionLabel="Ver ideas"
          onAction={open("ideas")}
        >
          {suggestion ? (
            <>
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
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
              <Button className="mt-4 w-full" onClick={moveSuggestionToScript}>
                <Clapperboard className="h-4 w-4" aria-hidden="true" />
                Pasar a guion
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-fg">
              Sin ideas en el banco. Guárdalas en Ideas con su puntuación y
              aquí aparecerá la siguiente.
            </p>
          )}
        </Card>
      </Collapsible>

      {/* 5 · COLA: lo próximo a publicar, en orden. */}
      <Collapsible
        title="A continuación"
        className="lg:col-span-6 lg:row-start-3"
      >
        <Card
          title="A continuación"
          actionLabel="Ver pipeline"
          onAction={open("contenido")}
        >
          {queue.length === 0 ? (
            <p className="text-sm text-muted-fg">
              Cola vacía. Cuando agregues Reels al pipeline, aparecerán aquí
              en el orden en que toca publicarlos.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {queue.slice(0, 4).map((item) => (
                <li key={item.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-muted text-muted-fg">
                    <ListVideo className="h-4 w-4" aria-hidden="true" />
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
        </Card>
      </Collapsible>

      {/* 6 · CHECKLIST: lo que falta para que el Reel de hoy salga bien. */}
      <Collapsible
        title="Checklist de hoy"
        className="lg:col-span-6 lg:row-start-3"
      >
        <Card
          title="Checklist de hoy"
          actionLabel={`${doneCount} de ${ws.tasks.length}`}
          onAction={open("pendientes")}
        >
          {ws.tasks.length === 0 ? (
            <p className="text-sm text-muted-fg">
              Sin pendientes. Carga el checklist de publicación en Pendientes
              y marca cada paso conforme lo haces.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {pendingTasks.map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
                  <Switch
                    checked={t.done}
                    onChange={(next) => toggleTask(t.id, next)}
                    label={
                      t.done
                        ? `Marcar como pendiente: ${t.label}`
                        : `Marcar como hecho: ${t.label}`
                    }
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
        </Card>
      </Collapsible>

      {/* 7 · Los módulos, en una sola línea discreta: son detalle, no páginas. */}
      <nav
        aria-label="Módulos del panel"
        className="flex flex-wrap items-center gap-x-5 gap-y-1.5 px-1 py-1 lg:col-span-12 lg:row-start-4"
      >
        {MODULES.filter((m) => m.id !== "giveaway" || wsId === "evym").map(
          (m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => openModule(m.id)}
              className="cursor-pointer text-sm font-medium text-muted-fg transition-colors duration-200 ease-apple hover:text-primary"
            >
              {m.label}
            </button>
          ),
        )}
      </nav>
    </div>
  );
}
