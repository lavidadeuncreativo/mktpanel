"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronRight,
  Clapperboard,
  Sparkles,
} from "lucide-react";
import { usePanel } from "./panel-context";
import { AggregateBriefing } from "./Briefing";
import { Recommendations } from "./Recommendations";
import type { WorkspaceData, WorkspaceId } from "@/lib/types";
import { WORKSPACES } from "@/lib/types";
import {
  aggregateTotals,
  previousByNetwork,
  weeklyProgress,
  workspaceTotals,
} from "@/lib/derive";
import {
  formatDateShort,
  formatDeltaPct,
  formatNumber,
} from "@/lib/store";
import { useTodayIso } from "./useToday";
import { AnimatedNumber } from "./ui";
import { cn } from "./cn";

/* ------------------------------------------------------------------ */
/* El Dashboard general de verdad: ya no es EVYM disfrazado. Resume   */
/* TODO lo de las tres cuentas — totales agregados, briefing agregado, */
/* una tarjeta por cuenta con cómo le fue y su mejor contenido, y la   */
/* sección "Qué publicar". Cada tarjeta entra a la vista de su cuenta. */
/* Los deltas solo se afirman donde hay segunda captura; Antojo y      */
/* Personal lo dicen en línea base. El Hoy por espacio sigue igual:    */
/* esta vista solo existe cuando view === "general".                    */
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

function AccountCard({
  wsId,
  ws,
}: {
  wsId: WorkspaceId;
  ws: WorkspaceData;
}) {
  const { setView } = usePanel();
  const meta = WORKSPACES.find((w) => w.id === wsId) ?? {
    id: wsId,
    name: wsId,
    short: wsId,
    description: "",
  };
  const d = workspaceDelta(ws);
  const top = topContent(ws);
  const week = weeklyProgress(ws);

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
                className="flex h-11 cursor-pointer items-center gap-2 rounded-full border border-white/40 bg-white/10 px-5 text-[15px] font-semibold text-white backdrop-blur-sm transition-colors duration-200 ease-apple hover:bg-white/20"
              >
                Registrar captura
              </button>
            </div>
          </div>

          {/* Tarjeta de resumen en vidrio, con tarjetas apiladas detrás. */}
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
              {allSnapshots.length > 0 ? (
                <>
                  <p className="text-[13px] font-medium text-white/80">
                    Vistas totales · todas las cuentas
                  </p>
                  <p className="mt-1 text-[34px] leading-none font-semibold tracking-[-0.02em] tabular-nums text-white">
                    <AnimatedNumber
                      value={totals.views}
                      format={formatNumber}
                    />
                  </p>
                  <p className="mt-2 text-sm text-white/85">
                    <AnimatedNumber
                      value={totals.followers}
                      format={formatNumber}
                    />{" "}
                    seguidores
                  </p>
                  {deltaParts.length > 0 ? (
                    <p className="mt-2 text-[13px] font-medium text-white">
                      Desde la última captura: {deltaParts.join(" · ")}.
                    </p>
                  ) : null}
                  {baselineParts.length > 0 ? (
                    <p className="mt-1 text-[13px] text-white/80">
                      {baselineParts.join(" y ")} en línea base — falta una
                      segunda captura para comparar.
                    </p>
                  ) : null}
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

        <AggregateBriefing data={data} iso={iso} />
      </section>

      {/* ---------- Una tarjeta por cuenta ---------- */}
      <div className="grid gap-4 md:grid-cols-3">
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
