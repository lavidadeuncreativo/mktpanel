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

export type ModuleId =
  | "resumen"
  | "metricas"
  | "contenido"
  | "ideas"
  | "giveaway"
  | "pendientes"
  | "bitacora";

export type ViewId = "general" | WorkspaceId;

export const MODULES: { id: ModuleId; label: string; group: string }[] = [
  { id: "resumen", label: "Resumen", group: "Panel" },
  { id: "metricas", label: "Métricas", group: "Panel" },
  { id: "contenido", label: "Contenido", group: "Operación" },
  { id: "ideas", label: "Ideas", group: "Operación" },
  { id: "giveaway", label: "Giveaway", group: "Operación" },
  { id: "pendientes", label: "Pendientes", group: "Operación" },
  { id: "bitacora", label: "Bitácora", group: "Operación" },
];

interface PanelContextValue {
  data: PanelData;
  update: (fn: (d: PanelData) => PanelData) => void;
  resetAll: () => void;
  view: ViewId;
  setView: (v: ViewId) => void;
  module: ModuleId;
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
  const [module, setModuleState] = useState<ModuleId>("resumen");

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
    setModuleState((m) => (m === "giveaway" && v !== "evym" ? "resumen" : m));
  }, []);

  const setModule = useCallback((m: ModuleId) => {
    setModuleState(m);
    window.scrollTo({ top: 0 });
  }, []);

  const value = useMemo<PanelContextValue>(
    () => ({
      data,
      update,
      resetAll,
      view,
      setView,
      module,
      setModule,
      activeWorkspace: view,
    }),
    [data, update, resetAll, view, setView, module, setModule],
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
