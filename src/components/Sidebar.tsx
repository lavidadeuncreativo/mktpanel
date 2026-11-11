"use client";

import {
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckSquare,
  Gift,
  LayoutDashboard,
  Lightbulb,
  ListVideo,
} from "lucide-react";
import { MODULES, usePanel, type ModuleId } from "./panel-context";
import { weeklyProgress } from "@/lib/derive";
import { WORKSPACES } from "@/lib/types";
import { Progress } from "./ui";
import { cn } from "./cn";

const MODULE_ICONS: Record<ModuleId, React.ReactNode> = {
  hoy: <CalendarDays className="h-[18px] w-[18px]" aria-hidden="true" />, 
  resumen: <LayoutDashboard className="h-[18px] w-[18px]" aria-hidden="true" />,
  metricas: <BarChart3 className="h-[18px] w-[18px]" aria-hidden="true" />,
  contenido: <ListVideo className="h-[18px] w-[18px]" aria-hidden="true" />,
  ideas: <Lightbulb className="h-[18px] w-[18px]" aria-hidden="true" />,
  giveaway: <Gift className="h-[18px] w-[18px]" aria-hidden="true" />,
  pendientes: <CheckSquare className="h-[18px] w-[18px]" aria-hidden="true" />,
  bitacora: <BookOpen className="h-[18px] w-[18px]" aria-hidden="true" />,
};

function NavItem({
  id,
  label,
  active,
  onClick,
  badge,
}: {
  id: ModuleId;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-full px-3.5 text-[15px] transition-colors duration-200 ease-apple",
        active
          ? "bg-control font-semibold text-ink"
          : "font-normal text-muted-fg hover:bg-control/60 hover:text-ink",
      )}
    >
      {MODULE_ICONS[id]}
      <span className="flex-1 text-left">{label}</span>
      {badge !== undefined && badge > 0 ? (
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-semibold",
            active ? "bg-white text-ink" : "bg-control text-muted-fg",
          )}
        >
          {badge}
        </span>
      ) : null}
    </button>
  );
}

export function Sidebar() {
  const { data, view, module, setModule } = usePanel();

  // Giveaway only lives in EVYM.
  const visibleModules = MODULES.filter(
    (m) => m.id !== "giveaway" || view === "evym",
  );
  const groups = Array.from(new Set(visibleModules.map((m) => m.group)));

  const evym = data.evym;
  const week = weeklyProgress(evym);
  const pending = evym.tasks.filter((t) => !t.done).length;
  const anecdotes = evym.anecdotes.length;

  const badgeFor = (id: ModuleId): number | undefined => {
    if (id === "pendientes") return pending;
    if (id === "giveaway") return anecdotes;
    return undefined;
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[250px] flex-col border-r border-line/70 bg-[#fbfbfd]/80 backdrop-blur-xl lg:flex">
      {/* Brand */}
      <div className="px-5 pt-6 pb-4">
        <p className="text-[19px] leading-tight font-semibold tracking-[-0.02em] text-ink">
          Panel EVYM
        </p>
        <p className="mt-0.5 text-[13px] text-muted-fg">
          Marketing de contenido
        </p>
      </div>

      {/* Workspace mini-list */}
      <div className="px-5 pb-3">
        <p className="mb-2 text-xs font-medium text-muted-fg">Espacios</p>
        <div className="flex flex-col gap-1">
          {WORKSPACES.map((ws) => (
            <div
              key={ws.id}
              className="flex items-center gap-2.5 rounded-full px-2.5 py-1.5 text-sm"
            >
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  ws.id === "evym"
                    ? "bg-accent"
                    : ws.id === "antojo"
                      ? "bg-amber"
                      : "bg-primary",
                )}
                aria-hidden="true"
              />
              <span className="font-medium text-ink">{ws.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <nav
        aria-label="Módulos del panel"
        className="scroll-thin flex-1 overflow-y-auto px-3 pb-4"
      >
        {groups.map((group) => (
          <div key={group} className="mt-4 first:mt-1">
            <p className="px-3.5 pb-1.5 text-xs font-medium text-muted-fg">
              {group}
            </p>
            <div className="flex flex-col gap-0.5">
              {visibleModules
                .filter((m) => m.group === group)
                .map((m) => (
                  <NavItem
                    key={m.id}
                    id={m.id}
                    label={m.label}
                    active={module === m.id}
                    onClick={() => setModule(m.id)}
                    badge={badgeFor(m.id)}
                  />
                ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Weekly goal block */}
      <div className="border-t border-line/70 p-4">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-semibold text-ink">Meta semanal</p>
          <p className="text-sm font-semibold text-ink">
            {week.published} de {week.total}
          </p>
        </div>
        <Progress value={week.pct} className="mt-2.5" />
        <p className="mt-2 text-xs text-muted-fg">
          {week.published === week.total
            ? "Semana completa."
            : `${week.total - week.published} videos pendientes esta semana.`}
        </p>
      </div>
    </aside>
  );
}
