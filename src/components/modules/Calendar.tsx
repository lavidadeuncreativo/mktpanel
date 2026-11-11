"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePanel } from "../panel-context";
import type { ContentItem, ContentStatus, WorkspaceId } from "@/lib/types";
import { STATUS_LABELS, STATUS_ORDER, WEEK_DAYS } from "@/lib/types";
import { useTodayIso } from "../useToday";
import { formatDateShort } from "@/lib/store";
import {
  Button,
  EmptyState,
  Pill,
  SectionHeading,
  Stagger,
  StaggerItem,
} from "../ui";
import { statusTone } from "./Content";
import { cn } from "../cn";

/**
 * Calendario estilo Notion: la rejilla del mes con los Reels del
 * pipeline en su día, con el color de su estado (el mismo que en
 * Contenido). Tocar un Reel lo abre en Contenido para editarlo.
 *
 * Las fechas salen del mismo origen que el plan de la semana: la fecha
 * de publicación cuando existe, y si no el día de la semana asignado
 * (dentro de la semana actual). Sin fecha de publicación ni día, el
 * Reel aparece en "Sin fecha". Nada se inventa: los días sin Reel
 * quedan vacíos.
 */

/* --- Fechas en hora local (nunca `new Date("2026-11-09")`, que es UTC) --- */

function parseIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function isoOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function mondayOfWeek(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  c.setDate(c.getDate() - ((c.getDay() + 6) % 7));
  return c;
}

const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

/** Día en que cae un Reel: su fecha de publicación, o el día de la
 *  semana que tiene asignado dentro de la semana actual. Null = sin
 *  fecha (ni publicación ni día). */
function itemDateISO(item: ContentItem, monday: Date): string | null {
  if (item.publishDate) return item.publishDate;
  if (item.dayIndex !== null && item.dayIndex !== undefined) {
    const d = new Date(monday);
    d.setDate(d.getDate() + item.dayIndex);
    return isoOf(d);
  }
  return null;
}

interface DatedItem {
  item: ContentItem;
  ws: WorkspaceId;
}

