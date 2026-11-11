import type { PanelData, WorkspaceData, WorkspaceId } from "./types";
import { STATUS_LABELS, WORKSPACES } from "./types";
import {
  aggregateTotals,
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
    /** Líneas por espacio (solo el briefing agregado): cuando existen,
     *  la vista las muestra en lugar de la línea única "X de 7".
     *  Cada espacio tiene su propia meta de 7, así que un denominador
     *  combinado (p. ej. "2 de 21") sería inventado. */
    lines?: string[];
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

/* ------------------------------------------------------------------ */
/* El briefing agregado: lo mismo que buildBriefing, pero sumando las  */
/* tres cuentas. Los deltas solo se afirman por espacio (Antojo y      */
/* Personal no tienen segunda captura, así que su línea lo dice), y    */
/* la semana se muestra por espacio: cada uno tiene su propia meta de  */
/* 7, un "2 de 21" sería inventado. Todo se deriva en cada render,    */
/* igual que el briefing por espacio.                                  */
/* ------------------------------------------------------------------ */

const WORKSPACE_IDS: WorkspaceId[] = ["evym", "antojo", "personal"];

export function buildAggregateBriefing(
  data: PanelData,
  iso: string,
): Briefing {
  const totals = aggregateTotals(data);
  const hasSnapshots = WORKSPACE_IDS.some(
    (id) => data[id].snapshots.length > 0,
  );

  /* --- Qué pasó: totales + delta por espacio, con honestidad --- */
  const happenedLines: string[] = [];
  if (!hasSnapshots) {
    happenedLines.push(
      "Todavía no hay métricas registradas en ninguna cuenta.",
    );
  } else {
    happenedLines.push(
      `En total: ${formatNumber(totals.views)} vistas y ${formatNumber(totals.followers)} seguidores en tus tres cuentas.`,
    );
    const withDelta: string[] = [];
    const baseline: string[] = [];
    for (const id of WORKSPACE_IDS) {
      const ws = data[id];
      const short = WORKSPACES.find((w) => w.id === id)?.short ?? id;
      const t = workspaceTotals(ws);
      const prev = previousByNetwork(ws.snapshots);
      const prevValues = Object.values(prev);
      if (!prevValues.some((p) => p !== null)) {
        if (ws.snapshots.length > 0) baseline.push(short);
        continue;
      }
      const prevViews = prevValues.reduce((s, p) => s + (p?.views ?? 0), 0);
      const delta = formatDeltaPct(t.views, prevViews);
      withDelta.push(
        delta ? `${short} ${delta} en vistas` : short,
      );
    }
    if (withDelta.length > 0) {
      happenedLines.push(
        `Desde la última captura: ${joinNames(withDelta)}.`,
      );
    }
    if (baseline.length > 0) {
      happenedLines.push(
        `${joinNames(baseline)} ${baseline.length === 1 ? "todavía está" : "todavía están"} en línea base: falta una segunda captura para comparar.`,
      );
    }
  }
  const allPublished = WORKSPACE_IDS.flatMap((id) =>
    data[id].content.filter(
      (c) => c.status === "publicado" && c.views !== null,
    ),
  );
  const topReel =
    allPublished.length > 0
      ? [...allPublished].sort(
          (a, b) => (b.views as number) - (a.views as number),
        )[0]
      : null;
  const secondReel =
    allPublished.length > 1
      ? [...allPublished].sort(
          (a, b) => (b.views as number) - (a.views as number),
        )[1]
      : null;
  if (topReel) {
    happenedLines.push(
      `Tu contenido más visto es ${topReel.title}, con ${formatNumber(topReel.views as number)} vistas.`,
    );
  }

  /* --- Hoy: qué toca hoy en todas las cuentas --- */
  const todaySlots = WORKSPACE_IDS.map((id) => ({
    id,
    item: weekPlan(data[id])[todayDayIndex(iso)]?.item ?? null,
  })).filter((s) => s.item !== null);
  const allInPreparation = WORKSPACE_IDS.flatMap((id) =>
    publishQueue(data[id])
      .filter((c) => c.status !== "publicado")
      .map((c) => ({ id, item: c })),
  );
  const allPendingTasks = WORKSPACE_IDS.flatMap((id) =>
    data[id].tasks.filter((t) => !t.done),
  );
  const hasTasksAnywhere = WORKSPACE_IDS.some(
    (id) => data[id].tasks.length > 0,
  );
  let todayHeadline: string;
  let todayDetail: string | null = null;
  if (todaySlots.length > 0) {
    const first = todaySlots[0];
    const short =
      WORKSPACES.find((w) => w.id === first.id)?.short ?? first.id;
    const item = first.item as NonNullable<(typeof todaySlots)[number]["item"]>;
    if (item.status === "publicado") {
      todayHeadline = `Hoy ya salió en ${short}: ${item.title}.`;
      todayDetail =
        item.views !== null
          ? `Lleva ${formatNumber(item.views)} vistas.`
          : null;
    } else {
      todayHeadline = `Hoy toca en ${short}: ${item.title}.`;
      todayDetail = `Está en ${STATUS_LABELS[item.status]}. Siguiente paso: ${NEXT_STEP_LABEL[item.status]}.`;
    }
  } else if (allInPreparation.length > 0) {
    todayHeadline = "Hoy no hay Reel asignado en ninguna cuenta.";
    const byWs = WORKSPACE_IDS.map((id) => ({
      id,
      items: allInPreparation.filter((p) => p.id === id),
    })).filter((g) => g.items.length > 0);
    const parts = byWs.map((g) => {
      const short =
        WORKSPACES.find((w) => w.id === g.id)?.short ?? g.id;
      return `${g.items.length} en ${short} (${joinNames(g.items.map((p) => p.item.title))})`;
    });
    todayDetail = `En preparación tienes ${joinNames(parts)}.`;
  } else {
    todayHeadline = "Hoy no hay Reel asignado en ninguna cuenta.";
    todayDetail = "Los pipelines están vacíos; agrega un Reel en Contenido.";
  }

  /* --- Esta semana, por espacio --- */
  const weekLines = WORKSPACE_IDS.map((id) => {
    const short = WORKSPACES.find((w) => w.id === id)?.short ?? id;
    const week = weeklyProgress(data[id]);
    const inPrep = publishQueue(data[id]).filter(
      (c) => c.status !== "publicado",
    ).length;
    if (data[id].content.length === 0) {
      return `${short}: sin contenido en el pipeline todavía.`;
    }
    return `${short}: ${week.published} de 7 publicados${inPrep > 0 ? ` · ${inPrep} en preparación` : ""}.`;
  });
  const totalPublished = WORKSPACE_IDS.reduce(
    (s, id) => s + weeklyProgress(data[id]).published,
    0,
  );

  /* --- Recomendación: la misma cadena de reglas, sobre todo --- */
  let recommendation: Briefing["recommendation"];
  const inImages = allInPreparation.find(
    (p) => p.item.status === "imagenes",
  );
  if (inImages) {
    const imagesCount = allInPreparation.filter(
      (p) => p.item.status === "imagenes",
    ).length;
    const short =
      WORKSPACES.find((w) => w.id === inImages.id)?.short ?? inImages.id;
    recommendation = {
      text:
        imagesCount === 1
          ? `Tienes un Reel esperando imágenes en ${short}; el siguiente paso es generar las imágenes de ${inImages.item.title}.`
          : `Tienes ${imagesCount} Reels esperando imágenes en ${short}; el siguiente paso es generar las imágenes de ${inImages.item.title}.`,
      action: { label: "Ver Contenido", screen: "contenido" },
    };
  } else if (
    topReel &&
    secondReel &&
    secondReel.views !== null &&
    (topReel.views as number) >= 2 * (secondReel.views as number)
  ) {
    const ratio = (topReel.views as number) / (secondReel.views as number);
    const times = ratio >= 3 ? "más del triple" : "más del doble";
    recommendation = {
      text: `${topReel.title} es tu contenido más visto con ${formatNumber(topReel.views as number)} vistas, ${times} que ${secondReel.title}. Graba otro caso parecido: es lo que más está funcionando.`,
      action: { label: "Ir al Agente", screen: "agente" },
    };
  } else if (allPendingTasks.length > 0) {
    recommendation = {
      text: `Te quedan ${allPendingTasks.length} pendientes de la lista; el primero es "${allPendingTasks[0].label}".`,
      action: { label: "Ver Pendientes", screen: "pendientes" },
    };
  } else if (!hasSnapshots) {
    recommendation = {
      text: "Registra tu primera captura en Métricas para que el briefing tenga números de verdad.",
      action: { label: "Registrar captura", screen: "metricas" },
    };
  } else if (allInPreparation.length === 0 && totalPublished === 0) {
    recommendation = {
      text: "Ningún espacio tiene Reels en el pipeline todavía. Agrega el primero en Contenido.",
      action: { label: "Ver Contenido", screen: "contenido" },
    };
  } else {
    const bestStreak = Math.max(
      ...WORKSPACE_IDS.map((id) => streak(data[id], iso)),
    );
    recommendation = {
      text:
        bestStreak > 0
          ? `Llevas una racha de ${bestStreak} ${bestStreak === 1 ? "día" : "días"}. Publica hoy para mantenerla.`
          : "Publica un Reel hoy para empezar tu racha.",
      action: { label: "Ver Contenido", screen: "contenido" },
    };
  }

  return {
    dateLine: formatDateLong(iso),
    wsShort: "todas tus cuentas",
    happened: {
      lines: happenedLines,
      action: { label: "Ver Métricas", screen: "metricas" },
    },
    today: {
      headline: todayHeadline,
      detail: todayDetail,
      pendingTasks: allPendingTasks.length,
      hasTasks: hasTasksAnywhere,
      action: { label: "Ver Contenido", screen: "contenido" },
    },
    week: {
      published: totalPublished,
      inPreparation: allInPreparation.length,
      range: weekRange(iso),
      action: { label: "Ver Calendario", screen: "calendario" },
      lines: weekLines,
    },
    recommendation,
  };
}
