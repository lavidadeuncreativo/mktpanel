import type {
  ContentItem,
  PanelData,
  WorkspaceData,
  WorkspaceId,
  WorkspaceStrategy,
} from "./types";
import { STATUS_LABELS, STATUS_ORDER } from "./types";
import { weeklyProgress } from "./derive";
import { parseIso, weekdayIndex } from "./universe";

/* ------------------------------------------------------------------ */
/* Estrategia y plan por espacio: cada cuenta tiene su propia meta,    */
/* su ritmo y su enfoque, y "Tu plan" dice qué hacer a continuación,   */
/* en orden, a partir del pipeline real de esa cuenta — nunca una      */
/* lista genérica. Sin estrategia guardada se usa la sugerencia        */
/* inicial de abajo (editable en Hoy); sin contenido, el plan dice     */
/* honestamente por dónde empezar. Nada se guarda aparte del store.    */
/* ------------------------------------------------------------------ */

export const DEFAULT_STRATEGIES: Record<WorkspaceId, WorkspaceStrategy> = {
  evym: {
    goal: "Crecer la comunidad de terror y vender más mezcal Los Muertos",
    cadencePerWeek: 7,
    focus:
      "Un caso under mexicano por día, con pregunta final que invite a comentar",
  },
  antojo: {
    goal: "Conseguir más cotizaciones de bebidas frías para eventos en CDMX",
    cadencePerWeek: 3,
    focus:
      "Mostrar el producto en eventos reales: latas personalizadas, coolers y catering",
  },
  personal: {
    goal: "Crecer el perfil personal y llevar tráfico a EVYM y Antojo",
    cadencePerWeek: 3,
    focus:
      "Detrás de cámaras: cómo se hacen los Reels y la vida de un creativo",
  },
};

export function getStrategy(
  ws: WorkspaceData,
  wsId: WorkspaceId,
): WorkspaceStrategy {
  return ws.strategy ?? DEFAULT_STRATEGIES[wsId];
}

export type PlanScreen =
  | "hoy"
  | "contenido"
  | "calendario"
  | "metricas"
  | "ideas"
  | "pendientes";

export interface PlanStep {
  id: string;
  title: string;
  detail?: string;
  screen: PlanScreen;
  cta: string;
}

/** El siguiente paso de un Reel según su estado: lo que falta para
 *  moverlo un escalón más en el pipeline. */
export function nextStepFor(item: ContentItem): string {
  switch (item.status) {
    case "idea":
      return `Escribe el guion de «${item.title}»`;
    case "guion":
      return `Genera las imágenes de «${item.title}»`;
    case "imagenes":
      return `Edita el video de «${item.title}»`;
    case "edicion":
      return `Termina la edición de «${item.title}» y publícalo`;
    case "publicado":
      return `«${item.title}» ya está publicado`;
  }
}

/** El Reel sin publicar más avanzado del pipeline (edición antes que
 *  imágenes, imágenes antes que guion, guion antes que idea). */
function mostAdvancedUnpublished(ws: WorkspaceData): ContentItem | null {
  const open = ws.content.filter((c) => c.status !== "publicado");
  if (open.length === 0) return null;
  return [...open].sort(
    (a, b) =>
      STATUS_ORDER.indexOf(b.status) - STATUS_ORDER.indexOf(a.status) ||
      (a.dayIndex ?? 99) - (b.dayIndex ?? 99),
  )[0];
}

/** Qué hacer a continuación en este espacio, en orden. Como mucho 5
 *  pasos, cada uno con su destino en el panel. */
