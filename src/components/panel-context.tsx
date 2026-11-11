"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { PanelData, WorkspaceId } from "@/lib/types";
import {
  buildSeedData,
  getPanelData,
  setPanelData,
  subscribePanelData,
} from "@/lib/store";

/**
 * Los 7 módulos ya no son páginas: son detalles que se abren como
 * overlay (sheet) desde la vista única. "Hoy" dejó de ser un módulo:
 * la vista única ES el hoy.
 */
export type ModuleId =
  | "resumen"
  | "metricas"
  | "contenido"
  | "ideas"
  | "giveaway"
  | "pendientes"
  | "bitacora";

export type ViewId = "general" | WorkspaceId;

export const MODULES: { id: ModuleId; label: string }[] = [
  { id: "resumen", label: "Resumen" },
  { id: "metricas", label: "Métricas" },
  { id: "contenido", label: "Contenido" },
  { id: "ideas", label: "Ideas" },
  { id: "giveaway", label: "Giveaway" },
  { id: "pendientes", label: "Pendientes" },
  { id: "bitacora", label: "Bitácora" },
];

export const MODULE_TITLES: Record<ModuleId, string> = {
  resumen: "Resumen",
  metricas: "Métricas",
  contenido: "Contenido",
  ideas: "Ideas",
  giveaway: "Giveaway",
  pendientes: "Pendientes",
  bitacora: "Bitácora",
};

interface PanelContextValue {
  data: PanelData;
  update: (fn: (d: PanelData) => PanelData) => void;
  resetAll: () => void;
  view: ViewId;
  setView: (v: ViewId) => void;
  /** Módulo abierto como overlay. null = vista única, sin detalle. */
  overlay: ModuleId | null;
  openModule: (m: ModuleId) => void;
  closeModule: () => void;
  /**
   * Alias histórico: antes cambiaba de página; ahora abre el overlay.
   * Lo conservan los módulos que navegan entre sí.
   */
  setModule: (m: ModuleId) => void;
  /** Workspace whose data the current screen shows. "general" aggregates. */
  activeWorkspace: WorkspaceId | "general";
}

const PanelContext = createContext<PanelContextValue | null>(null);

export function PanelProvider({ children }: { children: ReactNode }) {
  // localStorage-backed external store: seed on the server, stored payload
  // on the client. No setState-in-effect hydration dance.
  const data = useSyncExternalStore(
    subscribePanelData,
    getPanelData,
    buildSeedData,
  );
  const [view, setViewState] = useState<ViewId>("evym");
  const [overlay, setOverlayState] = useState<ModuleId | null>(null);

  const update = useCallback((fn: (d: PanelData) => PanelData) => {
    setPanelData(fn(getPanelData()));
  }, []);

  const resetAll = useCallback(() => {
    setPanelData(buildSeedData());
  }, []);

  const setView = useCallback((v: ViewId) => {
    setViewState(v);
    // Giveaway only exists for EVYM; leaving EVYM must not strand the user
    // on a hidden module.
    setOverlayState((m) => (m === "giveaway" && v !== "evym" ? null : m));
  }, []);

  const openModule = useCallback((m: ModuleId) => {
    setOverlayState(m);
  }, []);

  const closeModule = useCallback(() => {
    setOverlayState(null);
  }, []);

  const setModule = openModule;

  const value = useMemo<PanelContextValue>(
    () => ({
      data,
      update,
      resetAll,
      view,
      setView,
      overlay,
      openModule,
      closeModule,
      setModule,
      activeWorkspace: view,
    }),
    [data, update, resetAll, view, setView, overlay, openModule, closeModule, setModule],
  );

  return (
    <PanelContext.Provider value={value}>{children}</PanelContext.Provider>
  );
}

export function usePanel(): PanelContextValue {
  const ctx = useContext(PanelContext);
  if (!ctx) throw new Error("usePanel must be used inside PanelProvider");
  return ctx;
}
