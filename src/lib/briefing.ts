import type { WorkspaceData, WorkspaceId } from "./types";
import { STATUS_LABELS, WORKSPACES } from "./types";
import {
  previousByNetwork,
  publishQueue,
  streak,
  todayDayIndex,
  weekPlan,
  weeklyProgress,
  workspaceTotals,
} from "./derive";
import {
  formatDateLong,
  formatDateShort,
  formatDeltaPct,
  formatNumber,
} from "./store";
import { NEXT_STEP_LABEL } from "./agent";

/* ------------------------------------------------------------------ */
/* El briefing de Hoy: lo que un Jarvis le diría a Isra al abrir el   */
/* panel — qué pasó, qué toca hoy, cómo va la semana y una sola        */
/* recomendación. Todo se deriva en cada render desde el store: nada   */
/* se guarda ni se cachea, así que cambiar de espacio (o de vista      */
/* general) vuelve a calcular el texto y nunca se queda colgado en     */
/* el espacio anterior. Solo números que existen en el store; sin      */
/* segunda captura no hay delta, sin datos no hay cifras.              */
/* ------------------------------------------------------------------ */

export type BriefingTarget =
  | "contenido"
  | "metricas"
  | "agente"
  | "calendario"
  | "pendientes";

export interface BriefingAction {
  label: string;
  screen: BriefingTarget;
}

export interface Briefing {
  /** "miércoles, 11 de noviembre de 2026" */
  dateLine: string;
  wsShort: string;
  happened: { lines: string[]; action: BriefingAction };
  today: {
    headline: string;
    detail: string | null;
    pendingTasks: number;
    hasTasks: boolean;
    action: BriefingAction;
  };
  week: {
    published: number;
    inPreparation: number;
    range: string;
    action: BriefingAction;
  };
  recommendation: { text: string; action: BriefingAction };
}

function isoOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Lunes–domingo de la semana que contiene `iso`, en hora local. */
function weekRange(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return `${formatDateShort(isoOf(monday))} – ${formatDateShort(isoOf(sunday))}`;
}

