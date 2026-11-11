"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  Clapperboard,
  Flame,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { usePanel } from "./panel-context";
import { AggregateBriefing } from "./Briefing";
import { Recommendations } from "./Recommendations";
import type { WorkspaceData, WorkspaceId } from "@/lib/types";
import { NETWORK_LABELS, UNIVERSE_NETWORKS, WORKSPACES } from "@/lib/types";
import {
  aggregateTotals,
  latestByNetwork,
  previousByNetwork,
  weeklyProgress,
  workspaceTotals,
} from "@/lib/derive";
import {
  buildAlerts,
  formatDayLong,
  nextPublishSlot,
  nextSevenDays,
  weekdayIndex,
  parseIso,
  type TopReel,
} from "@/lib/universe";
import {
  formatDateShort,
  formatDeltaPct,
  formatNumber,
} from "@/lib/store";
import { useTodayIso } from "./useToday";
import { AnimatedNumber, Button, Pill } from "./ui";
import { statusTone } from "./modules/Content";
import { cn } from "./cn";

/* ------------------------------------------------------------------ */
/* El Dashboard general "Universo": el resumen de TODO — las tres     */
/* cuentas, en bento, ordenado por prioridad.                          */
/*                                                                     */
/* 1. Alertas: lo que está pasando — el Reel más visto (por Views      */
/*    reales del pipeline) y dónde hay comentarios (por captura,       */
/*    nunca por Reel: los comentarios por Reel no existen en los       */
/*    datos, y eso se dice).                                           */
/* 2. ¿Cuándo publico?: el primer hueco libre de la semana y el Reel   */
/*    más avanzado, con un botón para programarlo ahí mismo.           */
/* 3. Próximos 7 días: qué toca publicar y qué sigue en producción.    */
/* 4. Una tarjeta por cuenta con sus métricas y cada red del universo: */
/*    Instagram, Facebook, TikTok y Threads donde toca; sin datos,     */
/*    "Sin datos todavía" — nunca un 0 inventado.                      */
/* 5. Qué publicar (recomendaciones) y la entrada al agente.           */
/*                                                                     */
/* Tarjetas blancas y sólidas (surface), nunca vidrio: sobre el        */
/* degradado del héroe, lo transparente no se leía. El Hoy por         */
/* espacio queda igual, solo con sus tarjetas también en blanco.       */
/* ------------------------------------------------------------------ */

interface WorkspaceDelta {
  totals: ReturnType<typeof workspaceTotals>;
  hasSnapshots: boolean;
  hasSecond: boolean;
  viewsDelta: string | null;
  followersDelta: string | null;
}

function workspaceDelta(ws: WorkspaceData): WorkspaceDelta {
  const totals = workspaceTotals(ws);
  const prev = previousByNetwork(ws.snapshots);
  const prevValues = Object.values(prev);
  const hasSecond = prevValues.some((p) => p !== null);
  const prevViews = prevValues.reduce((s, p) => s + (p?.views ?? 0), 0);
  const prevFollowers = prevValues.reduce(
    (s, p) => s + (p?.followers ?? 0),
    0,
  );
  return {
    totals,
    hasSnapshots: ws.snapshots.length > 0,
    hasSecond,
    viewsDelta: formatDeltaPct(totals.views, prevViews),
    followersDelta: formatDeltaPct(totals.followers, prevFollowers),
  };
}

function topContent(ws: WorkspaceData) {
  const published = ws.content.filter(
    (c) => c.status === "publicado" && c.views !== null,
  );
  if (published.length === 0) return null;
  return [...published].sort(
    (a, b) => (b.views as number) - (a.views as number),
  )[0];
}

/* ------------------------- 1. Alertas ------------------------- */

