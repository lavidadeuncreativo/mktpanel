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
import {
  SCREEN_TITLES,
  usePanel,
  type ScreenId,
} from "./panel-context";
import { WORKSPACES, type WorkspaceId } from "@/lib/types";
import { cn } from "./cn";

/**
 * Barra lateral delgada estilo dashboard analítico: marca arriba,
 * navegación con icono + etiqueta, ítem activo con fondo sutil y el
 * selector de espacio abajo. En móvil se esconde: la navegación pasa
 * a la tira superior de page.tsx.
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

const WORKSPACE_DOT: Record<WorkspaceId, string> = {
  evym: "bg-[#af52de]",
  antojo: "bg-[#ff9500]",
  personal: "bg-[#0071e3]",
};

export function Sidebar() {
  const { screen, openScreen, view, setView } = usePanel();

  // "General" ya no se ofrece en la interfaz; si por algún estado
  // heredado llegara, se cae a EVYM.
  const activeView: WorkspaceId = view === "general" ? "evym" : view;

  const visibleNav = NAV.filter(
    (n) => n.id !== "giveaway" || activeView === "evym",
  );

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-line/80 bg-white lg:flex">
      {/* Marca */}
      <div className="flex items-center gap-2.5 px-5 pt-5 pb-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-ink text-[13px] font-bold text-white">
          EV
        </span>
        <div className="min-w-0">
          <p className="text-[15px] leading-tight font-semibold tracking-[-0.01em] text-ink">
            Panel EVYM
          </p>
          <p className="text-xs text-muted-fg">Marketing de contenido</p>
        </div>
      </div>

      {/* Navegación */}
      <nav aria-label="Secciones del panel" className="flex-1 px-3 pt-1">
        <p className="px-3 pb-1.5 text-[11px] font-semibold tracking-wide text-muted-fg uppercase">
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
                    "flex min-h-10 w-full cursor-pointer items-center gap-3 rounded-lg px-3 text-[14px] transition-colors duration-150",
                    active
                      ? "bg-black/[0.05] font-semibold text-ink"
                      : "font-medium text-[#48484a] hover:bg-black/[0.03] hover:text-ink",
                  )}
                >
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

      {/* Selector de espacio, abajo */}
      <div className="border-t border-line/80 px-3 py-4">
        <p className="px-3 pb-1.5 text-[11px] font-semibold tracking-wide text-muted-fg uppercase">
          Espacios
        </p>
        <ul className="space-y-0.5">
          {WORKSPACES.map((ws) => {
            const active = ws.id === activeView;
            return (
              <li key={ws.id}>
                <button
                  type="button"
                  onClick={() => setView(ws.id)}
                  aria-pressed={active}
                  className={cn(
                    "flex min-h-10 w-full cursor-pointer items-center gap-3 rounded-lg px-3 text-[14px] transition-colors duration-150",
                    active
                      ? "bg-black/[0.05] font-semibold text-ink"
                      : "font-medium text-[#48484a] hover:bg-black/[0.03] hover:text-ink",
                  )}
                >
                  <span
                    className={cn("h-2.5 w-2.5 shrink-0 rounded-full", WORKSPACE_DOT[ws.id])}
                    aria-hidden="true"
                  />
                  <span className="flex-1 text-left">{ws.name}</span>
                  {active ? (
                    <span className="text-xs font-semibold text-primary">Activo</span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 px-3 text-[11px] leading-snug text-muted-fg">
          Tus datos viven solo en este navegador. Nada sale de aquí.
        </p>
      </div>
    </aside>
  );
}
