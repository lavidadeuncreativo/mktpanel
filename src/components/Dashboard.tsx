"use client";

import { useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  Clapperboard,
  Eye,
  Flame,
  MessageSquare,
  Sparkles,
  Users,
} from "lucide-react";
import { usePanel } from "./panel-context";
import { Briefing } from "./Briefing";
import { GeneralDashboard } from "./GeneralDashboard";
import type { WorkspaceId } from "@/lib/types";
import { STATUS_LABELS, WEEK_DAYS } from "@/lib/types";
import {
  nextSuggestedIdea,
  previousByNetwork,
  publishQueue,
  streak,
  weeklyProgress,
  workspaceTotals,
} from "@/lib/derive";
import {
  formatDateShort,
  formatDeltaPct,
  formatNumber,
  uid,
} from "@/lib/store";
import { useTodayIso } from "./useToday";
import { ViewsBars } from "./charts";
import {
  AnimatedNumber,
  Button,
  EmptyState,
  Pill,
  Progress,
} from "./ui";
import { cn } from "./cn";

/* ------------------------------------------------------------------ */
/* Hoy es el dashboard estilo fintech (la referencia que compartió     */
/* Israel: héroe con degradado cálido, saludo grande, tarjeta de      */
/* resumen en vidrio, Overview con barras, 4 tarjetas de métricas,    */
/* actividad reciente y crecimiento semanal). Mapeo dinero →           */
/* contenido: Deposit → Nuevo Reel, Withdraw → Registrar captura,      */
/* la tarjeta VISA → resumen de vistas + seguidores, las categorías    */
/* (Groceries, Clothes…) → Vistas / Seguidores / Comentarios / Racha, */
/* Transactions → Reels publicados, Investment → progreso semanal.     */
/* Todo con datos REALES del store: nada inventado, deltas solo con    */
/* segunda captura. El agente sigue existiendo: vive en la barra       */
/* lateral ("Agente") y en la tira de entrada al final del dashboard.  */
/* ------------------------------------------------------------------ */

/** Línea de delta estilo referencia: texto pequeño con flecha, no píldora.
 *  Sin segunda captura → "Línea base"; sin ninguna captura → "Sin datos"
 *  (nunca se sugiere que exista una captura cuando no hay ninguna). */