export function buildPlan(
  ws: WorkspaceData,
  wsId: WorkspaceId,
  iso: string,
): PlanStep[] {
  const steps: PlanStep[] = [];
  const todayIdx = weekdayIndex(parseIso(iso));

  // Sin contenido: el plan es arrancar, en orden.
  if (ws.content.length === 0) {
    steps.push({
      id: "first-reel",
      title: "Agrega tu primer Reel al pipeline",
      detail: "De la idea a publicado, en Contenido.",
      screen: "contenido",
      cta: "Ir a Contenido",
    });
    steps.push({
      id: "first-idea",
      title: "Guarda una idea en el banco",
      detail: "El primer tema que quieras contar, con su puntuación.",
      screen: "ideas",
      cta: "Ir a Ideas",
    });
    if (ws.snapshots.length === 0) {
      steps.push({
        id: "first-capture",
        title: "Registra tu primera captura de métricas",
        detail: "Sin capturas, el panel no puede decirte cómo vas.",
        screen: "metricas",
        cta: "Ir a Métricas",
      });
    }
    return steps;
  }

  // 1. Lo de hoy: un Reel con fecha de hoy (o su día de la semana)
  // que todavía no salió.
  const todayItem = ws.content.find(
    (c) =>
      c.status !== "publicado" &&
      (c.publishDate === iso || c.dayIndex === todayIdx),
  );
  if (todayItem) {
    steps.push({
      id: "today",
      title: `Hoy: publica «${todayItem.title}»`,
      detail: `Está en ${STATUS_LABELS[todayItem.status].toLowerCase()} — es lo que toca hoy.`,
      screen: "contenido",
      cta: "Ir a Contenido",
    });
  }

  // 2. El Reel más avanzado sin publicar: su siguiente paso.
  const next = mostAdvancedUnpublished(ws);
  if (next && next.id !== todayItem?.id) {
    steps.push({
      id: "next-reel",
      title: nextStepFor(next),
      detail: `Es el Reel más avanzado del pipeline (${STATUS_LABELS[next.status].toLowerCase()}).`,
      screen: "contenido",
      cta: "Ir a Contenido",
    });
  }

  // 3. La mejor idea del banco, si todavía no entró al pipeline.
  const topIdea = [...ws.ideas].sort((a, b) => b.score - a.score)[0];
  if (topIdea) {
    steps.push({
      id: "top-idea",
      title: `Pasa «${topIdea.title}» a guion`,
      detail: `La idea más fuerte del banco (${topIdea.score} de 10).`,
      screen: "ideas",
      cta: "Ir a Ideas",
    });
  }

  // 4. Pendientes sin hacer.
  const pending = ws.tasks.filter((t) => !t.done);
  if (pending.length > 0) {
    steps.push({
      id: "tasks",
      title: `Pendiente: ${pending[0].label}`,
      detail:
        pending.length > 1
          ? `Te quedan ${pending.length} pendientes de la lista.`
          : "Es el único pendiente de la lista.",
      screen: "pendientes",
      cta: "Ir a Pendientes",
    });
  }

  // 5. Sin capturas recientes, el panel se queda ciego.
  if (ws.snapshots.length === 0) {
    steps.push({
      id: "capture",
      title: "Registra una captura de métricas",
      detail: "Sin capturas, el panel no puede decirte cómo vas.",
      screen: "metricas",
      cta: "Ir a Métricas",
    });
  }

  return steps.slice(0, 5);
}

/** "Meta: 7 Reels por semana · 2 publicados esta semana" — el
 *  encabezado del plan, con la cadencia de la estrategia. */
export function planHeader(
  ws: WorkspaceData,
  wsId: WorkspaceId,
): { cadence: number; published: number } {
  return {
    cadence: getStrategy(ws, wsId).cadencePerWeek,
    published: weeklyProgress(ws).published,
  };
}

/** Para el agente y para pruebas: el plan agregado de los tres
 *  espacios, etiquetado por cuenta. */
export function buildAllPlans(
  data: PanelData,
  iso: string,
): { wsId: WorkspaceId; steps: PlanStep[] }[] {
  return (["evym", "antojo", "personal"] as WorkspaceId[]).map((wsId) => ({
    wsId,
    steps: buildPlan(data[wsId], wsId, iso),
  }));
}