function AlertsCard({ data }: { data: Parameters<typeof buildAlerts>[0] }) {
  const alerts = buildAlerts(data);
  const top: TopReel | null = alerts.top;
  const ratio =
    top && alerts.runnerUp && alerts.runnerUp.item.views
      ? (top.item.views as number) / (alerts.runnerUp.item.views as number)
      : null;

  return (
    <article
      aria-label="Lo que está pasando"
      className="surface p-5 md:col-span-2"
    >
      <h3 className="flex items-center gap-2 text-base font-semibold tracking-[-0.01em] text-ink">
        <Flame className="h-5 w-5 text-primary" aria-hidden="true" />
        Lo que está pasando
      </h3>

      {top ? (
        <div className="mt-3">
          <p className="text-[13px] font-semibold text-muted-fg">
            Tu Reel más visto, con diferencia
          </p>
          <p className="mt-1 text-[19px] leading-snug font-semibold tracking-[-0.01em] text-ink">
            {top.item.title}
          </p>
          <p className="mt-1 text-sm text-muted-fg">
            {WORKSPACES.find((w) => w.id === top.wsId)?.short} ·{" "}
            <span className="font-semibold text-ink">
              {formatNumber(top.item.views as number)} vistas
            </span>
            {ratio && ratio >= 1.5 && alerts.runnerUp
              ? ` · ${ratio.toFixed(1)}× más que ${alerts.runnerUp.item.title} (${formatNumber(alerts.runnerUp.item.views as number)})`
              : ""}
          </p>
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-fg">
          Todavía no hay Reels publicados: publica el primero y aquí
          aparece lo que despega.
        </p>
      )}

      {alerts.commentLeaders.length > 0 ? (
        <div className="mt-4 border-t border-line/70 pt-3">
          <p className="flex items-center gap-1.5 text-[13px] font-semibold text-muted-fg">
            <MessageSquare className="h-4 w-4" aria-hidden="true" />
            Comentarios en la última captura
          </p>
          <ul className="mt-2 space-y-1">
            {alerts.commentLeaders.map((c) => (
              <li key={`${c.wsId}-${c.network}`} className="text-sm text-muted-fg">
                <span className="font-semibold text-ink">
                  {WORKSPACES.find((w) => w.id === c.wsId)?.short} ·{" "}
                  {NETWORK_LABELS[c.network]}
                </span>
                : {formatNumber(c.comments)} comentarios
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-fg">
            Los comentarios son por cuenta, no por Reel: Meta no los
            desglosa por publicación en la captura.
          </p>
        </div>
      ) : (
        <p className="mt-4 border-t border-line/70 pt-3 text-sm text-muted-fg">
          Sin comentarios en la última captura de ninguna cuenta.
        </p>
      )}
    </article>
  );
}

/* -------------------- 2. ¿Cuándo publico? -------------------- */

function NextSlotCard({
  data,
  iso,
}: {
  data: Parameters<typeof buildAlerts>[0];
  iso: string;
}) {
  const { update, openScreen } = usePanel();
  const slot = nextPublishSlot(data, iso);
  const hasUnpublished = (["evym", "antojo", "personal"] as WorkspaceId[]).some(
    (id) => data[id].content.some((c) => c.status !== "publicado"),
  );

  const scheduleThere = () => {
    if (!slot?.reel) return;
    const { wsId, item } = slot.reel;
    update((d) => ({
      ...d,
      [wsId]: {
        ...d[wsId],
        content: d[wsId].content.map((c) =>
          c.id === item.id
            ? {
                ...c,
                publishDate: slot.date,
                dayIndex: weekdayIndex(parseIso(slot.date)),
              }
            : c,
        ),
      },
    }));
    openScreen("calendario");
  };

  return (
    <article aria-label="Cuándo publicar" className="surface p-5">
      <h3 className="flex items-center gap-2 text-base font-semibold tracking-[-0.01em] text-ink">
        <CalendarDays className="h-5 w-5 text-primary" aria-hidden="true" />
        ¿Cuándo publico?
      </h3>
      {slot?.reel ? (
        <>
          <p className="mt-3 text-sm text-muted-fg">
            El primer hueco libre es el{" "}
            <span className="font-semibold text-ink">
              {formatDayLong(slot.date)}
            </span>
            .
          </p>
          <p className="mt-2 text-[17px] leading-snug font-semibold tracking-[-0.01em] text-ink">
            {slot.reel.item.title}
          </p>
          <p className="mt-1 text-sm text-muted-fg">
            {WORKSPACES.find((w) => w.id === slot.reel?.wsId)?.short} · Lo más
            avanzado sin publicar.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" onClick={scheduleThere}>
              Programar para ese día
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => openScreen("agente")}
            >
              Preguntar al agente
            </Button>
          </div>
        </>
      ) : hasUnpublished ? (
        <p className="mt-3 text-sm text-muted-fg">
          No queda un día libre en los próximos 7 días: revisa el
          calendario, hay días con más de un Reel encima.
        </p>
      ) : (
        <p className="mt-3 text-sm text-muted-fg">
          No hay nada sin publicar: el pipeline está al día. Agrega un
          Reel en Contenido y aquí te digo cuándo sacarlo.
        </p>
      )}
    </article>
  );
}

/* -------------------- 3. Próximos 7 días -------------------- */

function NextSevenDaysCard({
  data,
  iso,
}: {
  data: Parameters<typeof buildAlerts>[0];
  iso: string;
}) {
  const { focusContent, openScreen } = usePanel();
  const plan = nextSevenDays(data, iso);
  const first = plan.days[0];
  const last = plan.days[plan.days.length - 1];

  return (
    <article aria-label="Próximos 7 días" className="surface p-5 md:col-span-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-base font-semibold tracking-[-0.01em] text-ink">
          Próximos 7 días
        </h3>
        <p className="text-sm text-muted-fg">
          {formatDateShort(first.iso)} – {formatDateShort(last.iso)}
        </p>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1.5">
        {plan.days.map((day) => (
          <div
            key={day.iso}
            className={cn(
              "min-w-0 rounded-[10px] border p-2",
              day.isToday
                ? "border-primary bg-primary-soft/60 ring-1 ring-primary"
                : "border-line bg-page",
            )}
          >
            <p
              className={cn(
                "text-[12px] leading-tight font-semibold",
                day.isToday ? "text-primary-text" : "text-ink",
              )}
            >
              {day.isToday ? "Hoy" : day.label}{" "}
              <span className="text-muted-fg">
                {parseIso(day.iso).getDate()}
              </span>
            </p>
            <div className="mt-1.5 space-y-1">
              {day.items.length === 0 ? (
                <p className="text-[11px] text-muted-fg">Libre</p>
              ) : (
                day.items.map(({ wsId, item }) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => focusContent(item.id, wsId)}
                    title={`${item.title} · ${WORKSPACES.find((w) => w.id === wsId)?.short}`}
                    className="block w-full cursor-pointer truncate rounded-md bg-control px-1.5 py-1 text-left text-[11px] leading-tight font-semibold text-ink transition-opacity hover:opacity-80"
                  >
                    {item.title}
                  </button>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {plan.inProduction.length > 0 ? (
        <div className="mt-4 border-t border-line/70 pt-3">
          <p className="text-[13px] font-semibold text-muted-fg">
            En producción, sin fecha
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {plan.inProduction.map(({ wsId, item }) => (
              <button
                key={item.id}
                type="button"
                onClick={() => focusContent(item.id, wsId)}
                className="cursor-pointer"
                title={`${item.title} · ${WORKSPACES.find((w) => w.id === wsId)?.short}`}
              >
                <Pill tone={statusTone(item.status)}>
                  {item.title} ·{" "}
                  {item.status === "imagenes"
                    ? "Imágenes"
                    : item.status === "edicion"
                      ? "Edición"
                      : item.status === "guion"
                        ? "Guion"
                        : "Idea"}
                </Pill>
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-fg">
            Para ponerles fecha, díselo al agente: “programa El Club
            Caníbal para el viernes”.
          </p>
        </div>
      ) : null}

      <div className="mt-4">
        <Button variant="outline" size="sm" onClick={() => openScreen("calendario")}>
          Ver Calendario
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </article>
  );
}

/* -------------------- 4. Una tarjeta por cuenta -------------------- */

function AccountCard({
  wsId,
  ws,
}: {
  wsId: WorkspaceId;
  ws: WorkspaceData;
}) {
  const { setView, openScreen } = usePanel();
  const meta = WORKSPACES.find((w) => w.id === wsId) ?? {
    id: wsId,
    name: wsId,
    short: wsId,
    description: "",
  };
  const d = workspaceDelta(ws);
  const top = topContent(ws);
  const week = weeklyProgress(ws);
  const latest = latestByNetwork(ws.snapshots);

  return (
    <article className="surface surface-hover flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold tracking-[-0.01em] text-ink">
            {meta.name}
          </h3>
          <p className="mt-0.5 text-[13px] text-muted-fg">
            {meta.description}
          </p>
        </div>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-text">
          <Clapperboard className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>

      {d.hasSnapshots ? (
        <>
          <p className="mt-4 text-[28px] leading-none font-semibold tracking-[-0.02em] tabular-nums text-ink">
            <AnimatedNumber value={d.totals.views} format={formatNumber} />
            <span className="ml-1 text-sm font-medium text-muted-fg">
              vistas
            </span>
          </p>
          <p className="mt-1.5 text-sm text-muted-fg">
            <AnimatedNumber
              value={d.totals.followers}
              format={formatNumber}
            />{" "}
            seguidores
          </p>
          {d.hasSecond && d.viewsDelta ? (
            <p
              className={cn(
                "mt-2 flex items-center gap-1 text-[13px] font-medium",
                d.viewsDelta.startsWith("+") ? "text-accent" : "text-danger",
              )}
            >
              {d.viewsDelta.startsWith("+") ? (
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <ArrowDownRight className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {d.viewsDelta} vs. captura anterior
            </p>
          ) : (
            <p className="mt-2 text-[13px] text-muted-fg">
              Línea base — todavía no hay una segunda captura para comparar.
            </p>
          )}
        </>
      ) : (
        <p className="mt-4 text-sm text-muted-fg">
          Todavía no hay métricas en esta cuenta.
        </p>
      )}

      <div className="mt-4 border-t border-line/70 pt-3">
        {top ? (
          <p className="text-sm text-muted-fg">
            Lo más visto:{" "}
            <span className="font-semibold text-ink">{top.title}</span> —{" "}
            {formatNumber(top.views as number)} vistas
          </p>
        ) : (
          <p className="text-sm text-muted-fg">
            Sin contenido publicado todavía.
          </p>
        )}
        <p className="mt-1 text-sm text-muted-fg">
          {ws.content.length === 0
            ? "Sin contenido en el pipeline todavía."
            : `${week.published} de 7 publicados esta semana.`}
        </p>
      </div>

      {/* Redes del universo: con datos o "Sin datos todavía", nunca un 0. */}
      <ul className="mt-4 space-y-2 border-t border-line/70 pt-3">
        {UNIVERSE_NETWORKS[wsId].map((net) => {
          const snap = latest[net];
          return (
            <li
              key={net}
              className="flex items-center justify-between gap-2"
            >
              <span className="text-sm font-medium text-ink">
                {NETWORK_LABELS[net]}
              </span>
              {snap ? (
                <span className="text-right text-[13px] text-muted-fg">
                  <span className="font-semibold text-ink">
                    {formatNumber(snap.views)}
                  </span>{" "}
                  vistas · {formatNumber(snap.followers)} seguidores
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <span className="text-[13px] text-muted-fg">
                    Sin datos todavía
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setView(wsId);
                      openScreen("metricas");
                    }}
                  >
                    Registrar captura
                  </Button>
                </span>
              )}
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={() => setView(wsId)}
        className="mt-4 flex h-10 cursor-pointer items-center justify-center gap-1 rounded-full border border-line bg-control text-sm font-semibold text-ink transition-opacity duration-200 ease-apple hover:opacity-75"
      >
        Ver {meta.short}
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </article>
  );
}

export function GeneralDashboard() {
  const { data, openScreen } = usePanel();
  const iso = useTodayIso();
  const totals = aggregateTotals(data);

  const allSnapshots = (Object.keys(data) as WorkspaceId[]).flatMap(
    (id) => data[id].snapshots,
  );
  const lastCaptureDate =
    allSnapshots.length > 0
      ? [...allSnapshots].sort((a, b) => b.date.localeCompare(a.date))[0].date
      : null;

  // Resumen honesto del crecimiento: deltas solo donde hay segunda
  // captura; el resto, en línea base.
  const deltaParts: string[] = [];
  const baselineParts: string[] = [];
  for (const id of ["evym", "antojo", "personal"] as WorkspaceId[]) {
    const short = WORKSPACES.find((w) => w.id === id)?.short ?? id;
    const d = workspaceDelta(data[id]);
    if (d.hasSecond && d.viewsDelta) {
      deltaParts.push(`${short} ${d.viewsDelta} en vistas`);
    } else if (d.hasSnapshots) {
      baselineParts.push(short);
    }
  }

  return (
    <div className="space-y-4">
      {/* ---------- Héroe: mismo degradado, totales de las 3 cuentas ---------- */}
      <section
        aria-label="Resumen general"
        className="relative px-2 pt-4 pb-6 text-white sm:px-4"
      >
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-white/80">
              Esto es todo lo que tienes en tus tres cuentas.
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
                className="flex h-11 cursor-pointer items-center gap-2 rounded-full border border-white/40 bg-white/10 px-5 text-[15px] font-semibold text-white transition-colors duration-200 ease-apple hover:bg-white/20"
              >
                Registrar captura
              </button>
            </div>
          </div>

          {/* Tarjeta de resumen BLANCA y sólida (antes era vidrio). */}
          <div className="relative w-full max-w-[320px] shrink-0">
            <div className="surface p-5">
              {allSnapshots.length > 0 ? (
                <>
                  <p className="text-[13px] font-medium text-muted-fg">
                    Vistas totales · todas las cuentas
                  </p>
                  <p className="mt-1 text-[34px] leading-none font-semibold tracking-[-0.02em] tabular-nums text-ink">
                    <AnimatedNumber
                      value={totals.views}
                      format={formatNumber}
                    />
                  </p>
                  <p className="mt-2 text-sm text-muted-fg">
                    <AnimatedNumber
                      value={totals.followers}
                      format={formatNumber}
                    />{" "}
                    seguidores
                  </p>
                  {deltaParts.length > 0 ? (
                    <p className="mt-2 text-[13px] font-medium text-ink">
                      Desde la última captura: {deltaParts.join(" · ")}.
                    </p>
                  ) : null}
                  {baselineParts.length > 0 ? (
                    <p className="mt-1 text-[13px] text-muted-fg">
                      {baselineParts.join(" y ")} en línea base — falta una
                      segunda captura para comparar.
                    </p>
                  ) : null}
                  {lastCaptureDate ? (
                    <p className="mt-2 text-xs text-muted-fg">
                      Última captura: {formatDateShort(lastCaptureDate)}
                    </p>
                  ) : null}
                </>
              ) : (
                <>
                  <p className="text-[15px] font-semibold text-ink">
                    Todavía no hay métricas
                  </p>
                  <p className="mt-1 text-sm text-muted-fg">
                    Registra tu primera captura y el resumen aparece aquí.
                  </p>
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => openScreen("metricas")}
                      className="flex h-10 cursor-pointer items-center rounded-full bg-primary px-4 text-sm font-semibold text-white transition-opacity duration-200 ease-apple hover:opacity-85"
                    >
                      Registrar captura
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <AggregateBriefing data={data} iso={iso} />
      </section>

      {/* ---------- Bento del universo, en orden de prioridad ---------- */}
      <div className="grid gap-4 md:grid-cols-3">
        <AlertsCard data={data} />
        <NextSlotCard data={data} iso={iso} />
        <NextSevenDaysCard data={data} iso={iso} />
        {(["evym", "antojo", "personal"] as WorkspaceId[]).map((id) => (
          <AccountCard key={id} wsId={id} ws={data[id]} />
        ))}
      </div>

      {/* ---------- Qué publicar ---------- */}
      <Recommendations />

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
            ¿Cuándo publico? · Programa un Reel · ¿Qué toca hoy?
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
