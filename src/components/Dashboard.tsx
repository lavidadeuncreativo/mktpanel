"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronRight,
  Clapperboard,
  Eye,
  Flame,
  MessageSquare,
  Sparkles,
  Users,
} from "lucide-react";
import { usePanel } from "./panel-context";
import type { WorkspaceId } from "@/lib/types";
import { STATUS_LABELS } from "@/lib/types";
import {
  nextSuggestedIdea,
  previousByNetwork,
  publishQueue,
  streak,
  weeklyProgress,
  workspaceTotals,
} from "@/lib/derive";
import {
  formatDateLong,
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

function DeltaPill({ delta }: { delta: string | null }) {
  if (!delta) return <Pill tone="neutral">Línea base</Pill>;
  const up = delta.startsWith("+");
  return (
    <Pill tone={up ? "green" : "red"}>
      {up ? (
        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
      ) : (
        <ArrowDownRight className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      {delta}
    </Pill>
  );
}

function MetricCard({
  icon,
  label,
  value,
  delta,
  note,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  delta: string | null;
  note: string;
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
      <div className="mt-2 flex items-center gap-2">
        <DeltaPill delta={delta} />
      </div>
      <p className="mt-1.5 text-[13px] text-muted-fg">{note}</p>
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
      {/* ---------- Héroe: degradado animado, saludo, acciones,
           tarjeta de resumen en vidrio ---------- */}
      <section
        aria-label="Resumen del día"
        className="hero-animated relative overflow-hidden rounded-[24px] px-6 py-8 text-white sm:px-8"
      >
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-white/80">
              {formatDateLong(iso)}
            </p>
            <h2 className="mt-1 text-[34px] leading-tight font-semibold tracking-[-0.02em] text-white sm:text-[40px]">
              Hola, Isra
            </h2>
            <p className="mt-1 max-w-md text-[15px] leading-relaxed text-white/85">
              Esto es lo que tienes hoy en {wsName}.
            </p>
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

          {/* Tarjeta de resumen en vidrio, como la tarjeta VISA */}
          <div className="w-full max-w-[320px] shrink-0 rounded-[16px] border border-white/25 bg-white/15 p-5 backdrop-blur-md">
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
      </section>

      {/* ---------- Resumen + 4 tarjetas de métricas ---------- */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="surface surface-hover p-5 lg:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold tracking-[-0.01em] text-ink">
                Resumen
              </h3>
              <p className="mt-0.5 text-sm text-muted-fg">
                Vistas por captura registrada.
              </p>
            </div>
            <p className="text-[28px] leading-none font-semibold tracking-[-0.02em] tabular-nums text-ink">
              <AnimatedNumber value={totals.views} format={formatNumber} />
            </p>
          </div>
          {hasSnapshots ? (
            <>
              <ViewsBars snapshots={ws.snapshots} />
              <p className="text-[13px] text-muted-fg">
                Línea base: registra una segunda captura (o sincroniza con
                Meta en Conexiones) para ver la tendencia.
              </p>
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
            note="En la última captura"
          />
          <MetricCard
            icon={<Users className="h-4 w-4" aria-hidden="true" />}
            label="Seguidores"
            value={totals.followers}
            delta={followersDelta}
            note="En la última captura"
          />
          <MetricCard
            icon={<MessageSquare className="h-4 w-4" aria-hidden="true" />}
            label="Comentarios"
            value={totals.comments}
            delta={commentsDelta}
            note="En la última captura"
          />
          <MetricCard
            icon={<Flame className="h-4 w-4" aria-hidden="true" />}
            label="Racha"
            value={streakCount}
            delta={null}
            note={
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
                      {item.views !== null
                        ? ` · ${formatNumber(item.views)} vistas`
                        : ""}
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
