import type {
  ContentItem,
  Network,
  PanelData,
  WorkspaceId,
} from "./types";
import { STATUS_ORDER, UNIVERSE_NETWORKS, WEEK_DAYS } from "./types";
import { latestByNetwork } from "./derive";

/* ------------------------------------------------------------------ */
/* El universo: lo que el Dashboard general muestra, derivado en cada  */
/* render del store — nada guardado aparte, nada inventado.            */
/*                                                                     */
/* - Alertas: el Reel más visto de las tres cuentas (por Views reales  */
/*   del pipeline) y las cuentas donde hay comentarios (por captura,   */
/*   nunca por Reel: los comentarios por Reel no existen en los datos).*/
/* - Próximos 7 días: lo que toca publicar (por fecha de publicación  */
/*   o día de la semana) y lo que sigue en producción sin fecha.       */
/* - Siguiente hueco para publicar: el primer día libre de los         */
/*   próximos 7 y el Reel más avanzado sin publicar.                   */
/* Las fechas se manejan en hora local (nunca `new Date("2026-11-09")`,*/
/* que es UTC).                                                        */
/* ------------------------------------------------------------------ */

export function parseIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function isoOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** 0 = lunes … 6 = domingo, como dayIndex del store. */
export function weekdayIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}

export function addDays(iso: string, n: number): string {
  const d = parseIso(iso);
  d.setDate(d.getDate() + n);
  return isoOf(d);
}

/** "viernes 14 de noviembre" — sin año, como se habla. */
export function formatDayLong(iso: string): string {
  const d = parseIso(iso);
  return new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(d);
}

const WORKSPACE_IDS: WorkspaceId[] = ["evym", "antojo", "personal"];

export interface TopReel {
  wsId: WorkspaceId;
  item: ContentItem;
}

export interface CommentLeader {
  wsId: WorkspaceId;
  network: Network;
  comments: number;
}

export interface UniverseAlerts {
  /** El Reel publicado con más Views de las tres cuentas. */
  top: TopReel | null;
  /** El segundo, para decir cuánto lo supera el primero. */
  runnerUp: TopReel | null;
  /** Redes con comentarios en la última captura, de más a menos. */
  commentLeaders: CommentLeader[];
  /** Comentarios totales de la última captura, todas las cuentas. */
  totalComments: number;
}

export function buildAlerts(data: PanelData): UniverseAlerts {
  const published: TopReel[] = [];
  for (const wsId of WORKSPACE_IDS) {
    for (const item of data[wsId].content) {
      if (item.status === "publicado" && item.views !== null) {
        published.push({ wsId, item });
      }
    }
  }
  published.sort((a, b) => (b.item.views as number) - (a.item.views as number));

  const commentLeaders: CommentLeader[] = [];
  for (const wsId of WORKSPACE_IDS) {
    const latest = latestByNetwork(data[wsId].snapshots);
    for (const net of UNIVERSE_NETWORKS[wsId]) {
      const snap = latest[net];
      if (snap && (snap.comments ?? 0) > 0) {
        commentLeaders.push({ wsId, network: net, comments: snap.comments as number });
      }
    }
  }
  commentLeaders.sort((a, b) => b.comments - a.comments);

  return {
    top: published[0] ?? null,
    runnerUp: published[1] ?? null,
    commentLeaders,
    totalComments: commentLeaders.reduce((s, c) => s + c.comments, 0),
  };
}

/* ------------------------- Próximos 7 días ------------------------- */

export interface DayPlan {
  iso: string;
  dayIndex: number;
  label: string;
  isToday: boolean;
  items: { wsId: WorkspaceId; item: ContentItem }[];
}

export interface NextSevenDays {
  days: DayPlan[];
  /** En producción y sin fecha: no aparecen en ningún día. */
  inProduction: { wsId: WorkspaceId; item: ContentItem }[];
  /** Días libres en los próximos 7 (sin nada programado). */
  freeDays: DayPlan[];
}

/** Fecha en la que cae un Reel: su fecha de publicación, o el día de
 *  la semana asignado dentro de la semana actual. Null = sin fecha. */
function itemDateISO(item: ContentItem, mondayIso: string): string | null {
  if (item.publishDate) return item.publishDate;
  if (item.dayIndex !== null && item.dayIndex !== undefined) {
    return addDays(mondayIso, item.dayIndex);
  }
  return null;
}

