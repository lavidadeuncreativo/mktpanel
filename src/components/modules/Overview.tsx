"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  CheckSquare,
  Gift,
  MessageSquareText,
  TrendingUp,
  Users,
  Eye,
  Play,
} from "lucide-react";
import { usePanel } from "../panel-context";
import type { WorkspaceData, WorkspaceId } from "@/lib/types";
import { NETWORK_LABELS, STATUS_LABELS } from "@/lib/types";
import {
  aggregateTotals,
  latestByNetwork,
  previousByNetwork,
  viewsShare,
  weeklyProgress,
  workspaceTotals,
} from "@/lib/derive";
import { formatDateShort, formatDeltaPct, formatNumber } from "@/lib/store";
import { FollowersArea, NETWORK_COLORS, NetworkDonut } from "../charts";
import { WeeklyGoal } from "../WeeklyGoal";
import { Button, EmptyState, Pill } from "../ui";

/** Build the effective workspace shown by the current view. */
function effectiveWorkspace(
  view: "general" | WorkspaceId,
  data: Record<WorkspaceId, WorkspaceData>,
): { ws: WorkspaceData; label: string } {
  if (view === "general") {
    const merged: WorkspaceData = {
      snapshots: [
        ...data.evym.snapshots,
        ...data.antojo.snapshots,
        ...data.personal.snapshots,
      ],
      content: [
        ...data.evym.content,
        ...data.antojo.content,
        ...data.personal.content,
      ],
      ideas: [
        ...data.evym.ideas,
        ...data.antojo.ideas,
        ...data.personal.ideas,
      ],
      anecdotes: [
        ...data.evym.anecdotes,
        ...data.antojo.anecdotes,
        ...data.personal.anecdotes,
      ],
      tasks: [
        ...data.evym.tasks,
        ...data.antojo.tasks,
        ...data.personal.tasks,
      ],
      log: [...data.evym.log, ...data.antojo.log, ...data.personal.log],
    };
    return { ws: merged, label: "general" };
  }
  return { ws: data[view], label: view };
}

function initials(title: string): string {
  const words = title.split(/\s+/).filter((w) => /^[A-Za-zÁÉÍÓÚÑ]/.test(w));
  const picked = words.slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "");
  return picked.join("") || "EV";
}

