"use client";

import { Check } from "lucide-react";
import type { ContentItem, WorkspaceData } from "@/lib/types";
import { WEEK_DAYS } from "@/lib/types";
import { weekPlan } from "@/lib/derive";
import { cn } from "./cn";

/**
 * The 7 slots of the week. One cell per day: the Reel that belongs there,
 * its state, and a marker on today. Shared by Hoy, Resumen y Contenido.
 */
export function WeekPlan({
  ws,
  today,
  onSelect,
}: {
  ws: WorkspaceData;
  /** Today's slot (0 = Monday … 6 = Sunday), from useTodayIso(). */
  today: number;
  onSelect?: (item: ContentItem) => void;
}) {
  const plan = weekPlan(ws);

  return (
    <div className="grid grid-cols-7 gap-2">
      {plan.map(({ dayIndex, item }) => {
        const isToday = dayIndex === today;
        const published = item?.status === "publicado";
        return (
          <button
            key={dayIndex}
            type="button"
            disabled={!item || !onSelect}
            onClick={() => item && onSelect?.(item)}
            aria-label={
              item
                ? `${WEEK_DAYS[dayIndex]}: ${item.title}`
                : `${WEEK_DAYS[dayIndex]}: sin tema`
            }
            className={cn(
              "min-w-0 rounded-[14px] px-2 py-3 text-center transition-colors duration-200 ease-apple",
              item
                ? published
                  ? "bg-primary-soft"
                  : "bg-control/60 hover:bg-control"
                : "border border-dashed border-line",
              onSelect && item && "cursor-pointer",
            )}
          >
            <span className="flex items-center justify-center gap-1">
              <span
                className={cn(
                  "text-xs font-semibold",
                  isToday ? "text-primary" : "text-muted-fg",
                )}
              >
                {WEEK_DAYS[dayIndex]}
              </span>
              {isToday ? (
                <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
              ) : null}
            </span>
            <span
              className={cn(
                "mt-1.5 flex items-center justify-center gap-1 truncate text-xs font-medium",
                item ? "text-ink" : "text-muted-fg/70",
              )}
              title={item ? item.title : "Sin tema"}
            >
              {published ? (
                <Check
                  className="h-3.5 w-3.5 shrink-0 text-accent-text"
                  aria-hidden="true"
                />
              ) : null}
              {item ? item.title : "Sin tema"}
            </span>
          </button>
        );
      })}
    </div>
  );
}
