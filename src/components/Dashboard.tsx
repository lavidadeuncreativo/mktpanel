"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  Clapperboard,
  Eye,
  Flame,
  Lightbulb,
  ListVideo,
  MessageSquare,
  Users,
} from "lucide-react";
import { usePanel, type ScreenId } from "./panel-context";
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
  metricSeries,
  nextSuggestedIdea,
  previousByNetwork,
  publishQueue,
  streak,
  todayDayIndex,
  todayReel,
  viewsSeriesByNetwork,
  viewsShare,
  weekPlan,
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
import { NetworkDonut, NETWORK_COLORS, Sparkline, ViewsLine } from "./charts";
import {
  Button,
  GroupedList,
  GroupedRow,
  Pill,
  RowChevron,
} from "./ui";
import { cn } from "./cn";

/* ------------------------------------------------------------------ */
/* Hoy como dashboard analítico (estilo shadcn, "fino"):             */
/*                                                                    */
/* - Fila de 4 KPIs con sparkline y delta vs la captura anterior.     */
/* - Gráfica de líneas de vistas en el tiempo + dona por red.         */
/* - Abajo: el Reel de hoy (la máquina), la semana, la cola y el      */
/*   siguiente tema.                                                  */
/*                                                                    */
/* Regla de honestidad: con una sola captura por red no hay deltas    */
/* ni tendencias — se muestra "Línea base" y el aviso de que falta    */
/* una segunda captura. Nunca se inventan números ni tendencias.      */
/* ------------------------------------------------------------------ */

