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
import { RecommendationsCompact } from "./Recommendations";
import { buildJarvisLine } from "@/lib/briefing";
import type { WorkspaceData, WorkspaceId } from "@/lib/types";
import { NETWORK_LABELS, UNIVERSE_NETWORKS, WORKSPACES } from "@/lib/types";
import {
  latestByNetwork,
  previousByNetwork,
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
/* El Dashboard general "Universo", segunda iteración: UNA sola       */
/* vista, sin scroll, en 1440×900 y en 1280×800.                       */
/*                                                                     */
/* - Primero la línea de Jarvis: el resumen general en lenguaje        */
/*   llano, grande y legible (totales, lo más visto, qué toca hoy).    */
/* - Luego el bento, en orden de prioridad: lo que está pasando,        */
/*   cuándo publicar, los próximos 7 días, qué publicar y una mini     */
/*   tarjeta por cuenta. Una idea por tarjeta, texto grande estilo     */
/*   Apple (Helvetica Neue), nada de letra pequeña: el detalle vive    */
/*   detrás de los botones de drill-down, nunca debajo de un scroll.   */
/* - Todo derivado del store en cada render; sin datos, "Sin datos     */
/*   todavía" — nunca un 0 inventado.                                  */
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
      className="surface flex flex-col p-4"
    >
      <h3 className="flex items-center gap-2 text-[17px] font-semibold tracking-[-0.01em] text-ink">
        <Flame className="h-5 w-5 text-primary" aria-hidden="true" />
        Lo que está pasando
      </h3>

      {top ? (
        <>
          <p className="mt-2 truncate text-[22px] leading-snug font-semibold tracking-[-0.01em] text-ink">
            {top.item.title}
          </p>
          <p className="mt-1 text-[15px] leading-snug text-muted-fg">
            {WORKSPACES.find((w) => w.id === top.wsId)?.short} ·{" "}
            <span className="font-semibold text-ink">
              {formatNumber(top.item.views as number)} vistas
            </span>
            {ratio && ratio >= 1.5 && alerts.runnerUp
              ? ` · ${ratio.toFixed(1)}× más que ${alerts.runnerUp.item.title}`
              : ""}
          </p>
        </>
      ) : (
        <p className="mt-2 text-[15px] text-muted-fg">
          Todavía no hay Reels publicados: publica el primero y aquí
          aparece lo que despega.
        </p>
      )}

      {alerts.commentLeaders.length > 0 ? (
        <p className="mt-3 border-t border-line/70 pt-2.5 text-[15px] leading-snug text-muted-fg">
          <span className="inline-flex items-center gap-1.5 font-semibold text-muted-fg">
            <MessageSquare className="h-4 w-4" aria-hidden="true" />
            Comentarios:
          </span>{" "}
          {alerts.commentLeaders
            .map(
              (c) =>
                `${WORKSPACES.find((w) => w.id === c.wsId)?.short} · ${NETWORK_LABELS[c.network]} ${formatNumber(c.comments)}`,
            )
            .join(" · ")}{" "}
          <span className="text-[13px]">(por cuenta, no por Reel)</span>
        </p>
      ) : (
        <p className="mt-3 border-t border-line/70 pt-2.5 text-[15px] text-muted-fg">
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
    <article aria-label="Cuándo publicar" className="surface flex flex-col p-4">
      <h3 className="flex items-center gap-2 text-[17px] font-semibold tracking-[-0.01em] text-ink">
        <CalendarDays className="h-5 w-5 text-primary" aria-hidden="true" />
        ¿Cuándo publico?
      </h3>
      {slot?.reel ? (
        <>
          <p className="mt-2 text-[15px] leading-snug text-muted-fg">
            Primer hueco:{" "}
            <span className="font-semibold text-ink">
              {formatDayLong(slot.date)}
            </span>
            .
          </p>
          <div className="mt-2 flex items-center gap-2">
            <p className="min-w-0 flex-1 truncate text-[20px] leading-snug font-semibold tracking-[-0.01em] text-ink">
              {slot.reel.item.title}
            </p>
            <Pill tone={statusTone(slot.reel.item.status)}>
              {slot.reel.item.status === "imagenes"
                ? "Imágenes"
                : slot.reel.item.status === "edicion"
                  ? "Edición"
                  : slot.reel.item.status === "guion"
                    ? "Guion"
                    : "Idea"}
            </Pill>
          </div>
          <div className="mt-auto flex flex-wrap items-center gap-3 pt-3">
            <Button size="sm" onClick={scheduleThere}>
              Programar para ese día
            </Button>
            <button
              type="button"
              onClick={() => openScreen("agente")}
              className="cursor-pointer text-[14px] font-semibold text-primary hover:opacity-75"
            >
              Preguntar al agente
            </button>
          </div>
        </>
      ) : hasUnpublished ? (
        <p className="mt-2 text-[15px] text-muted-fg">
          No queda un día libre en los próximos 7 días: revisa el
          calendario, hay días con más de un Reel encima.
        </p>
      ) : (
        <p className="mt-2 text-[15px] text-muted-fg">
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
    <article aria-label="Próximos 7 días" className="surface p-3.5 md:col-span-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[17px] font-semibold tracking-[-0.01em] text-ink">
          Próximos 7 días
        </h3>
        <p className="text-[14px] text-muted-fg">
          {formatDateShort(first.iso)} – {formatDateShort(last.iso)}
          <button
            type="button"
            onClick={() => openScreen("calendario")}
            className="ml-3 cursor-pointer font-semibold text-primary hover:opacity-75"
          >
            Ver calendario
          </button>
        </p>
      </div>

      <div className="mt-2.5 grid grid-cols-7 gap-1.5">
        {plan.days.map((day) => (
          <div
            key={day.iso}
            className={cn(
              "min-w-0 rounded-[10px] border p-1",
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
            <div className="mt-1 space-y-1">
              {day.items.length === 0 ? (
                <p className="text-[11px] text-muted-fg">Libre</p>
              ) : (
                day.items.slice(0, 1).map(({ wsId, item }) => (
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
              {day.items.length > 1 ? (
                <p className="px-1.5 text-[11px] font-medium text-muted-fg">
                  +{day.items.length - 1} más
                </p>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {plan.inProduction.length > 0 ? (
        <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-line/70 pt-2.5">
          <p className="text-[13px] font-semibold text-muted-fg">
            En producción:
          </p>
          {plan.inProduction.map(({ wsId, item }) => (
            <button
              key={item.id}
              type="button"
              onClick={() => focusContent(item.id, wsId)}
              className="cursor-pointer"
              title={`${item.title} · ${WORKSPACES.find((w) => w.id === wsId)?.short}`}
            >
              {/* Solo el título: el color de la píldora ya dice el
                  estado, y el texto largo hacía saltar la fila a dos
                  líneas. */}
              <Pill tone={statusTone(item.status)}>{item.title}</Pill>
            </button>
          ))}
        </div>
      ) : null}
    </article>
  );
}

/* -------------------- 4. Una mini tarjeta por cuenta -------------------- */

function AccountMiniCard({
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
  const latest = latestByNetwork(ws.snapshots);

  // Redes del universo: solo las que siguen sin datos, en una línea.
  // Las que tienen datos ya se ven en las cifras de arriba.
  const nets = UNIVERSE_NETWORKS[wsId];
  const withoutData = nets.filter((n) => !latest[n]);
  const netsLine =
    withoutData.length > 0
      ? `Sin datos todavía: ${withoutData.map((n) => NETWORK_LABELS[n]).join(", ")}`
      : null;

  return (
    <article className="surface surface-hover flex flex-col p-3">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="min-w-0 truncate text-[17px] font-semibold tracking-[-0.01em] text-ink">
          {meta.name}
        </h3>
        <button
          type="button"
          onClick={() => setView(wsId)}
          className="flex shrink-0 cursor-pointer items-center gap-0.5 text-[14px] font-semibold text-primary hover:opacity-75"
        >
          Ver
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {d.hasSnapshots ? (
        <>
          <p className="mt-2 text-[28px] leading-none font-semibold tracking-[-0.02em] tabular-nums text-ink">
            <AnimatedNumber value={d.totals.views} format={formatNumber} />
            <span className="ml-1.5 text-[14px] font-medium text-muted-fg">
              vistas
            </span>
          </p>
          <p className="mt-1.5 text-[14px] text-muted-fg">
            <AnimatedNumber
              value={d.totals.followers}
              format={formatNumber}
            />{" "}
            seguidores
            {d.hasSecond && d.viewsDelta ? (
              <span
                className={cn(
                  "ml-2 inline-flex items-center gap-0.5 font-semibold",
                  d.viewsDelta.startsWith("+") ? "text-accent" : "text-danger",
                )}
              >
                {d.viewsDelta.startsWith("+") ? (
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <ArrowDownRight className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {d.viewsDelta}
              </span>
            ) : (
              <span className="ml-2">· Línea base</span>
            )}
          </p>
        </>
      ) : (
        <p className="mt-2 text-[15px] text-muted-fg">
          Todavía no hay métricas en esta cuenta.
        </p>
      )}

      <p className="mt-2 truncate border-t border-line/70 pt-2 text-[14px] text-muted-fg">
        {top ? (
          <>
            Lo más visto:{" "}
            <span className="font-semibold text-ink">{top.title}</span> —{" "}
            {formatNumber(top.views as number)} vistas
          </>
        ) : (
          "Sin contenido publicado todavía."
        )}
      </p>

      {netsLine ? (
        <p className="mt-1.5 truncate text-[13px] text-muted-fg">
          {netsLine}
        </p>
      ) : null}
    </article>
  );
}

export function GeneralDashboard() {
  const { data, openScreen } = usePanel();
  const iso = useTodayIso();
  const jarvis = buildJarvisLine(data, iso);

  return (
    <div className="flex flex-col gap-2.5">
      {/* ---------- 1. La línea de Jarvis: el resumen en lenguaje llano ---------- */}
      <section aria-label="Resumen general" className="relative px-1 pt-1 text-white sm:px-2">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <p className="min-w-0 flex-1 text-[24px] leading-[1.28] font-semibold tracking-[-0.02em] text-white">
            Hola, Isra. {jarvis.sentences.join(" ")}
          </p>
          <div className="flex shrink-0 gap-2.5">
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
              onClick={() => openScreen("agente")}
              className="flex h-11 cursor-pointer items-center gap-2 rounded-full border border-white/40 bg-white/10 px-5 text-[15px] font-semibold text-white transition-colors duration-200 ease-apple hover:bg-white/20"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Pregúntale al agente
            </button>
          </div>
        </div>
      </section>

      {/* ---------- 2. Lo que está pasando + ¿Cuándo publico? ---------- */}
      <div className="grid gap-2.5 md:grid-cols-3">
        <div className="md:col-span-2">
          <AlertsCard data={data} />
        </div>
        <NextSlotCard data={data} iso={iso} />
      </div>

      {/* ---------- 3. Próximos 7 días + Qué publicar ---------- */}
      <div className="grid gap-2.5 md:grid-cols-3">
        <NextSevenDaysCard data={data} iso={iso} />
        <RecommendationsCompact />
      </div>

      {/* ---------- 4. Una mini tarjeta por cuenta ---------- */}
      <div className="grid gap-2.5 md:grid-cols-3">
        {(["evym", "antojo", "personal"] as WorkspaceId[]).map((id) => (
          <AccountMiniCard key={id} wsId={id} ws={data[id]} />
        ))}
      </div>
    </div>
  );
}
