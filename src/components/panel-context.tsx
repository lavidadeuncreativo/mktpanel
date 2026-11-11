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
 * Las pantallas del panel: el dashboard (Hoy) más los módulos, que ya no
 * son overlays sino vistas propias a las que se llega desde la barra
 * lateral. El Resumen anterior quedó absorbido por el dashboard de Hoy
 * (sus KPIs, gráficas y listas viven ahí).
 */
export type ModuleId =
  | "metricas"
  | "contenido"
  | "ideas"
  | "giveaway"
  | "pendientes"
  | "bitacora";

export type ScreenId = "hoy" | ModuleId | "conexiones";

export type ViewId = "general" | WorkspaceId;

export const MODULES: { id: ModuleId; label: string }[] = [
  { id: "metricas", label: "Métricas" },
  { id: "contenido", label: "Contenido" },
  { id: "ideas", label: "Ideas" },
  { id: "giveaway", label: "Giveaway" },
  { id: "pendientes", label: "Pendientes" },
  { id: "bitacora", label: "Bitácora" },
];

export const SCREEN_TITLES: Record<ScreenId, string> = {
  hoy: "Hoy",
  metricas: "Métricas",
  contenido: "Contenido",
  ideas: "Ideas",
  giveaway: "Giveaway",
  pendientes: "Pendientes",
  bitacora: "Bitácora",
  conexiones: "Conexiones",
};

export const MODULE_TITLES: Record<ModuleId, string> = {
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
  /** Pantalla actual: el dashboard o un módulo. */
  screen: ScreenId;
  openScreen: (s: ScreenId) => void;
  /** Alias: antes abría el módulo como overlay; ahora cambia de pantalla. */
  openModule: (m: ModuleId) => void;
  /** Alias: vuelve al dashboard. */
  closeModule: () => void;
  /** Alias histórico: antes cambiaba de página; ahora abre la pantalla. */
  setModule: (m: ModuleId) => void;
  /** Workspace whose data the current screen shows. "general" aggregates. */
  activeWorkspace: WorkspaceId | "general";
}

const PanelContext = createContext<PanelContextValue | null>(null);

/**
 * Instantánea del servidor, cacheada una sola vez: useSyncExternalStore
 * exige que getServerSnapshot devuelva la misma referencia en cada
 * llamada. buildSeedData() construye un objeto nuevo en cada llamada,
 * así que pasarla directo provoca el error de React "The result of
 * getServerSnapshot should be cached to avoid an infinite loop".
 */
let serverSnapshot: PanelData | null = null;

function getServerSnapshot(): PanelData {
  if (!serverSnapshot) serverSnapshot = buildSeedData();
  return serverSnapshot;
}

export function PanelProvider({ children }: { children: ReactNode }) {
  // localStorage-backed external store: seed on the server, stored payload
  // on the client. No setState-in-effect hydration dance.
  // getServerSnapshot DEBE devolver la misma referencia en cada llamada:
  // buildSeedData() crea un objeto nuevo cada vez y React lo marca como
  // bucle infinito (el overlay rojo "1 Issue" en dev). Se cachea una sola
  // vez a nivel de módulo.
  const data = useSyncExternalStore(
    subscribePanelData,
    getPanelData,
    getServerSnapshot,
  );
  const [view, setViewState] = useState<ViewId>("evym");
  const [screen, setScreenState] = useState<ScreenId>("hoy");

  const update = useCallback((fn: (d: PanelData) => PanelData) => {
    setPanelData(fn(getPanelData()));
  }, []);

  const resetAll = useCallback(() => {
    setPanelData(buildSeedData());
  }, []);

  const setView = useCallback((v: ViewId) => {
    setViewState(v);
    // Giveaway only exists for EVYM; leaving EVYM must not strand the user
    // on a hidden screen.
    setScreenState((s) => (s === "giveaway" && v !== "evym" ? "hoy" : s));
  }, []);

  const openScreen = useCallback((s: ScreenId) => {
    setScreenState(s);
  }, []);

  const openModule = useCallback((m: ModuleId) => {
    setScreenState(m);
  }, []);

  const closeModule = useCallback(() => {
    setScreenState("hoy");
  }, []);

  const setModule = openModule;

  const value = useMemo<PanelContextValue>(
    () => ({
      data,
      update,
      resetAll,
      view,
      setView,
      screen,
      openScreen,
      openModule,
      closeModule,
      setModule,
      activeWorkspace: view,
    }),
    [data, update, resetAll, view, setView, screen, openScreen, openModule, closeModule, setModule],
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
