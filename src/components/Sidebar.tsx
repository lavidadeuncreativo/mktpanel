"use client";

import {
  BarChart3,
  BookOpen,
  CheckSquare,
  Gift,
  Home,
  Lightbulb,
  Link2,
  ListVideo,
} from "lucide-react";
import { SCREEN_TITLES, usePanel, type ScreenId } from "./panel-context";
import { WORKSPACES, type WorkspaceId } from "@/lib/types";
import { workspaceTotals } from "@/lib/derive";
import { formatNumber } from "@/lib/store";
import { SegmentedControl } from "./ui";
import { cn } from "./cn";

/**
 * Barra lateral, estilo Notion + Apple: marca arriba, el selector de
 * espacio a la vista (el panel gestiona tres marcas — EVYM, Antojo y
 * Personal — y antes el selector vivía abajo, escondido, así que el
 * panel parecía solo de EVYM), y debajo la navegación con las 8
 * secciones. Una sola cosa con peso: el espacio activo.
 */

const NAV: { id: ScreenId; icon: React.ReactNode }[] = [
  { id: "hoy", icon: <Home className="h-[18px] w-[18px]" aria-hidden="true" /> },
  { id: "metricas", icon: <BarChart3 className="h-[18px] w-[18px]" aria-hidden="true" /> },
  { id: "contenido", icon: <ListVideo className="h-[18px] w-[18px]" aria-hidden="true" /> },
  { id: "ideas", icon: <Lightbulb className="h-[18px] w-[18px]" aria-hidden="true" /> },
  { id: "giveaway", icon: <Gift className="h-[18px] w-[18px]" aria-hidden="true" /> },
  { id: "pendientes", icon: <CheckSquare className="h-[18px] w-[18px]" aria-hidden="true" /> },
  { id: "bitacora", icon: <BookOpen className="h-[18px] w-[18px]" aria-hidden="true" /> },
  { id: "conexiones", icon: <Link2 className="h-[18px] w-[18px]" aria-hidden="true" /> },
];

export function Sidebar() {
  const { data, screen, openScreen, view, setView } = usePanel();

  // "General" ya no se ofrece en la interfaz; si por algún estado
  // heredado llegara, se cae a EVYM.
  const activeView: WorkspaceId = view === "general" ? "evym" : view;
  const activeWs =
    WORKSPACES.find((w) => w.id === activeView) ?? WORKSPACES[0];
  const totals = workspaceTotals(data[activeView]);
  const hasData = data[activeView].snapshots.length > 0;

  const visibleNav = NAV.filter(
    (n) => n.id !== "giveaway" || activeView === "evym",
  );

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-white lg:flex">
      {/* Marca */}
      <div className="flex items-center gap-2.5 px-5 pt-5 pb-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-ink text-[13px] font-bold text-white">
          EV
        </span>
        <div className="min-w-0">
          <p className="text-[15px] leading-tight font-semibold tracking-[-0.01em] text-ink">
            Panel
          </p>
          <p className="text-xs text-muted-fg">Marketing de contenido</p>
        </div>
      </div>

      {/* Espacio: arriba y a la vista, no escondido abajo */}
      <div className="border-b border-line px-4 pt-1 pb-4">
        <p className="px-1 pb-1.5 text-xs font-medium text-muted-fg">
          Espacio
        </p>
        <SegmentedControl
          options={WORKSPACES.map((w) => ({ id: w.id, label: w.short }))}
          value={activeView}
          onChange={(id) => setView(id)}
          ariaLabel="Espacio de trabajo"
        />
        <p className="mt-2 px-1 text-xs leading-snug text-muted-fg">
          {activeWs.name}
          {hasData
            ? ` · ${formatNumber(totals.views)} vistas`
            : " · sin datos todavía"}
        </p>
      </div>

      {/* Navegación */}
      <nav aria-label="Secciones del panel" className="flex-1 px-3 pt-3">
        <p className="px-3 pb-1.5 text-xs font-medium text-muted-fg">
          Panel
        </p>
        <ul className="space-y-0.5">
          {visibleNav.map((item) => {
            const active = screen === item.id;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => openScreen(item.id)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex min-h-10 w-full cursor-pointer items-center gap-3 rounded-lg px-3 text-[14px] transition-colors duration-150",
                    active
                      ? "bg-black/[0.05] font-semibold text-ink"
                      : "font-medium text-[#48484a] hover:bg-black/[0.03] hover:text-ink",
                  )}
                >
                  {active ? (
                    <span
                      className="absolute top-1/2 left-0 h-5 w-[3px] -translate-y-1/2 rounded-full bg-primary"
                      aria-hidden="true"
                    />
                  ) : null}
                  <span
                    className={cn("shrink-0", active ? "text-ink" : "text-muted-fg")}
                    aria-hidden="true"
                  >
                    {item.icon}
                  </span>
                  {SCREEN_TITLES[item.id]}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-line px-5 py-4">
        <p className="text-[11px] leading-snug text-muted-fg">
          Tus datos viven solo en este navegador. Nada sale de aquí.
        </p>
      </div>
    </aside>
  );
}
