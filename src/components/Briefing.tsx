"use client";

import {
  CalendarDays,
  CalendarRange,
  Lightbulb,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { usePanel } from "./panel-context";
import type { WorkspaceData, WorkspaceId } from "@/lib/types";
import { buildBriefing, type BriefingAction } from "@/lib/briefing";

/* ------------------------------------------------------------------ */
/* El briefing de Hoy: la tarjeta de vidrio del héroe que le dice a    */
/* Isra qué pasó, qué toca hoy, cómo va la semana y una recomendación.  */
/* Se calcula en cada render desde el store (buildBriefing): nada se   */
/* guarda en estado, así que al cambiar de espacio el texto se vuelve  */
/* a derivar y nunca se queda colgado en el espacio anterior.           */
/* ------------------------------------------------------------------ */

function BriefingActionButton({ action }: { action: BriefingAction }) {
  const { openScreen } = usePanel();
  return (
    <button
      type="button"
      onClick={() => openScreen(action.screen)}
      className="mt-3 flex h-9 cursor-pointer items-center rounded-full border border-white/40 bg-white/10 px-4 text-sm font-semibold text-white backdrop-blur-sm transition-colors duration-200 ease-apple hover:bg-white/20"
    >
      {action.label}
    </button>
  );
}

function BriefingCell({
  icon,
  label,
  children,
  action,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  action: BriefingAction;
}) {
  return (
    <div className="flex flex-col rounded-[14px] border border-white/20 bg-white/10 p-4 backdrop-blur-md">
      <p className="flex items-center gap-2 text-[13px] font-semibold text-white/80">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15 text-white">
          {icon}
        </span>
        {label}
      </p>
      <div className="mt-2 flex-1 space-y-1.5 text-[15px] leading-snug text-white">
        {children}
      </div>
      <BriefingActionButton action={action} />
    </div>
  );
}

export function Briefing({
  ws,
  wsId,
  iso,
}: {
  ws: WorkspaceData;
  wsId: WorkspaceId;
  iso: string;
}) {
  // Derivado en cada render, nunca cacheado: cambiar de espacio (o de
  // vista general) vuelve a calcular el texto con los datos actuales.
  const b = buildBriefing(ws, wsId, iso);

  return (
    <div
      aria-label="Briefing del día"
      className="glass mt-6 rounded-[16px] p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2 px-1">
        <p className="flex items-center gap-2 text-[15px] font-semibold text-white">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          Tu briefing de hoy
        </p>
        <p className="text-sm text-white/80">{b.dateLine}</p>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <BriefingCell
          icon={<TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />}
          label="Qué pasó"
          action={b.happened.action}
        >
          {b.happened.lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </BriefingCell>

        <BriefingCell
          icon={<CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />}
          label="Hoy"
          action={b.today.action}
        >
          <p className="font-semibold">{b.today.headline}</p>
          {b.today.detail ? <p>{b.today.detail}</p> : null}
          {b.today.hasTasks ? (
            <p className="text-white/85">
              {b.today.pendingTasks > 0
                ? `Te quedan ${b.today.pendingTasks} pendientes de la lista.`
                : "La lista de pendientes está al día."}
            </p>
          ) : null}
        </BriefingCell>

        <BriefingCell
          icon={<CalendarRange className="h-3.5 w-3.5" aria-hidden="true" />}
          label="Esta semana"
          action={b.week.action}
        >
          <p>
            <span className="text-[22px] leading-none font-semibold tabular-nums">
              {b.week.published}
            </span>{" "}
            de 7 publicados
            {b.week.inPreparation > 0
              ? ` · ${b.week.inPreparation} en preparación`
              : ""}
            .
          </p>
          <p className="text-white/85">Semana del {b.week.range}.</p>
        </BriefingCell>

        <BriefingCell
          icon={<Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />}
          label="Recomendación"
          action={b.recommendation.action}
        >
          <p>{b.recommendation.text}</p>
        </BriefingCell>
      </div>

      <p className="mt-3 px-1 text-xs text-white/60">
        En {b.wsShort}, con los datos que ya tienes guardados aquí.
      </p>
    </div>
  );
}
