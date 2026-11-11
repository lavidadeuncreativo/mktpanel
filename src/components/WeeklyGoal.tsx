"use client";

import { Gift } from "lucide-react";
import type { WorkspaceData } from "@/lib/types";
import { WEEK_DAYS } from "@/lib/types";
import { weeklyProgress } from "@/lib/derive";
import { cn } from "./cn";

/**
 * The one bold element in the whole panel: a dark ink panel holding the
 * 7-day week. Everything else in the app stays quiet and flat.
 */
export function WeeklyGoal({ ws }: { ws: WorkspaceData }) {
  const week = weeklyProgress(ws);
  const winner = ws.anecdotes.find((a) => a.winner);
  const finalists = ws.anecdotes.filter((a) => a.finalist).length;

  const byDay = new Map<number, { title: string; published: boolean }>();
  for (const c of ws.content) {
    if (c.dayIndex !== null) {
      byDay.set(c.dayIndex, {
        title: c.title,
        published: c.status === "publicado",
      });
    }
  }

  return (
    <section
      aria-label="Meta semanal"
      className="rounded-xl bg-ink p-5 text-white sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold">
            Meta semanal
          </h2>
          <p className="mt-1 text-sm text-white/70">
            {week.published === week.total
              ? "Semana completa. Siete historias, siete días."
              : `${week.published} de ${week.total} historias publicadas. Quedan ${week.total - week.published}.`}
          </p>
        </div>
        <span className="rounded-full bg-white/10 px-3 py-1.5 text-sm font-semibold">
          {week.pct}%
        </span>
      </div>

      {/* Progress */}
      <div
        className="mt-5 h-2 w-full overflow-hidden rounded-full bg-white/15"
        role="progressbar"
        aria-valuenow={week.pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Avance de la meta semanal"
      >
        <div
          className="h-full rounded-full bg-teal-accent transition-[width] duration-200"
          style={{ width: `${week.pct}%` }}
        />
      </div>

      {/* Seven days */}
      <div className="mt-5 grid grid-cols-7 gap-2">
        {WEEK_DAYS.map((day, i) => {
          const slot = byDay.get(i);
          return (
            <div
              key={day}
              className={cn(
                "min-w-0 rounded-lg px-2 py-2.5 text-center",
                slot
                  ? slot.published
                    ? "bg-teal-accent/20 ring-1 ring-teal-accent/60"
                    : "bg-white/10 ring-1 ring-white/20"
                  : "border border-dashed border-white/25",
              )}
            >
              <p className="text-xs font-semibold text-white/60">{day}</p>
              <p
                className={cn(
                  "mt-1 truncate text-xs font-medium",
                  slot ? "text-white" : "text-white/40",
                )}
                title={slot ? slot.title : "Sin tema"}
              >
                {slot ? slot.title : "Sin tema"}
              </p>
            </div>
          );
        })}
      </div>

      {/* Giveaway summary */}
      <div className="mt-5 flex items-center gap-3 border-t border-white/10 pt-4">
        <Gift className="h-5 w-5 shrink-0 text-teal-accent" aria-hidden="true" />
        <p className="text-sm text-white/80">
          {winner
            ? `Giveaway: ganadora elegida, ${winner.name}.`
            : ws.anecdotes.length === 0
              ? "Giveaway: todavía no llega ninguna anécdota."
              : `Giveaway: ${ws.anecdotes.length} anécdotas, ${finalists} finalistas.`}
        </p>
      </div>
    </section>
  );
}
