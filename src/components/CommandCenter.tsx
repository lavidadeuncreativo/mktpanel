"use client";

import type { ReactNode } from "react";
import {
  BarChart3,
  BookOpen,
  Check,
  CheckSquare,
  ChevronRight,
  Clapperboard,
  Flame,
  Gift,
  LayoutDashboard,
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
import {
  Button,
  GroupedList,
  GroupedRow,
  RowChevron,
  SectionHeader,
  SwitchVisual,
} from "./ui";
import { cn } from "./cn";

/* ------------------------------------------------------------------ */
/* UX estilo iOS de verdad, no solo colores Apple:                    */
/*                                                                    */
/* - Large Title "Hoy" + fecha: al abrir se sabe en un segundo en     */
/*   qué pantalla estás.                                              */
/* - Un héroe, no una rejilla de iguales: el Reel del día domina y    */
/*   tiene UNA sola acción principal (botón azul grande y lleno).     */
/* - Listas agrupadas estilo Ajustes: la semana, la cola, el          */
/*   checklist y "Más" son filas de 44pt con separadores inset.       */
/*   Lo tocable lleva chevron o switch; lo demás es texto plano.      */
/* - El número: un solo numeral dominante, lo demás pequeño y gris.   */
/* - Color semántico y nada más: azul = acción, verde = hecho,        */
/*   rojo = atención, gris = secundario.                              */
/*                                                                    */
/* La columna izquierda (héroe + número) nunca se mueve; la derecha   */
/* (las listas) tiene su propio scroll interno. En móvil todo fluye   */
/* en una columna y la acción principal es lo primero que se ve.      */
/* ------------------------------------------------------------------ */

const NEXT_STEP: Record<ContentStatus, { label: string; action: string }> = {
  idea: { label: "Escribe el guion", action: "Empezar guion" },
  guion: { label: "Prepara las imágenes", action: "Pasar a imágenes" },
  imagenes: { label: "Edita el video", action: "Pasar a edición" },
  edicion: { label: "Publícalo hoy", action: "Publicar hoy" },
  publicado: { label: "Publicado", action: "Publicado" },
};

const MODULE_ICONS: Record<ModuleId, ReactNode> = {
  resumen: <LayoutDashboard className="h-[18px] w-[18px]" aria-hidden="true" />,
  metricas: <BarChart3 className="h-[18px] w-[18px]" aria-hidden="true" />,
  contenido: <ListVideo className="h-[18px] w-[18px]" aria-hidden="true" />,
  ideas: <Lightbulb className="h-[18px] w-[18px]" aria-hidden="true" />,
  giveaway: <Gift className="h-[18px] w-[18px]" aria-hidden="true" />,
  pendientes: <CheckSquare className="h-[18px] w-[18px]" aria-hidden="true" />,
  bitacora: <BookOpen className="h-[18px] w-[18px]" aria-hidden="true" />,
};

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
    <div className="mx-auto flex w-full max-w-[1200px] flex-col px-4 pt-2 pb-10 sm:px-6 lg:grid lg:h-full lg:grid-rows-[auto_minmax(0,1fr)] lg:overflow-hidden lg:pb-0 lg:pt-4">
      {/* Large Title: en un segundo se sabe en qué pantalla estás. */}
      <div className="pb-4">
        <h1 className="text-[34px] leading-[1.1] font-bold tracking-[-0.02em] text-ink">
          Hoy
        </h1>
        <p className="mt-1 text-[15px] text-muted-fg">
          {formatDateLong(iso)}
        </p>
      </div>

      <div className="flex min-h-0 flex-col gap-7 lg:grid lg:grid-cols-12 lg:gap-10">
        {/* Izquierda: el héroe y el número. Nunca se mueven. */}
        <div className="flex min-h-0 flex-col gap-7 lg:col-span-7 lg:overflow-y-auto lg:pr-1 lg:pb-6 scroll-thin">
          {/* HÉROE: la única superficie grande. Una sola acción principal. */}
          <section
            aria-label="Reel de hoy"
            className="rounded-[28px] border border-line/60 bg-white p-6 sm:p-7"
          >
            {reel ? (
              <>
                <p className="flex items-center gap-2 text-[15px] font-medium text-muted-fg">
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      reel.status === "publicado"
                        ? "bg-accent"
                        : "bg-primary",
                    )}
                    aria-hidden="true"
                  />
                  {STATUS_LABELS[reel.status]}
                  {reel.publishDate
                    ? ` · ${formatDateShort(reel.publishDate)}`
                    : ""}
                </p>
                <h2 className="mt-3 text-[26px] leading-[1.15] font-bold tracking-[-0.02em] text-ink sm:text-[30px]">
                  {reel.title}
                </h2>
                <p className="mt-2 text-[17px] leading-snug text-muted-fg">
                  {step?.label}
                </p>
                <div className="mt-6">
                  {reel.status !== "publicado" ? (
                    <Button size="lg" onClick={() => advance(reel, wsId, update)}>
                      {step?.action}
                    </Button>
                  ) : (
                    <Button size="lg" onClick={open("metricas")}>
                      Registrar métricas del Reel
                    </Button>
                  )}
                  <button
                    type="button"
                    onClick={open("contenido")}
                    className="mt-1 flex min-h-11 w-full cursor-pointer items-center justify-center gap-1 text-[17px] font-medium text-primary transition-opacity duration-200 ease-apple hover:opacity-70"
                  >
                    Ver pipeline
                    <ChevronRight
                      className="h-5 w-5"
                      aria-hidden="true"
                    />
                  </button>
                </div>
                <div className="mt-5 space-y-1.5 border-t border-line/70 pt-4">
                  <p className="flex items-center gap-2 text-[15px] text-muted-fg">
                    <Flame className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {streakCount === 0
                      ? "Sin racha todavía — publica hoy y empieza una."
                      : streakCount === 1
                        ? "Racha: 1 día publicando"
                        : `Racha: ${streakCount} días publicando`}
                  </p>
                  <p className="text-[15px] text-muted-fg">
                    {lastPublished ? (
                      <>
                        Lo último:{" "}
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
              </>
            ) : (
              <>
                <h2 className="text-[26px] leading-[1.15] font-bold tracking-[-0.02em] text-ink sm:text-[30px]">
                  Hoy no hay Reel asignado
                </h2>
                <p className="mt-2 text-[17px] leading-snug text-muted-fg">
                  Agrega un Reel al pipeline o pasa una idea a guion y el día
                  queda cubierto.
                </p>
                <div className="mt-6">
                  <Button size="lg" onClick={open("contenido")}>
                    Agregar Reel al pipeline
                  </Button>
                  <button
                    type="button"
                    onClick={open("ideas")}
                    className="mt-1 flex min-h-11 w-full cursor-pointer items-center justify-center gap-1 text-[17px] font-medium text-primary transition-opacity duration-200 ease-apple hover:opacity-70"
                  >
                    Ver banco de ideas
                    <ChevronRight
                      className="h-5 w-5"
                      aria-hidden="true"
                    />
                  </button>
                </div>
              </>
            )}
          </section>

          {/* EL NÚMERO: tipografía, no tarjeta. Un solo numeral dominante. */}
          <section aria-label="El número" className="border-t border-line/70 pt-5">
            <p className="text-[56px] leading-none font-bold tracking-[-0.02em] text-ink sm:text-[64px]">
              {formatNumber(totals.views)}
            </p>
            <p className="mt-2 text-[17px] font-medium text-ink">
              vistas en total
            </p>
            <p className="mt-1 text-[15px] text-muted-fg">
              {formatNumber(totals.followers)} seguidores
              {totals.networksWithData.length > 0
                ? ` · ${totals.networksWithData
                    .map(
                      (n) =>
                        `${NETWORK_LABELS[n]} ${formatNumber(latest[n]?.views ?? 0)}`,
                    )
                    .join(" · ")}`
                : ""}
            </p>
            <p className="mt-3 text-[15px]">
              {viewsDelta === null ? (
                <span className="text-muted-fg">
                  Línea base. Registra una segunda captura y aquí verás si
                  subes o bajas.
                </span>
              ) : (
                <span
                  className={
                    curViews >= prevViews
                      ? "font-semibold text-accent-text"
                      : "font-semibold text-danger-text"
                  }
                >
                  Vistas {viewsDelta} vs la captura anterior.
                </span>
              )}
            </p>
            <p className="mt-1.5 text-[15px] font-medium text-ink">
              {reel
                ? reel.status === "publicado"
                  ? `Hoy ya salió: ${reel.title}.`
                  : `Hoy toca publicar: ${reel.title}.`
                : "Hoy no hay Reel asignado."}
            </p>
            {totals.networksWithData.length === 0 ? (
              <p className="mt-1 text-[15px] text-muted-fg">
                Sin capturas todavía. Registra la primera en Métricas.
              </p>
            ) : null}
          </section>
        </div>

        {/* Derecha: listas agrupadas estilo Ajustes. */}
        <div className="flex min-h-0 flex-col gap-6 lg:col-span-5 lg:overflow-y-auto lg:pr-1 lg:pb-6 scroll-thin">
          <section aria-label="La semana">
            <SectionHeader
              title="La semana"
              meta={`${week.published} de 7`}
            />
            <WeekPlan
              ws={ws}
              today={today}
              onSelect={() => openModule("contenido")}
            />
          </section>

          <section aria-label="Siguiente tema">
            <SectionHeader title="Siguiente tema" />
            {suggestion ? (
              <>
                <GroupedList>
                  <GroupedRow
                    icon={
                      <Lightbulb
                        className="h-[18px] w-[18px]"
                        aria-hidden="true"
                      />
                    }
                    title={suggestion.title}
                    subtitle={`${suggestion.score} de 10${
                      suggestion.notes ? ` — ${suggestion.notes}` : ""
                    }`}
                    accessory={<RowChevron />}
                    onClick={open("ideas")}
                    ariaLabel={`Ver idea: ${suggestion.title}`}
                  />
                </GroupedList>
                <button
                  type="button"
                  onClick={moveSuggestionToScript}
                  className="mt-1 flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 text-[17px] font-medium text-primary transition-opacity duration-200 ease-apple hover:opacity-70"
                >
                  <Clapperboard
                    className="h-5 w-5"
                    aria-hidden="true"
                  />
                  Pasar a guion
                </button>
              </>
            ) : (
              <GroupedList>
                <GroupedRow
                  title="Sin ideas en el banco"
                  subtitle="Guárdalas en Ideas con su puntuación y aquí aparecerá la siguiente."
                />
              </GroupedList>
            )}
          </section>

          <section aria-label="A continuación">
            <SectionHeader title="A continuación" />
            <GroupedList>
              {queue.length === 0 ? (
                <GroupedRow
                  title="Cola vacía"
                  subtitle="Agrega Reels al pipeline y aparecerán aquí en orden."
                />
              ) : (
                <>
                  {queue.slice(0, 3).map((item, i) => (
                    <GroupedRow
                      key={item.id}
                      divider={i > 0}
                      icon={
                        <ListVideo
                          className="h-[18px] w-[18px]"
                          aria-hidden="true"
                        />
                      }
                      title={item.title}
                      subtitle={`${item.dayIndex !== null ? WEEK_DAYS[item.dayIndex] : "Sin día asignado"}${
                        item.publishDate
                          ? ` — ${formatDateShort(item.publishDate)}`
                          : ""
                      }`}
                      accessory={
                        item.status === "publicado" ? (
                          <Check
                            className="h-5 w-5 shrink-0 text-accent"
                            aria-hidden="true"
                          />
                        ) : (
                          <RowChevron />
                        )
                      }
                      onClick={open("contenido")}
                      ariaLabel={`Abrir pipeline: ${item.title}`}
                    />
                  ))}
                  <GroupedRow
                    divider
                    title="Ver pipeline"
                    titleClassName="text-primary"
                    accessory={<RowChevron />}
                    onClick={open("contenido")}
                    ariaLabel="Ver pipeline completo"
                  />
                </>
              )}
            </GroupedList>
          </section>

          <section aria-label="Checklist de hoy">
            <SectionHeader
              title="Checklist de hoy"
              meta={`${doneCount} de ${ws.tasks.length}`}
            />
            {ws.tasks.length === 0 ? (
              <GroupedList>
                <GroupedRow
                  title="Sin pendientes"
                  subtitle="Carga el checklist de publicación en Pendientes."
                />
              </GroupedList>
            ) : (
              <GroupedList>
                {pendingTasks.map((t, i) => (
                  <GroupedRow
                    key={t.id}
                    divider={i > 0}
                    title={t.label}
                    titleClassName={
                      t.done ? "text-muted-fg line-through" : undefined
                    }
                    onClick={() => toggleTask(t.id, !t.done)}
                    ariaLabel={
                      t.done
                        ? `Marcar como pendiente: ${t.label}`
                        : `Marcar como hecho: ${t.label}`
                    }
                    accessory={<SwitchVisual checked={t.done} />}
                  />
                ))}
                <GroupedRow
                  divider
                  title="Ver pendientes"
                  titleClassName="text-primary"
                  accessory={<RowChevron />}
                  onClick={open("pendientes")}
                  ariaLabel="Ver pendientes"
                />
              </GroupedList>
            )}
          </section>

          <section aria-label="Más">
            <SectionHeader title="Más" />
            <GroupedList>
              {MODULES.filter(
                (m) => m.id !== "giveaway" || wsId === "evym",
              ).map((m, i) => (
                <GroupedRow
                  key={m.id}
                  divider={i > 0}
                  icon={MODULE_ICONS[m.id]}
                  title={m.label}
                  accessory={<RowChevron />}
                  onClick={() => openModule(m.id)}
                  ariaLabel={`Abrir ${m.label}`}
                />
              ))}
            </GroupedList>
          </section>
        </div>
      </div>
    </div>
  );
}