export function nextSevenDays(data: PanelData, iso: string): NextSevenDays {
  const today = parseIso(iso);
  const monday = new Date(today);
  monday.setDate(monday.getDate() - weekdayIndex(today));
  const mondayIso = isoOf(monday);

  const days: DayPlan[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const dateIso = isoOf(d);
    return {
      iso: dateIso,
      dayIndex: weekdayIndex(d),
      label: WEEK_DAYS[weekdayIndex(d)],
      isToday: i === 0,
      items: [] as { wsId: WorkspaceId; item: ContentItem }[],
    };
  });
  const byIso = new Map(days.map((d) => [d.iso, d]));

  const inProduction: { wsId: WorkspaceId; item: ContentItem }[] = [];
  for (const wsId of WORKSPACE_IDS) {
    for (const item of data[wsId].content) {
      const date = itemDateISO(item, mondayIso);
      // Un Reel publicado en el pasado ya salió: no es "lo que sigue".
      if (item.status === "publicado" && date && date < iso) continue;
      if (date && byIso.has(date)) {
        byIso.get(date)?.items.push({ wsId, item });
      } else if (item.status !== "publicado") {
        inProduction.push({ wsId, item });
      }
    }
  }
  // Lo más avanzado primero: edición, imágenes, guion, idea.
  inProduction.sort(
    (a, b) =>
      STATUS_ORDER.indexOf(b.item.status) - STATUS_ORDER.indexOf(a.item.status),
  );

  return {
    days,
    inProduction,
    freeDays: days.filter((d) => d.items.length === 0),
  };
}

/* -------------------- Siguiente hueco para publicar -------------------- */

export interface PublishSlot {
  date: string;
  dayLabel: string;
  reel: { wsId: WorkspaceId; item: ContentItem } | null;
}

/** El primer día libre de los próximos 7 y el Reel más avanzado sin
 *  publicar. Null cuando no hay hueco en la semana (entonces toca la
 *  semana que viene) o cuando no hay nada que publicar. */
export function nextPublishSlot(data: PanelData, iso: string): PublishSlot | null {
  const plan = nextSevenDays(data, iso);
  const free = plan.freeDays[0];
  if (!free) return null;

  let best: { wsId: WorkspaceId; item: ContentItem } | null = null;
  for (const wsId of WORKSPACE_IDS) {
    for (const item of data[wsId].content) {
      if (item.status === "publicado") continue;
      if (
        !best ||
        STATUS_ORDER.indexOf(item.status) > STATUS_ORDER.indexOf(best.item.status)
      ) {
        best = { wsId, item };
      }
    }
  }
  if (!best) return null;
  return { date: free.iso, dayLabel: formatDayLong(free.iso), reel: best };
}

/* ------------------------- Programar por texto ------------------------- */

const WEEKDAY_WORDS: Record<string, number> = {
  lunes: 0,
  martes: 1,
  miercoles: 2,
  jueves: 3,
  viernes: 4,
  sabado: 5,
  domingo: 6,
};

/** "el viernes", "este viernes", "mañana", "hoy" o "el próximo
 *  viernes" → fecha ISO. "El próximo X" salta a la semana que viene;
 *  el resto es la próxima ocurrencia de ese día (hoy incluido). */
export function parseScheduleDay(q: string, iso: string): string | null {
  const nextWeek = /\b(proximo|proxima|siguiente)\b/.test(q);
  if (/\bhoy\b/.test(q)) return nextWeek ? addDays(iso, 7) : iso;
  if (/\bmanana\b/.test(q)) return addDays(iso, nextWeek ? 8 : 1);
  const m = q.match(
    /\b(lunes|martes|miercoles|jueves|viernes|sabado|domingo)\b/,
  );
  if (!m) return null;
  const target = WEEKDAY_WORDS[m[1]];
  const todayIdx = weekdayIndex(parseIso(iso));
  let delta = (target - todayIdx + 7) % 7;
  if (nextWeek) delta += 7;
  return addDays(iso, delta);
}

function normTitle(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

/** Busca un Reel por título dentro de un espacio (o de todos): el
 *  texto normalizado del usuario debe aparecer en el título. Los
 *  títulos guardados llevan tildes ("Caníbal") y el texto del usuario
 *  llega sin ellas, así que se normalizan los dos lados. Devuelve el
 *  mejor candidato: coincidencia exacta primero, luego la más corta. */
export function findReelByTitle(
  data: PanelData,
  query: string,
  wsId?: WorkspaceId,
): { wsId: WorkspaceId; item: ContentItem } | null {
  const q = normTitle(query.trim());
  if (!q) return null;
  const ids: WorkspaceId[] = wsId ? [wsId] : WORKSPACE_IDS;
  const hits: { wsId: WorkspaceId; item: ContentItem }[] = [];
  for (const id of ids) {
    for (const item of data[id].content) {
      if (normTitle(item.title).includes(q)) hits.push({ wsId: id, item });
    }
  }
  if (hits.length === 0) return null;
  hits.sort(
    (a, b) =>
      (normTitle(a.item.title) === q ? 0 : 1) -
        (normTitle(b.item.title) === q ? 0 : 1) ||
      a.item.title.length - b.item.title.length,
  );
  return hits[0];
}
