"use client";

import { Gift } from "lucide-react";
import type { WorkspaceData } from "@/lib/types";
import { todayDayIndex, weeklyProgress } from "@/lib/derive";
import { Progress } from "./ui";
import { WeekPlan } from "./WeekPlan";
import { useTodayIso } from "./useToday";

/**
 * The week's goal, on a light surface: progress, the 7-day plan, and the
 * giveaway status. The week grid is shared with the Hoy view.
 */
export function WeeklyGoal({ ws }: { ws: WorkspaceData }) {
  const week = weeklyProgress(ws);
  const today = todayDayIndex(useTodayIso());
  const winner = ws.anecdotes.find((a) => a.winner);
  const finalists = ws.anecdotes.filter((a) => a.finalist).length;

  return (
    <section aria-label="Meta semanal" className="surface p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[22px] leading-tight font-semibold tracking-[-0.02em] text-ink">
            Meta semanal
          </h2>
          <p className="mt-1 text-[15px] text-muted-fg">
            {week.published === week.total
              ? "Semana completa. Siete historias, siete días."
              : `${week.published} de ${week.total} historias publicadas. Quedan ${week.total - week.published}.`}
          </p>
        </div>
        <span className="rounded-full bg-primary-soft px-3 py-1.5 text-sm font-semibold text-primary-text">
          {week.pct}%
        </span>
      </div>

      <Progress value={week.pct} className="mt-5" />

      <div className="mt-5">
        <WeekPlan ws={ws} today={today} />
      </div>

      {/* Giveaway summary */}
      <div className="mt-5 flex items-center gap-3 border-t border-line pt-4">
        <Gift className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <p className="text-sm text-muted-fg">
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