function joinNames(names: string[]): string {
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} y ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}`;
}

export function buildBriefing(
  ws: WorkspaceData,
  wsId: WorkspaceId,
  iso: string,
): Briefing {
  const wsShort =
    WORKSPACES.find((w) => w.id === wsId)?.short ?? wsId;
  const totals = workspaceTotals(ws);
  const previous = previousByNetwork(ws.snapshots);
  const prevValues = Object.values(previous);
  const prevViews = prevValues.reduce((s, p) => s + (p?.views ?? 0), 0);
  const prevFollowers = prevValues.reduce(
    (s, p) => s + (p?.followers ?? 0),
    0,
  );
  const hasSecondCapture = prevValues.some((p) => p !== null);
  const viewsDelta = formatDeltaPct(totals.views, prevViews);
  const followersDelta = formatDeltaPct(totals.followers, prevFollowers);
  const hasSnapshots = ws.snapshots.length > 0;

  const published = ws.content.filter((c) => c.status === "publicado");
  const withViews = published.filter((c) => c.views !== null);
  const topReel =
    withViews.length > 0
      ? [...withViews].sort((a, b) => (b.views as number) - (a.views as number))[0]
      : null;
  const secondReel = withViews.length > 1 ? [...withViews].sort((a, b) => (b.views as number) - (a.views as number))[1] : null;

  /* --- Qué pasó --- */
  const happenedLines: string[] = [];
  if (!hasSnapshots) {
    happenedLines.push("Todavía no hay métricas registradas en este espacio.");
  } else if (hasSecondCapture) {
    const viewsPart = viewsDelta
      ? `${formatNumber(totals.views)} vistas (${viewsDelta})`
      : `${formatNumber(totals.views)} vistas`;
    const followersPart = followersDelta
      ? `${formatNumber(totals.followers)} seguidores (${followersDelta})`
      : `${formatNumber(totals.followers)} seguidores`;
    happenedLines.push(
      `Desde la última captura: ${viewsPart} y ${followersPart}.`,
    );
  } else {
    happenedLines.push(
      `Última captura: ${formatNumber(totals.views)} vistas y ${formatNumber(totals.followers)} seguidores. Todavía no hay una segunda captura para comparar.`,
    );
  }
  if (topReel) {
    happenedLines.push(
      `Tu Reel más visto es ${topReel.title}, con ${formatNumber(topReel.views as number)} vistas.`,
    );
  }

  /* --- Hoy --- */
  const slot = weekPlan(ws)[todayDayIndex(iso)];
  const todayReel = slot?.item ?? null;
  const inPreparation = publishQueue(ws).filter(
    (c) => c.status !== "publicado",
  );
  const pendingTasks = ws.tasks.filter((t) => !t.done);
  let todayHeadline: string;
  let todayDetail: string | null = null;
  if (todayReel) {
    if (todayReel.status === "publicado") {
      todayHeadline = `Hoy ya salió: ${todayReel.title}.`;
      todayDetail =
        todayReel.views !== null
          ? `Lleva ${formatNumber(todayReel.views)} vistas.`
          : null;
    } else {
      todayHeadline = `Hoy toca ${todayReel.title}.`;
      todayDetail = `Está en ${STATUS_LABELS[todayReel.status]}. Siguiente paso: ${NEXT_STEP_LABEL[todayReel.status]}.`;
    }
  } else if (inPreparation.length > 0) {
    todayHeadline = "Hoy no hay Reel asignado.";
    todayDetail = `En preparación tienes ${inPreparation.length}: ${joinNames(inPreparation.map((c) => c.title))}.`;
  } else {
    todayHeadline = "Hoy no hay Reel asignado.";
    todayDetail = "El pipeline está vacío; agrega un Reel en Contenido.";
  }

  /* --- Esta semana --- */
  const week = weeklyProgress(ws);

  /* --- Recomendación: una sola regla, de los datos reales --- */
  let recommendation: Briefing["recommendation"];
  const inImages = publishQueue(ws).find((c) => c.status === "imagenes");
  if (inImages) {
    const imagesCount = ws.content.filter(
      (c) => c.status === "imagenes",
    ).length;
    recommendation = {
      text:
        imagesCount === 1
          ? `Tienes un Reel esperando imágenes; el siguiente paso es generar las imágenes de ${inImages.title}.`
          : `Tienes ${imagesCount} Reels esperando imágenes; el siguiente paso es generar las imágenes de ${inImages.title}.`,
      action: { label: "Ver Contenido", screen: "contenido" },
    };
  } else if (
    topReel &&
    secondReel &&
    secondReel.views !== null &&
    (topReel.views as number) >= 2 * (secondReel.views as number)
  ) {
    const ratio = (topReel.views as number) / (secondReel.views as number);
    const times =
      ratio >= 3 ? "más del triple" : "más del doble";
    recommendation = {
      text: `${topReel.title} es tu Reel más visto con ${formatNumber(topReel.views as number)} vistas, ${times} que ${secondReel.title}. Graba otro caso parecido: es lo que más está funcionando.`,
      action: { label: "Ir al Agente", screen: "agente" },
    };
  } else if (pendingTasks.length > 0) {
    recommendation = {
      text: `Te quedan ${pendingTasks.length} pendientes de la lista; el primero es "${pendingTasks[0].label}".`,
      action: { label: "Ver Pendientes", screen: "pendientes" },
    };
  } else if (!hasSnapshots) {
    recommendation = {
      text: "Registra tu primera captura en Métricas para que el briefing tenga números de verdad.",
      action: { label: "Registrar captura", screen: "metricas" },
    };
  } else if (ws.content.length === 0) {
    recommendation = {
      text: "Este espacio todavía no tiene Reels en el pipeline. Agrega el primero en Contenido.",
      action: { label: "Ver Contenido", screen: "contenido" },
    };
  } else {
    const s = streak(ws, iso);
    recommendation = {
      text:
        s > 0
          ? `Llevas una racha de ${s} ${s === 1 ? "día" : "días"}. Publica hoy para mantenerla.`
          : "Publica un Reel hoy para empezar tu racha.",
      action: { label: "Ver Contenido", screen: "contenido" },
    };
  }

  return {
    dateLine: formatDateLong(iso),
    wsShort,
    happened: {
      lines: happenedLines,
      action: { label: "Ver Métricas", screen: "metricas" },
    },
    today: {
      headline: todayHeadline,
      detail: todayDetail,
      pendingTasks: pendingTasks.length,
      hasTasks: ws.tasks.length > 0,
      action: { label: "Ver Contenido", screen: "contenido" },
    },
    week: {
      published: week.published,
      inPreparation: inPreparation.length,
      range: weekRange(iso),
      action: { label: "Ver Calendario", screen: "calendario" },
    },
    recommendation,
  };
}