export function Calendar() {
  const { data, view, openScreen, focusContent } = usePanel();
  const todayIso = useTodayIso();
  const today = parseIso(todayIso);
  const monday = useMemo(() => mondayOfWeek(today), [today]);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const isCurrentMonth =
    viewYear === today.getFullYear() && viewMonth === today.getMonth();

  // Los Reels del espacio activo; en "general", los de los tres.
  const allItems: DatedItem[] = useMemo(() => {
    if (view === "general") {
      return (["evym", "antojo", "personal"] as WorkspaceId[]).flatMap(
        (ws) => data[ws].content.map((item) => ({ item, ws })),
      );
    }
    return data[view].content.map((item) => ({ item, ws: view }));
  }, [data, view]);

  // Fecha de cada Reel (o null si no tiene).
  const dated = useMemo(
    () =>
      allItems.map((d) => ({ ...d, date: itemDateISO(d.item, monday) })),
    [allItems, monday],
  );

  const byDate = useMemo(() => {
    const map = new Map<string, DatedItem[]>();
    for (const d of dated) {
      if (!d.date) continue;
      const arr = map.get(d.date) ?? [];
      arr.push({ item: d.item, ws: d.ws });
      map.set(d.date, arr);
    }
    return map;
  }, [dated]);

  const unscheduled = dated.filter((d) => !d.date);

  // Resumen de la semana actual (lunes a domingo de hoy).
  const weekEnd = new Date(monday);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekItems = dated.filter(
    (d) =>
      d.date && d.date >= isoOf(monday) && d.date <= isoOf(weekEnd),
  );
  const weekCounts = STATUS_ORDER.reduce(
    (acc, s) => {
      acc[s] = weekItems.filter((d) => d.item.status === s).length;
      return acc;
    },
    {} as Record<ContentStatus, number>,
  );
  const weekPublished = weekItems.filter(
    (d) => d.item.status === "publicado",
  ).length;

  // Rejilla del mes: 6 semanas x 7 días, empezando el lunes.
  const first = new Date(viewYear, viewMonth, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const gridStart = new Date(viewYear, viewMonth, 1 - startOffset);
  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });

  const shiftMonth = (delta: number) => {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  const monthLabel = `${MONTHS[viewMonth][0].toUpperCase()}${MONTHS[viewMonth].slice(1)} de ${viewYear}`;

  const goToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
  };

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Calendario"
        description={
          view === "general"
            ? "Los Reels de tus tres espacios en el mes: idea, guion, imágenes, edición y publicado. Toca un Reel para editarlo en Contenido."
            : "Tus Reels en el mes: idea, guion, imágenes, edición y publicado. Toca un Reel para editarlo en Contenido."
        }
        action={
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              aria-label="Mes anterior"
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-line bg-card text-muted-fg transition-colors hover:text-ink"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={goToday}
              disabled={isCurrentMonth}
              className="h-10 cursor-pointer rounded-full border border-line bg-card px-4 text-sm font-medium text-ink transition-colors hover:bg-black/[0.03] disabled:cursor-default disabled:opacity-40"
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              aria-label="Mes siguiente"
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-line bg-card text-muted-fg transition-colors hover:text-ink"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        }
      />

      <Stagger>
        {/* Esta semana, de un vistazo */}
        <StaggerItem className="surface surface-hover p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-base font-semibold tracking-[-0.01em] text-ink">
              Esta semana
            </h2>
            <p className="text-sm font-semibold text-ink">
              {weekPublished} de 7 publicados
            </p>
          </div>
          {weekItems.length === 0 ? (
            <p className="mt-2 text-sm text-muted-fg">
              Sin Reels programados esta semana. Agrega uno en Contenido y
              aparece aquí.
            </p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {STATUS_ORDER.map((s) =>
                weekCounts[s] > 0 ? (
                  <Pill key={s} tone={statusTone(s)}>
                    {STATUS_LABELS[s]}: {weekCounts[s]}
                  </Pill>
                ) : null,
              )}
            </div>
          )}
          <p className="mt-3 text-[13px] text-muted-fg">
            Semana del {formatDateShort(isoOf(monday))} al{" "}
            {formatDateShort(isoOf(weekEnd))}.
          </p>
        </StaggerItem>

        {/* Sin fecha, ARRIBA: lo que está en producción sin día es lo
            primero que hay que ver — antes estaba debajo de la rejilla
            y había que scrollear para encontrarlo. */}
        {unscheduled.length > 0 ? (
          <StaggerItem className="surface p-5">
            <h2 className="text-base font-semibold tracking-[-0.01em] text-ink">
              Sin fecha
            </h2>
            <p className="mt-0.5 mb-3 text-sm text-muted-fg">
              Estos Reels no tienen día ni fecha de publicación. Toca uno
              para asignárselos en Contenido.
            </p>
            <div className="flex flex-wrap gap-2">
              {unscheduled.map(({ item, ws }) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => focusContent(item.id, ws)}
                  className="cursor-pointer"
                >
                  <Pill tone={statusTone(item.status)}>
                    {item.title} · {STATUS_LABELS[item.status]}
                  </Pill>
                </button>
              ))}
            </div>
          </StaggerItem>
        ) : null}

        {/* Rejilla del mes */}
        <StaggerItem className="surface p-5">
          <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-ink">
            {monthLabel}
          </h2>
          <div className="mt-4 grid grid-cols-7 gap-1.5">
            {WEEK_DAYS.map((d) => (
              <p
                key={d}
                className="pb-1 text-center text-xs font-semibold text-muted-fg"
              >
                {d}
              </p>
            ))}
            {cells.map((d) => {
              const iso = isoOf(d);
              const inMonth = d.getMonth() === viewMonth;
              const isToday = iso === todayIso;
              const items = inMonth ? (byDate.get(iso) ?? []) : [];
              const shown = items.slice(0, 3);
              const extra = items.length - shown.length;
              return (
                <div
                  key={iso}
                  className={cn(
                    "min-h-[88px] rounded-[10px] border p-1.5 sm:min-h-[104px] sm:p-2",
                    isToday
                      ? "border-primary bg-primary-soft/60 ring-1 ring-primary"
                      : inMonth
                        ? "border-line bg-card"
                        : "border-line/50 bg-black/[0.015]",
                  )}
                >
                  <p
                    className={cn(
                      "text-[13px] leading-none font-semibold",
                      isToday
                        ? "text-primary-text"
                        : inMonth
                          ? "text-ink"
                          : "text-muted-fg/50",
                    )}
                  >
                    {d.getDate()}
                  </p>
                  <div className="mt-1.5 space-y-1">
                    {shown.length === 0 && inMonth ? (
                      <p className="px-1.5 text-[11px] text-muted-fg/50">
                        Libre
                      </p>
                    ) : null}
                    {shown.map(({ item, ws }) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => focusContent(item.id, ws)}
                        aria-label={`${item.title}, ${STATUS_LABELS[item.status]}, ${formatDateShort(iso)}`}
                        title={`${item.title} · ${STATUS_LABELS[item.status]}`}
                        className={cn(
                          "block w-full cursor-pointer truncate rounded-md px-1.5 py-1 text-left text-[11px] leading-tight font-semibold transition-opacity hover:opacity-80",
                          item.status === "publicado" &&
                            "bg-accent-soft text-accent-text",
                          item.status === "edicion" &&
                            "bg-primary-soft text-primary-text",
                          item.status === "imagenes" &&
                            "bg-violet-soft text-violet-text",
                          item.status === "guion" &&
                            "bg-amber-soft text-amber-text",
                          item.status === "idea" &&
                            "bg-black/[0.05] text-[#57534e]",
                        )}
                      >
                        {item.title}
                      </button>
                    ))}
                    {extra > 0 ? (
                      <p className="px-1.5 text-[11px] font-medium text-muted-fg">
                        +{extra} más
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Leyenda de estados */}
          <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
            {STATUS_ORDER.map((s) => (
              <Pill key={s} tone={statusTone(s)}>
                {STATUS_LABELS[s]}
              </Pill>
            ))}
          </div>
        </StaggerItem>

        {/* Espacio vacío: el calendario es real, pero no hay nada que poner */}
        {allItems.length === 0 ? (
          <EmptyState
            title="Sin Reels todavía"
            description="Este espacio aún no tiene Reels en el pipeline. Agrega el primero en Contenido y aparecerá en su día aquí."
            action={
              <Button onClick={() => openScreen("contenido")}>
                Ir a Contenido
              </Button>
            }
          />
        ) : null}
      </Stagger>
    </div>
  );
}
