"use client";

import { Check } from "lucide-react";
import type { ContentItem, WorkspaceData } from "@/lib/types";
import { WEEK_DAYS } from "@/lib/types";
import { weekPlan } from "@/lib/derive";
import { GroupedList, GroupedRow, RowChevron } from "./ui";

/**
 * La semana como lista agrupada estilo iOS: una fila de 44pt por día,
 * con el Reel que le toca y su estado. El día de hoy va en azul, lo
 * publicado lleva palomita verde y la fila se puede tocar cuando tiene
 * un Reel. Compartida por Hoy, Resumen y Contenido.
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
    <GroupedList>
      {plan.map(({ dayIndex, item }, i) => {
        const isToday = dayIndex === today;
        const published = item?.status === "publicado";
        const tappable = Boolean(item && onSelect);
        return (
          <GroupedRow
            key={dayIndex}
            divider={i > 0}
            title={
              isToday
                ? `${WEEK_DAYS[dayIndex]} · Hoy`
                : WEEK_DAYS[dayIndex]
            }
            titleClassName={isToday ? "font-semibold text-primary" : undefined}
            subtitle={item ? item.title : "Sin tema"}
            onClick={tappable ? () => onSelect?.(item!) : undefined}
            ariaLabel={
              item
                ? `${WEEK_DAYS[dayIndex]}: ${item.title}`
                : `${WEEK_DAYS[dayIndex]}: sin tema`
            }
            accessory={
              published ? (
                <Check
                  className="h-5 w-5 shrink-0 text-accent"
                  aria-hidden="true"
                />
              ) : tappable ? (
                <RowChevron />
              ) : undefined
            }
          />
        );
      })}
    </GroupedList>
  );
}