function DeltaLine({
  delta,
  noData,
  line,
}: {
  delta: string | null;
  noData: boolean;
  line?: string;
}) {
  if (noData) {
    return <p className="mt-2 text-[13px] text-muted-fg">Sin datos</p>;
  }
  if (delta) {
    const up = delta.startsWith("+");
    return (
      <p
        className={cn(
          "mt-2 flex items-center gap-1 text-[13px] font-medium",
          up ? "text-accent" : "text-danger",
        )}
      >
        {up ? (
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <ArrowDownRight className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        {delta} vs. captura anterior
      </p>
    );
  }
  if (line) {
    return <p className="mt-2 text-[13px] text-muted-fg">{line}</p>;
  }
  return <p className="mt-2 text-[13px] text-muted-fg">Línea base</p>;
}

function MetricCard({
  icon,
  label,
  value,
  delta,
  noData,
  line,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  delta: string | null;
  noData: boolean;
  line?: string;
}) {
  return (
    <div className="surface surface-hover p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-muted-fg">{label}</p>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-control text-muted-fg">
          {icon}
        </span>
      </div>
      <p className="mt-2 text-[28px] leading-none font-semibold tracking-[-0.02em] tabular-nums text-ink">
        <AnimatedNumber value={value} format={formatNumber} />
      </p>
      <DeltaLine delta={delta} noData={noData} line={line} />
    </div>
  );
}

export function Dashboard() {
  const { data, view, openScreen, update } = usePanel();
  const iso = useTodayIso();
  const wsId: WorkspaceId = view === "general" ? "evym" : view;
  const ws = data[wsId];
  const totals = workspaceTotals(ws);
  const previous = previousByNetwork(ws.snapshots);
  const prevValues = Object.values(previous);
  const prevViews = prevValues.reduce((s, p) => s + (p?.views ?? 0), 0);
  const prevFollowers = prevValues.reduce(
    (s, p) => s + (p?.followers ?? 0),
    0,
  );
  const prevComments = prevValues.reduce(
    (s, p) => s + (p?.comments ?? 0),
    0,
  );
  const viewsDelta = formatDeltaPct(totals.views, prevViews);
  const followersDelta = formatDeltaPct(totals.followers, prevFollowers);
  const commentsDelta = formatDeltaPct(totals.comments, prevComments);
  const hasSnapshots = ws.snapshots.length > 0;
  // A second capture exists for at least one network: the bars already
  // show a trend, so the "registra una segunda captura" hint must hide.
  const hasSecondCapture = Object.values(previous).some((p) => p !== null);
  const lastCaptureDate =
    hasSnapshots
      ? [...ws.snapshots].sort((a, b) => b.date.localeCompare(a.date))[0].date
      : null;
  const week = weeklyProgress(ws);
  const streakCount = streak(ws, iso);
  const topIdea = nextSuggestedIdea(ws);
  const published = publishQueue(ws).filter(
    (c) => c.status === "publicado",
  );

  // Fechas reales de captura, para el selector de periodo del Resumen.
  const captureDates = [...new Set(ws.snapshots.map((s) => s.date))].sort();
  const [overviewDate, setOverviewDate] = useState("all");
  const overviewSnapshots =
    overviewDate === "all"
      ? ws.snapshots
      : ws.snapshots.filter((s) => s.date === overviewDate);

  // La vista general ya no es EVYM disfrazado: tiene su propio
  // dashboard agregado (totales, briefing agregado, una tarjeta por
  // cuenta y "Qué publicar"). El resto de este componente es solo el
  // Hoy por espacio, y queda exactamente igual.
  if (view === "general") {
    return <GeneralDashboard />;
  }

  // Días de la semana con un Reel publicado (mini barras de crecimiento).
  const publishedDays = new Set(
    ws.content
      .filter((c) => c.status === "publicado" && c.dayIndex !== null)
      .map((c) => c.dayIndex as number),
  );

  const wsName =
    wsId === "evym"
      ? "Entre Vivos y Muertos"
      : wsId === "antojo"
        ? "Antojo"
        : "Perfil personal";

  const moveTopIdeaToScript = () => {
    if (!topIdea) return;
    update((d) => ({
      ...d,
      [wsId]: {
        ...d[wsId],
        ideas: d[wsId].ideas.filter((i) => i.id !== topIdea.id),
        content: [
          ...d[wsId].content,
          {
            id: uid(),
            title: topIdea.title,
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

  return (
    <div className="space-y-4">
      {/* ---------- Héroe: el degradado animado ya es el fondo de la
           página en Hoy (ver page.tsx); aquí solo van el saludo grande,
           las acciones y la tarjeta de resumen en vidrio, como en la
           referencia. ---------- */}
      <section aria-label="Resumen del día" className="relative px-2 pt-4 pb-6 text-white sm:px-4">
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-white/80">
              Esto es lo que tienes hoy en {wsName}.
            </p>
            <h2 className="mt-1 text-[52px] leading-[1.05] font-semibold tracking-[-0.02em] text-white sm:text-[56px]">
              Hola, Isra
            </h2>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => openScreen("contenido")}
                className="flex h-11 cursor-pointer items-center gap-2 rounded-full bg-white px-5 text-[15px] font-semibold text-ink transition-opacity duration-200 ease-apple hover:opacity-85"
              >
                <Clapperboard className="h-4 w-4" aria-hidden="true" />
                Nuevo Reel
              </button>
              <button
                type="button"
                onClick={() => openScreen("metricas")}
                className="flex h-11 cursor-pointer items-center gap-2 rounded-full border border-white/40 bg-white/10 px-5 text-[15px] font-semibold text-white backdrop-blur-sm transition-colors duration-200 ease-apple hover:bg-white/20"
              >
                Registrar captura
              </button>
            </div>
          </div>

          {/* Tarjeta de resumen en vidrio, con tarjetas apiladas detrás
              (profundidad, como en la referencia). */}
          <div className="relative w-full max-w-[320px] shrink-0">
            <div
              aria-hidden="true"
              className="absolute inset-x-3 -top-3 h-full rotate-[2deg] rounded-[16px] border border-white/15 bg-white/10"
            />
            <div
              aria-hidden="true"
              className="absolute inset-x-1.5 -top-1.5 h-full -rotate-[1.5deg] rounded-[16px] border border-white/20 bg-white/10"
            />
            <div className="relative rounded-[16px] border border-white/25 bg-white/15 p-5 backdrop-blur-md">
            {hasSnapshots ? (
              <>
                <p className="text-[13px] font-medium text-white/80">
                  Vistas totales
                </p>
                <p className="mt-1 text-[34px] leading-none font-semibold tracking-[-0.02em] tabular-nums text-white">
                  <AnimatedNumber value={totals.views} format={formatNumber} />
                </p>
                <p className="mt-2 text-sm text-white/85">
                  <AnimatedNumber
                    value={totals.followers}
                    format={formatNumber}
                  />{" "}
                  seguidores
                </p>
                <div className="mt-3 flex items-center gap-2">
                  {viewsDelta ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold text-white">
                      {viewsDelta.startsWith("+") ? (
                        <ArrowUpRight
                          className="h-3.5 w-3.5"
                          aria-hidden="true"
                        />
                      ) : (
                        <ArrowDownRight
                          className="h-3.5 w-3.5"
                          aria-hidden="true"
                        />
                      )}
                      {viewsDelta} este periodo
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold text-white">
                      Línea base
                    </span>
                  )}
                </div>
                {lastCaptureDate ? (
                  <p className="mt-2 text-xs text-white/70">
                    Última captura: {formatDateShort(lastCaptureDate)}
                  </p>
                ) : null}
              </>
            ) : (
              <>
                <p className="text-[15px] font-semibold text-white">
                  Todavía no hay métricas
                </p>
                <p className="mt-1 text-sm text-white/85">
                  Registra tu primera captura y el resumen aparece aquí.
                </p>
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => openScreen("metricas")}
                    className="flex h-10 cursor-pointer items-center rounded-full bg-white px-4 text-sm font-semibold text-ink transition-opacity duration-200 ease-apple hover:opacity-85"
                  >
                    Registrar captura
                  </button>
                </div>
              </>
            )}
            </div>
          </div>
        </div>

        {/* El briefing de Jarvis: qué pasó, qué toca hoy, cómo va la
            semana y una recomendación — todo derivado del store en cada
            render. Vive dentro del héroe, en vidrio, sobre el degradado. */}
        <Briefing ws={ws} wsId={wsId} iso={iso} />
      </section>

      {/* ---------- Resumen + 4 tarjetas de métricas ---------- */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="surface surface-hover p-5 lg:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold tracking-[-0.01em] text-ink">
                Resumen
              </h3>
              <p className="mt-1 text-[40px] leading-none font-semibold tracking-[-0.02em] tabular-nums text-ink">
                <AnimatedNumber value={totals.views} format={formatNumber} />
              </p>
              <p className="mt-1.5 text-sm text-muted-fg">
                Vistas por captura registrada.
              </p>
            </div>
            {hasSnapshots ? (
              <div className="relative shrink-0">
                <label htmlFor="overview-period" className="sr-only">
                  Periodo del resumen
                </label>
                <select
                  id="overview-period"
                  value={overviewDate}
                  onChange={(e) => setOverviewDate(e.target.value)}
                  className="h-9 cursor-pointer appearance-none rounded-full border border-line bg-control pr-8 pl-3.5 text-sm font-medium text-ink focus:border-primary focus:outline-none"
                >
                  <option value="all">Todas las capturas</option>
                  {captureDates.map((d) => (
                    <option key={d} value={d}>
                      {formatDateShort(d)}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-muted-fg"
                  aria-hidden="true"
                />
              </div>
            ) : null}
          </div>
          {hasSnapshots ? (
            <>
              <ViewsBars snapshots={overviewSnapshots} />
              {!hasSecondCapture ? (
                <p className="text-[13px] text-muted-fg">
                  Línea base: registra una segunda captura (o sincroniza con
                  Meta en Conexiones) para ver la tendencia.
                </p>
              ) : null}
            </>
          ) : (
            <div className="pt-4">
              <EmptyState
                title="Sin capturas todavía"
                description="Registra tu primera captura de Business Suite y la gráfica aparece aquí."
                action={
                  <Button onClick={() => openScreen("metricas")}>
                    Registrar captura
                  </Button>
                }
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <MetricCard
            icon={<Eye className="h-4 w-4" aria-hidden="true" />}
            label="Vistas"
            value={totals.views}
            delta={viewsDelta}
            noData={!hasSnapshots}
          />
          <MetricCard
            icon={<Users className="h-4 w-4" aria-hidden="true" />}
            label="Seguidores"
            value={totals.followers}
            delta={followersDelta}
            noData={!hasSnapshots}
          />
          <MetricCard
            icon={<MessageSquare className="h-4 w-4" aria-hidden="true" />}
            label="Comentarios"
            value={totals.comments}
            delta={commentsDelta}
            noData={!hasSnapshots}
          />
          <MetricCard
            icon={<Flame className="h-4 w-4" aria-hidden="true" />}
            label="Racha"
            value={streakCount}
            delta={null}
            noData={!hasSnapshots}
            line={
              streakCount > 0
                ? "Publica hoy para mantenerla"
                : "Publica para empezar tu racha"
            }
          />
        </div>
      </div>

      {/* ---------- Actividad reciente + crecimiento semanal ---------- */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="surface overflow-hidden lg:col-span-2">
          <div className="flex items-center justify-between gap-3 px-5 py-4">
            <h3 className="text-base font-semibold tracking-[-0.01em] text-ink">
              Actividad reciente
            </h3>
            <button
              type="button"
              onClick={() => openScreen("contenido")}
              className="flex cursor-pointer items-center gap-1 text-sm font-medium text-primary transition-opacity duration-200 ease-apple hover:opacity-70"
            >
              Ver todo
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          {published.length === 0 ? (
            <p className="border-t border-line px-5 py-5 text-sm text-muted-fg">
              Todavía no hay Reels publicados. Agrega uno al pipeline y
              aparece aquí.
            </p>
          ) : (
            <ul>
              {published.slice(0, 5).map((item, i) => (
                <li
                  key={item.id}
                  className={cn(
                    "flex items-center gap-3 px-5 py-3.5",
                    i > 0 && "border-t border-line/70",
                  )}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-control text-muted-fg">
                    <Clapperboard className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium text-ink">
                      {item.title}
                    </span>
                    <span className="block text-[13px] text-muted-fg">
                      {item.publishDate
                        ? formatDateShort(item.publishDate)
                        : "Sin fecha"}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-[15px] leading-tight font-semibold tabular-nums text-ink">
                      {item.views !== null
                        ? formatNumber(item.views)
                        : "—"}
                    </span>
                    <span className="block text-xs text-muted-fg">
                      vistas
                    </span>
                  </span>
                  <Pill tone="green">
                    {STATUS_LABELS[item.status]}
                  </Pill>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="surface surface-hover p-5">
          <h3 className="text-base font-semibold tracking-[-0.01em] text-ink">
            Crecimiento de la semana
          </h3>
          <p className="mt-3 text-[28px] leading-none font-semibold tracking-[-0.02em] tabular-nums text-ink">
            {week.published}
            <span className="text-[17px] font-medium text-muted-fg">
              {" "}
              de 7 publicados
            </span>
          </p>
          <div className="mt-3">
            <Progress value={week.pct} />
          </div>
          {/* Mini barras Lun–Dom: el día con Reel publicado va en rojo. */}
          <div
            className="mt-4 flex items-end gap-1.5"
            aria-label="Reels publicados por día de la semana"
          >
            {WEEK_DAYS.map((day, i) => (
              <div
                key={day}
                className="flex flex-1 flex-col items-center gap-1"
              >
                <div
                  className={cn(
                    "h-9 w-full rounded-[3px]",
                    publishedDays.has(i) ? "bg-primary" : "bg-control",
                  )}
                  title={`${day}: ${publishedDays.has(i) ? "publicado" : "sin publicar"}`}
                />
                <span className="text-[10px] font-medium text-muted-fg">
                  {day.slice(0, 1)}
                </span>
              </div>
            ))}
          </div>
          {streakCount > 0 ? (
            <div className="mt-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-ink px-2.5 py-1 text-xs font-semibold text-white">
                <Flame className="h-3.5 w-3.5" aria-hidden="true" />
                Racha de {streakCount}{" "}
                {streakCount === 1 ? "día" : "días"}
              </span>
            </div>
          ) : null}
          {topIdea ? (
            <>
              <p className="mt-4 text-sm font-medium text-muted-fg">
                Siguiente tema
              </p>
              <p className="mt-1 text-[15px] leading-snug font-semibold text-ink">
                {topIdea.title}
              </p>
              <div className="mt-3">
                <Button onClick={moveTopIdeaToScript}>
                  <Clapperboard className="h-4 w-4" aria-hidden="true" />
                  Pasar a guion
                </Button>
              </div>
            </>
          ) : (
            <p className="mt-4 text-sm text-muted-fg">
              El banco de ideas está vacío. El agente te guarda ideas si le
              dices “agregar idea: …”.
            </p>
          )}
        </div>
      </div>

      {/* ---------- Entrada al agente ---------- */}
      <button
        type="button"
        onClick={() => openScreen("agente")}
        className="surface surface-hover flex w-full cursor-pointer items-center gap-4 p-5 text-left"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-text">
          <Sparkles className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold text-ink">
            Pregúntale al agente
          </span>
          <span className="block truncate text-sm text-muted-fg">
            ¿Qué toca hoy? · ¿Cómo van las métricas? · Guarda una idea
          </span>
        </span>
        <ChevronRight
          className="h-5 w-5 shrink-0 text-muted-fg"
          aria-hidden="true"
        />
      </button>
    </div>
  );
}
