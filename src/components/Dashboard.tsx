"use client";

import {
  Check,
  ChevronRight,
  Clapperboard,
  Lightbulb,
  ListVideo,
} from "lucide-react";
import { usePanel, type ScreenId } from "./panel-context";
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
  weeklyProgress,
  workspaceTotals,
} from "@/lib/derive";
import {
  formatDateLong,
  formatDateShort,
  formatNumber,
  todayIso,
  uid,
} from "@/lib/store";
import { WeekPlan } from "./WeekPlan";
import { useTodayIso } from "./useToday";
import {
  Button,
  EmptyState,
  GroupedList,
  GroupedRow,
  Pill,
  RowChevron,
  SectionHeader,
} from "./ui";

/* ------------------------------------------------------------------ */
/* Hoy, simplificado (Apple + Notion):                                */
/*                                                                    */
/* - Una sola columna angosta, como una página de Notion: aire, un    */
/*   título por pantalla y etiquetas pequeñas.                        */
/* - Lo primero es el trabajo del día: el Reel de hoy y su siguiente  */
/*   paso, con un solo botón principal. Es el único elemento con      */
/*   peso en la pantalla; todo lo demás es texto y filas tranquilas.  */
/* - Las métricas son una tira de cifras, no tarjetas ni gráficas:    */
/*   con una sola captura no hay tendencia que graficar, así que la   */
/*   línea y la dona viven solo en Métricas, que es su lugar.         */
/* - Lo vacío invita a actuar con un solo botón claro.                */
/*                                                                    */
/* Regla de honestidad: nunca se inventan números ni tendencias.      */
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

/** Una cifra de la tira de métricas: número grande, etiqueta pequeña,
 *  sin tarjeta, sin píldora, sin sparkline. */
function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-[24px] leading-none font-semibold tracking-[-0.02em] tabular-nums text-ink">
        {value}
      </p>
      <p className="mt-1 text-[13px] text-muted-fg">{label}</p>
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

  const hasData = ws.snapshots.length > 0;
  const lastCaptureDate = hasData
    ? [...ws.snapshots].sort((a, b) => b.date.localeCompare(a.date))[0].date
    : null;

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

  return (
    <div className="mx-auto w-full max-w-[720px] space-y-8">
      {/* Título de la página */}
      <div>
        <h2 className="text-[28px] leading-tight font-semibold tracking-[-0.02em] text-ink">
          {formatDateLong(iso)}
        </h2>
        <p className="mt-1 text-[15px] text-muted-fg">
          {reel
            ? reel.status === "publicado"
              ? `Hoy ya salió: ${reel.title}.`
              : `Hoy toca publicar: ${reel.title}.`
            : "Hoy no hay Reel asignado."}
        </p>
      </div>

      {/* El trabajo del día: el único elemento con peso */}
      <section className="surface p-6" aria-label="Reel de hoy">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[13px] font-semibold text-muted-fg">
            Reel de hoy
          </p>
          {reel ? (
            <Pill tone={reel.status === "publicado" ? "green" : "blue"}>
              {STATUS_LABELS[reel.status]}
            </Pill>
          ) : null}
        </div>
        {reel ? (
          <>
            <p className="mt-3 text-[22px] leading-snug font-semibold tracking-[-0.01em] text-ink">
              {reel.title}
            </p>
            <p className="mt-1 text-[15px] text-muted-fg">
              {step?.label}
              {reel.views !== null
                ? ` · ${formatNumber(reel.views)} reproducciones`
                : ""}
            </p>
            <div className="mt-5">
              {reel.status !== "publicado" ? (
                <Button size="lg" onClick={() => advance(reel, wsId, update)}>
                  {step?.action}
                </Button>
              ) : (
                <Button size="lg" onClick={open("metricas")}>
                  Registrar métricas del Reel
                </Button>
              )}
            </div>
            <button
              type="button"
              onClick={open("contenido")}
              className="mt-1 flex min-h-11 w-full cursor-pointer items-center justify-center gap-1 text-[15px] font-medium text-primary transition-opacity duration-200 ease-apple hover:opacity-70"
            >
              Ver pipeline
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </>
        ) : (
          <>
            <p className="mt-3 text-[22px] leading-snug font-semibold tracking-[-0.01em] text-ink">
              Hoy no hay Reel asignado
            </p>
            <p className="mt-1 text-[15px] text-muted-fg">
              Agrega un Reel al pipeline o pasa una idea a guion y el día
              queda cubierto.
            </p>
            <div className="mt-5">
              <Button size="lg" onClick={open("contenido")}>
                Agregar Reel al pipeline
              </Button>
            </div>
          </>
        )}
      </section>

      {/* Métricas: tira tranquila de cifras, o invitación honesta */}
      {hasData ? (
        <section aria-label="Resumen de métricas">
          <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4">
            <Stat value={formatNumber(totals.views)} label="Vistas totales" />
            <Stat
              value={formatNumber(totals.followers)}
              label="Seguidores"
            />
            <Stat
              value={formatNumber(totals.comments)}
              label="Comentarios"
            />
            <Stat
              value={String(streakCount)}
              label={streakCount === 1 ? "Día de racha" : "Días de racha"}
            />
          </div>
          <p className="mt-4 text-[13px] text-muted-fg">
            Llevas {week.published} de 7 publicados esta semana.
            {lastCaptureDate
              ? ` Última captura: ${formatDateShort(lastCaptureDate)}.`
              : ""}
          </p>
        </section>
      ) : (
        <EmptyState
          title="Todavía no hay métricas"
          description="Registra tu primera captura de Business Suite y aquí aparecerán tus números. Con la segunda captura aparecen las tendencias."
          action={
            <Button onClick={open("metricas")}>Registrar captura</Button>
          }
        />
      )}

      {/* La semana */}
      <section>
        <SectionHeader title="La semana" meta={`${week.published} de 7`} />
        <WeekPlan
          ws={ws}
          today={today}
          onSelect={() => openScreen("contenido")}
        />
      </section>

      {/* A continuación */}
      <section>
        <div className="flex items-baseline justify-between gap-3 px-4 pb-1.5">
          <h2 className="text-[13px] font-semibold text-muted-fg">
            A continuación
          </h2>
          <button
            type="button"
            onClick={open("contenido")}
            className="cursor-pointer text-[13px] font-medium text-primary transition-opacity duration-200 ease-apple hover:opacity-70"
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
      </section>

      {/* Siguiente tema */}
      <section>
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
      </section>
    </div>
  );
}