function KpiCard({
  icon,
  label,
  value,
  delta,
  context,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  /** null → "Línea base" pill (only one capture exists). */
  delta: { text: string; positive: boolean } | null;
  context: string[];
}) {
  return (
    <div className="surface p-5">
      <div className="flex items-start justify-between gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-control text-muted-fg">
          {icon}
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
      <p className="mt-4 text-[28px] leading-none font-semibold tracking-[-0.02em] text-ink">
        {value}
      </p>
      <p className="mt-1.5 text-sm font-medium text-ink">{label}</p>
      <div className="mt-1 space-y-0.5">
        {context.map((line) => (
          <p key={line} className="text-xs text-muted-fg">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}

export function Overview() {
  const { data, view, setModule } = usePanel();
  const { ws } = effectiveWorkspace(view, data);

  const totals =
    view === "general" ? aggregateTotals(data) : workspaceTotals(ws);
  const latest = latestByNetwork(ws.snapshots);
  const previous = previousByNetwork(ws.snapshots);
  const week = weeklyProgress(view === "general" ? data.evym : ws);

  // A delta is honest only when a network has two captures.
  const followersDelta = (() => {
    const nets = Object.keys(latest) as (keyof typeof latest)[];
    if (nets.length === 0) return null;
    if (!nets.every((n) => previous[n])) return null;
    const cur = nets.reduce((s, n) => s + (latest[n]?.followers ?? 0), 0);
    const prev = nets.reduce((s, n) => s + (previous[n]?.followers ?? 0), 0);
    const text = formatDeltaPct(cur, prev);
    if (!text) return null;
    return { text, positive: cur >= prev };
  })();

  const viewsDelta = (() => {
    const nets = Object.keys(latest) as (keyof typeof latest)[];
    if (nets.length === 0) return null;
    if (!nets.every((n) => previous[n])) return null;
    const cur = nets.reduce((s, n) => s + (latest[n]?.views ?? 0), 0);
    const prev = nets.reduce((s, n) => s + (previous[n]?.views ?? 0), 0);
    const text = formatDeltaPct(cur, prev);
    if (!text) return null;
    return { text, positive: cur >= prev };
  })();

  const share = viewsShare(ws.snapshots);

  const topReels = [...ws.content]
    .filter((c) => c.status === "publicado")
    .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
    .slice(0, 5);
  const recentAnecdotes = [...ws.anecdotes].slice(-3).reverse();
  const pendingTasks = ws.tasks.filter((t) => !t.done).slice(0, 4);

  const hero =
    view === "general"
      ? {
          title: "Vista general",
          desc: "Todo el marketing de tus tres espacios en un solo lugar.",
          pills: [
            { label: `${formatNumber(totals.followers)} seguidores en total`, tone: "neutral" as const },
            { label: `${formatNumber(totals.views)} vistas en total`, tone: "neutral" as const },
            { label: `${totals.published} Reels publicados`, tone: "violet" as const },
          ],
        }
      : view === "evym"
        ? {
            title: "Entre Vivos y Muertos",
            desc: "Historias de terror mexicanas en video para vender mezcal Los Muertos.",
            pills: [
              { label: `${week.published} de 7 publicados esta semana`, tone: "violet" as const },
              {
                label:
                  ws.anecdotes.length > 0
                    ? `${ws.anecdotes.length} anécdotas en el giveaway`
                    : "Giveaway activo",
                tone: "amber" as const,
              },
              { label: "Meta: 7 historias por semana", tone: "neutral" as const },
            ],
          }
        : view === "antojo"
          ? {
              title: "Antojo",
              desc: "Contenido y ventas de Antojo.",
              pills: [{ label: "Sin datos todavía", tone: "neutral" as const }],
            }
          : {
              title: "Perfil personal",
              desc: "Perfil personal de Isra Granados.",
              pills: [{ label: "Sin datos todavía", tone: "neutral" as const }],
            };

  const hasData = ws.snapshots.length > 0;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="surface p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.02em] text-ink sm:text-[34px]">
              {hero.title}
            </h1>
            <p className="mt-1.5 max-w-xl text-[15px] text-muted-fg">
              {hero.desc}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {hero.pills.map((p) => (
              <Pill key={p.label} tone={p.tone}>
                {p.label}
              </Pill>
            ))}
          </div>
        </div>
      </section>

      {/* KPI row: 5 cards */}
      <section
        aria-label="Indicadores principales"
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5"
      >
        <KpiCard
          icon={<Users className="h-5 w-5" aria-hidden="true" />}
          label="Seguidores"
          value={formatNumber(totals.followers)}
          delta={followersDelta}
          context={
            totals.networksWithData.length === 0
              ? ["Sin datos todavía"]
              : totals.networksWithData.map(
                  (n) =>
                    `${formatNumber(latest[n]?.followers ?? 0)} en ${NETWORK_LABELS[n]}`,
                )
          }
        />
        <KpiCard
          icon={<Eye className="h-5 w-5" aria-hidden="true" />}
          label="Vistas"
          value={formatNumber(totals.views)}
          delta={viewsDelta}
          context={
            totals.networksWithData.length === 0
              ? ["Sin datos todavía"]
              : totals.networksWithData.map(
                  (n) =>
                    `${formatNumber(latest[n]?.views ?? 0)} en ${NETWORK_LABELS[n]}`,
                )
          }
        />
        <KpiCard
          icon={<TrendingUp className="h-5 w-5" aria-hidden="true" />}
          label="Interacciones"
          value={formatNumber(totals.interactions)}
          delta={null}
          context={
            totals.networksWithData.length === 0
              ? ["Sin datos todavía"]
              : [
                  `${formatNumber(totals.reactions)} reacciones`,
                  `${formatNumber(totals.comments)} comentarios, ${formatNumber(totals.shares)} compartidos`,
                ]
          }
        />
        <KpiCard
          icon={<Play className="h-5 w-5" aria-hidden="true" />}
          label="Reels publicados"
          value={String(totals.published)}
          delta={null}
          context={[`Meta de la semana: ${totals.published} de 7`]}
        />
        <KpiCard
          icon={<Gift className="h-5 w-5" aria-hidden="true" />}
          label="Anécdotas del giveaway"
          value={String(totals.anecdotes)}
          delta={null}
          context={
            view === "evym" || view === "general"
              ? ["Premio: botella de mezcal Los Muertos"]
              : ["El giveaway vive solo en EVYM"]
          }
        />
      </section>

      {/* Charts row 2:1 */}
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="surface p-5 sm:p-6 lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold tracking-[-0.01em] text-ink">
                Seguidores por red
              </h2>
              <p className="mt-0.5 text-sm text-muted-fg">
                {hasData
                  ? "Evolución según tus capturas registradas."
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
            <FollowersArea snapshots={ws.snapshots} />
          ) : (
            <div className="mt-4">
              <EmptyState
                title="Sin capturas todavía"
                description="Registra una captura de Business Suite en Métricas y aquí aparecerá la curva de crecimiento."
                action={
                  <Button variant="outline" onClick={() => setModule("metricas")}>
                    Ir a Métricas
                  </Button>
                }
              />
            </div>
          )}
          {hasData && Object.keys(previous).length === 0 ? (
            <p className="mt-2 text-xs text-muted-fg">
              Solo existe la primera captura. La curva y los deltas aparecen
              cuando registres la segunda captura por red.
            </p>
          ) : null}
        </div>

        <div className="surface p-5 sm:p-6">
          <h2 className="text-lg font-semibold tracking-[-0.01em] text-ink">
            Vistas por red
          </h2>
          <p className="mt-0.5 text-sm text-muted-fg">
            Distribución de las vistas de la última captura.
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
                    <span className="text-muted-fg">
                      {formatNumber(s.views)}
                    </span>
                    <span className="w-12 text-right font-semibold text-ink">
                      {s.pct.toFixed(0)}%
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="mt-4">
              <EmptyState
                title="Sin vistas registradas"
                description="Cuando registres una captura, aquí verás cómo se reparten las vistas entre tus redes."
              />
            </div>
          )}
        </div>
      </section>

      {/* Three lists */}
      <section className="grid gap-4 md:grid-cols-3">
        {/* Top Reels */}
        <div className="surface p-5 sm:p-6">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold tracking-[-0.01em] text-ink">
              Top Reels
            </h2>
            <button
              type="button"
              onClick={() => setModule("contenido")}
              className="cursor-pointer text-sm font-medium text-primary transition-opacity duration-200 ease-apple hover:opacity-70"
            >
              Ver contenido
            </button>
          </div>
          {topReels.length === 0 ? (
            <EmptyState
              title="Nada publicado todavía"
              description="Cuando publiques tu primer Reel, aparecerá aquí con sus reproducciones."
            />
          ) : (
            <ul className="divide-y divide-line">
              {topReels.map((reel) => (
                <li key={reel.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-control text-xs font-semibold text-ink">
                    {initials(reel.title)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">
                      {reel.title}
                    </span>
                    <span className="block text-xs text-muted-fg">
                      {reel.publishDate
                        ? formatDateShort(reel.publishDate)
                        : "Sin fecha"}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block text-sm font-semibold text-ink">
                      {reel.views !== null
                        ? formatNumber(reel.views)
                        : "Sin datos"}
                    </span>
                    <span className="block text-xs text-muted-fg">
                      reproducciones
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent anecdotes */}
        <div className="surface p-5 sm:p-6">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold tracking-[-0.01em] text-ink">
              Anécdotas recientes
            </h2>
            {view === "evym" ? (
              <button
                type="button"
                onClick={() => setModule("giveaway")}
                className="cursor-pointer text-sm font-medium text-primary transition-opacity duration-200 ease-apple hover:opacity-70"
              >
                Ver giveaway
              </button>
            ) : null}
          </div>
          {recentAnecdotes.length === 0 ? (
            <EmptyState
              title="Sin anécdotas todavía"
              description={
                view === "evym"
                  ? "Cuando lleguen anécdotas por la landing o por comentarios, aparecerán aquí."
                  : "Las anécdotas del giveaway viven solo en Entre Vivos y Muertos."
              }
            />
          ) : (
            <ul className="divide-y divide-line">
              {recentAnecdotes.map((a) => (
                <li key={a.id} className="py-3 first:pt-0 last:pb-0">
                  <p className="flex items-center gap-2 text-sm font-medium text-ink">
                    <MessageSquareText
                      className="h-4 w-4 shrink-0 text-muted-fg"
                      aria-hidden="true"
                    />
                    <span className="truncate">{a.title}</span>
                    {a.winner ? <Pill tone="green">Ganadora</Pill> : null}
                    {a.finalist && !a.winner ? (
                      <Pill tone="amber">Finalista</Pill>
                    ) : null}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-fg">
                    {a.name}
                    {a.city ? `, ${a.city}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Pending tasks */}
        <div className="surface p-5 sm:p-6">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold tracking-[-0.01em] text-ink">
              Pendientes
            </h2>
            <button
              type="button"
              onClick={() => setModule("pendientes")}
              className="cursor-pointer text-sm font-medium text-primary transition-opacity duration-200 ease-apple hover:opacity-70"
            >
              Ver todos
            </button>
          </div>
          {pendingTasks.length === 0 ? (
            <EmptyState
              title="Nada pendiente"
              description="No hay pendientes abiertos en este espacio. Cuando agregues tareas, aparecerán aquí."
            />
          ) : (
            <ul className="divide-y divide-line">
              {pendingTasks.map((t) => (
                <li key={t.id} className="flex items-start gap-2.5 py-2.5 first:pt-0 last:pb-0">
                  <CheckSquare
                    className="mt-0.5 h-4 w-4 shrink-0 text-muted-fg"
                    aria-hidden="true"
                  />
                  <span className="text-sm text-ink">{t.label}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Weekly goal */}
      <WeeklyGoal ws={view === "general" ? data.evym : ws} />

      {/* Pipeline table */}
      <section className="surface p-5 sm:p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold tracking-[-0.01em] text-ink">
            Pipeline de contenido
          </h2>
          <button
            type="button"
            onClick={() => setModule("contenido")}
            className="cursor-pointer text-sm font-medium text-primary transition-opacity duration-200 ease-apple hover:opacity-70"
          >
            Abrir pipeline
          </button>
        </div>
        {ws.content.length === 0 ? (
          <EmptyState
            title="Sin Reels en el pipeline"
            description="Agrega tu primer tema en Contenido y muévelo por el pipeline hasta publicarlo."
            action={
              <Button variant="outline" onClick={() => setModule("contenido")}>
                Ir a Contenido
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-muted-fg">
                  <th scope="col" className="py-2 pr-3 font-medium">
                    Reel
                  </th>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    Estado
                  </th>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    Publicación
                  </th>
                  <th scope="col" className="py-2 text-right font-medium">
                    Vistas
                  </th>
                </tr>
              </thead>
              <tbody>
                {[...ws.content]
                  .sort((a, b) => (a.dayIndex ?? 99) - (b.dayIndex ?? 99))
                  .map((c) => (
                    <tr key={c.id} className="border-b border-line last:border-0">
                      <td className="py-3 pr-3 font-medium text-ink">
                        {c.title}
                      </td>
                      <td className="py-3 pr-3">
                        <Pill
                          tone={
                            c.status === "publicado"
                              ? "green"
                              : c.status === "edicion"
                                ? "blue"
                                : c.status === "imagenes"
                                  ? "violet"
                                  : "neutral"
                          }
                        >
                          {STATUS_LABELS[c.status]}
                        </Pill>
                      </td>
                      <td className="py-3 pr-3 text-muted-fg">
                        {c.publishDate
                          ? formatDateShort(c.publishDate)
                          : "Sin programar"}
                      </td>
                      <td className="py-3 text-right font-semibold text-ink">
                        {c.views !== null ? formatNumber(c.views) : "Sin datos"}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