const NEXT_STEP: Record<ContentStatus, { label: string; action: string }> = {
  idea: { label: "Escribe el guion", action: "Empezar guion" },
  guion: { label: "Prepara las imágenes", action: "Pasar a imágenes" },
  imagenes: { label: "Edita el video", action: "Pasar a edición" },
  edicion: { label: "Publícalo hoy", action: "Publicar hoy" },
  publicado: { label: "Publicado", action: "Publicado" },
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

function KpiCard({
  icon,
  label,
  value,
  delta,
  spark,
  sparkColor,
  breakdown,
  emptyNote,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  /** null → "Línea base" (solo existe una captura por red). */
  delta: { text: string; positive: boolean } | null;
  spark: { date: string; value: number }[];
  sparkColor: string;
  /** Desglose del total, una fila por red o por concepto: la etiqueta
     en gris a la izquierda y la cifra tabular en tinta a la derecha.
     Nada de cadenas unidas con puntos medios. */
  breakdown: { label: string; value: string }[];
  emptyNote: string;
}) {
  return (
    <div className="surface flex flex-col p-5">
      <div className="flex items-start justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-medium text-muted-fg">
          <span className="text-ink">{icon}</span>
          {label}
        </span>
        {delta ? (
          <Pill tone={delta.positive ? "green" : "red"}>
            {delta.positive ? (
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <ArrowDownRight className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {delta.text}
          </Pill>
        ) : (
          <Pill tone="neutral">Línea base</Pill>
        )}
      </div>
      <p className="mt-3 text-[30px] leading-none font-semibold tracking-[-0.02em] tabular-nums text-ink">
        {value}
      </p>
      <div className="mt-3">
        {spark.length >= 2 ? (
          <Sparkline data={spark} color={sparkColor} />
        ) : (
          <p className="flex h-10 items-center text-xs leading-snug text-muted-fg">
            {breakdown.length > 0
              ? "Sin tendencia todavía: falta una segunda captura."
              : emptyNote}
          </p>
        )}
      </div>
      {breakdown.length > 0 ? (
        <div className="mt-2 space-y-0.5">
          {breakdown.map((row) => (
            <p
              key={row.label}
              className="flex items-baseline justify-between gap-2 text-xs"
            >
              <span className="text-muted-fg">{row.label}</span>
              <span className="font-medium tabular-nums text-ink">
                {row.value}
              </span>
            </p>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted-fg">{emptyNote}</p>
      )}
    </div>
  );
}

export function Dashboard() {
  const { data, view, update, openScreen } = usePanel();
  const iso = useTodayIso();

  // "General" ya no se ofrece en la interfaz; si por algún estado
  // heredado llegara, se cae a EVYM.
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
  const hasData = ws.snapshots.length > 0;
  const hasSecondCapture = Object.keys(previous).length > 0;

  const deltaFor = (key: "views" | "followers" | "comments") => {
    const nets = Object.keys(latest) as (keyof typeof latest)[];
    if (nets.length === 0) return null;
    if (!nets.every((n) => previous[n])) return null;
    const cur = nets.reduce((s, n) => s + (latest[n]?.[key] ?? 0), 0);
    const prev = nets.reduce((s, n) => s + (previous[n]?.[key] ?? 0), 0);
    const text = formatDeltaPct(cur, prev);
    if (!text) return null;
    return { text, positive: cur >= prev };
  };

  const viewsDelta = deltaFor("views");
  const followersDelta = deltaFor("followers");
  const commentsDelta = deltaFor("comments");

  const viewsSeries = metricSeries(ws.snapshots, "views");
  const followersSeries = metricSeries(ws.snapshots, "followers");
  const commentsSeries = metricSeries(ws.snapshots, "comments");
  const lineSeries = viewsSeriesByNetwork(ws.snapshots);
  const share = viewsShare(ws.snapshots);
  const weekSlots = weekPlan(ws);

  const lastPublished = [...ws.content]
    .filter((c) => c.status === "publicado" && c.publishDate)
    .sort((a, b) => (b.publishDate ?? "").localeCompare(a.publishDate ?? ""))[0];

  const open = (s: ScreenId) => () => openScreen(s);

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
    openScreen("contenido");
  };

  const baselineNote =
    "Línea base: registra una segunda captura (o sincroniza con Meta en Conexiones) para ver la tendencia.";

  return (
    <div className="space-y-4">
      {/* Título de la vista */}
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-[24px] leading-tight font-semibold tracking-[-0.02em] text-ink">
            {formatDateLong(iso)}
          </h2>
          <p className="mt-0.5 text-sm text-muted-fg">
            {reel
              ? reel.status === "publicado"
                ? `Hoy ya salió: ${reel.title}.`
                : `Hoy toca publicar: ${reel.title}.`
              : "Hoy no hay Reel asignado."}
          </p>
        </div>
        <p className="text-sm text-muted-fg">
          {week.published} de 7 publicados esta semana
        </p>
      </div>

      {/* Fila de KPIs */}
      <section
        aria-label="Indicadores principales"
        className="grid grid-cols-2 gap-3 xl:grid-cols-4"
      >
        <KpiCard
          icon={<Eye className="h-4 w-4" aria-hidden="true" />}
          label="Vistas totales"
          value={formatNumber(totals.views)}
          delta={viewsDelta}
          spark={viewsSeries}
          sparkColor="#0071e3"
          breakdown={
            hasData
              ? totals.networksWithData.map((n) => ({
                  label: NETWORK_LABELS[n],
                  value: formatNumber(latest[n]?.views ?? 0),
                }))
              : []
          }
          emptyNote="Sin capturas todavía"
        />
        <KpiCard
          icon={<Users className="h-4 w-4" aria-hidden="true" />}
          label="Seguidores"
          value={formatNumber(totals.followers)}
          delta={followersDelta}
          spark={followersSeries}
          sparkColor="#1d1d1f"
          breakdown={
            hasData
              ? totals.networksWithData.map((n) => ({
                  label: NETWORK_LABELS[n],
                  value: formatNumber(latest[n]?.followers ?? 0),
                }))
              : []
          }
          emptyNote="Sin capturas todavía"
        />
        <KpiCard
          icon={<MessageSquare className="h-4 w-4" aria-hidden="true" />}
          label="Comentarios"
          value={formatNumber(totals.comments)}
          delta={commentsDelta}
          spark={commentsSeries}
          sparkColor="#1d1d1f"
          breakdown={
            hasData
              ? [
                  {
                    label: "Reacciones",
                    value: formatNumber(totals.reactions),
                  },
                  {
                    label: "Compartidos",
                    value: formatNumber(totals.shares),
                  },
                ]
              : []
          }
          emptyNote="Sin capturas todavía"
        />
        <div className="surface flex flex-col p-5">
          <div className="flex items-start justify-between gap-2">
            <span className="flex items-center gap-2 text-sm font-medium text-muted-fg">
              <span className="text-ink">
                <Flame className="h-4 w-4" aria-hidden="true" />
              </span>
              Racha
            </span>
            <Pill tone={streakCount > 0 ? "green" : "neutral"}>
              {streakCount > 0 ? "Activa" : "Sin racha"}
            </Pill>
          </div>
          <p className="mt-3 text-[30px] leading-none font-semibold tracking-[-0.02em] tabular-nums text-ink">
            {streakCount}{" "}
            <span className="text-lg font-medium text-muted-fg">
              {streakCount === 1 ? "día" : "días"}
            </span>
          </p>
          <div className="mt-3 flex h-10 items-center gap-1.5">
            {weekSlots.map(({ dayIndex, item }) => (
              <span
                key={dayIndex}
                title={`${WEEK_DAYS[dayIndex]}: ${item ? item.title : "Sin tema"}`}
                className={cn(
                  "h-2.5 w-2.5 rounded-full",
                  item?.status === "publicado"
                    ? "bg-accent"
                    : item
                      ? "bg-[#d2d2d7]"
                      : "bg-[#e8e8ed]",
                )}
                aria-hidden="true"
              />
            ))}
            <span className="ml-1 text-xs text-muted-fg">
              publicados esta semana
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-fg">
            {streakCount === 0
              ? "Publica hoy y empieza la racha."
              : "Publica hoy para mantenerla."}
          </p>
        </div>
      </section>

      {/* Gráficas: línea 2:1 dona */}
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="surface p-5 sm:p-6 lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold tracking-[-0.01em] text-ink">
                Vistas en el tiempo
              </h3>
              <p className="mt-0.5 text-sm text-muted-fg">
                {hasData
                  ? "Según tus capturas registradas."
                  : "Registra tu primera captura para ver la curva."}
              </p>
            </div>
            {hasData ? (
              <div className="flex gap-3 text-xs text-muted-fg">
                {totals.networksWithData.map((n) => (
                  <span key={n} className="flex items-center gap-1.5">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: NETWORK_COLORS[n] }}
                      aria-hidden="true"
                    />
                    {NETWORK_LABELS[n]}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          {hasData ? (
            <ViewsLine series={lineSeries} />
          ) : (
            <p className="py-10 text-center text-sm text-muted-fg">
              Sin capturas todavía. Regístralas en Métricas o sincroniza con
              Meta en Conexiones.
            </p>
          )}
          {hasData && !hasSecondCapture ? (
            <p className="mt-2 text-xs text-muted-fg">{baselineNote}</p>
          ) : null}
        </div>

        <div className="surface p-5 sm:p-6">
          <h3 className="text-base font-semibold tracking-[-0.01em] text-ink">
            Vistas por red
          </h3>
          <p className="mt-0.5 text-sm text-muted-fg">
            Distribución de la última captura.
          </p>
          {share.length > 0 ? (
            <>
              <NetworkDonut
                segments={share.map((s) => ({
                  network: s.network,
                  label: NETWORK_LABELS[s.network],
                  views: s.views,
                  pct: s.pct,
                }))}
              />
              <ul className="mt-1 divide-y divide-line">
                {share.map((s) => (
                  <li
                    key={s.network}
                    className="flex items-center gap-2.5 py-2 text-sm"
                  >
                    <span
                      className="h-3 w-3 shrink-0 rounded-[3px]"
                      style={{ backgroundColor: NETWORK_COLORS[s.network] }}
                      aria-hidden="true"
                    />
                    <span className="flex-1 text-ink">
                      {NETWORK_LABELS[s.network]}
                    </span>
                    <span className="text-muted-fg tabular-nums">
                      {formatNumber(s.views)}
                    </span>
                    <span className="w-12 text-right font-semibold tabular-nums text-ink">
                      {s.pct.toFixed(0)}%
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="py-10 text-center text-sm text-muted-fg">
              Sin vistas registradas todavía.
            </p>
          )}
        </div>
      </section>

      {/* Fila inferior: la máquina + la semana + la cola */}
      <section className="grid gap-4 lg:grid-cols-3">
        {/* Reel de hoy: la acción principal de la máquina */}
        <div className="surface flex flex-col p-5 sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-semibold tracking-[-0.01em] text-ink">
              Reel de hoy
            </h3>
            {reel ? (
              <Pill tone={reel.status === "publicado" ? "green" : "blue"}>
                {STATUS_LABELS[reel.status]}
              </Pill>
            ) : null}
          </div>
          {reel ? (
            <>
              <p className="mt-3 text-[20px] leading-snug font-semibold tracking-[-0.01em] text-ink">
                {reel.title}
              </p>
              <p className="mt-1 text-sm text-muted-fg">{step?.label}</p>
              <p className="mt-1 text-sm text-muted-fg">
                {reel.publishDate
                  ? `Publicado el ${formatDateShort(reel.publishDate)}`
                  : "Sin fecha de publicación"}
                {reel.views !== null
                  ? `, ${formatNumber(reel.views)} reproducciones`
                  : ""}
              </p>
              <div className="mt-4 flex flex-1 flex-col justify-end">
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
                  className="mt-1 flex min-h-11 w-full cursor-pointer items-center justify-center gap-1 text-[15px] font-medium text-primary transition-opacity duration-200 ease-apple hover:opacity-70"
                >
                  Ver pipeline
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <p className="mt-3 border-t border-line/70 pt-3 text-sm text-muted-fg">
                {lastPublished ? (
                  <>
                    Lo último:{" "}
                    <span className="font-medium text-ink">
                      {lastPublished.title}
                    </span>
                  </>
                ) : (
                  "Todavía no hay Reels publicados en este espacio."
                )}
              </p>
            </>
          ) : (
            <>
              <p className="mt-3 text-[20px] leading-snug font-semibold tracking-[-0.01em] text-ink">
                Hoy no hay Reel asignado
              </p>
              <p className="mt-1 text-sm text-muted-fg">
                Agrega un Reel al pipeline o pasa una idea a guion y el día
                queda cubierto.
              </p>
              <div className="mt-4 flex flex-1 flex-col justify-end">
                <Button size="lg" onClick={open("contenido")}>
                  Agregar Reel al pipeline
                </Button>
              </div>
            </>
          )}
        </div>

        {/* La semana */}
        <div>
          <div className="mb-2 flex items-baseline justify-between px-1">
            <h3 className="text-sm font-semibold text-ink">La semana</h3>
            <span className="text-xs text-muted-fg">
              {week.published} de 7
            </span>
          </div>
          <WeekPlan
            ws={ws}
            today={today}
            onSelect={() => openScreen("contenido")}
          />
        </div>

        {/* Cola + siguiente tema */}
        <div className="space-y-4">
          <div>
            <div className="mb-2 flex items-baseline justify-between px-1">
              <h3 className="text-sm font-semibold text-ink">A continuación</h3>
              <button
                type="button"
                onClick={open("contenido")}
                className="cursor-pointer text-xs font-medium text-primary transition-opacity duration-200 ease-apple hover:opacity-70"
              >
                Ver pipeline
              </button>
            </div>
            <GroupedList>
              {queue.length === 0 ? (
                <GroupedRow
                  title="Cola vacía"
                  subtitle="Agrega Reels al pipeline y aparecerán aquí en orden."
                />
              ) : (
                queue.slice(0, 3).map((item, i) => (
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
                ))
              )}
            </GroupedList>
          </div>

          <div>
            <div className="mb-2 px-1">
              <h3 className="text-sm font-semibold text-ink">Siguiente tema</h3>
            </div>
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
                  className="mt-1 flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 text-[15px] font-medium text-primary transition-opacity duration-200 ease-apple hover:opacity-70"
                >
                  <Clapperboard className="h-5 w-5" aria-hidden="true" />
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
          </div>
        </div>
      </section>
    </div>
  );
}
