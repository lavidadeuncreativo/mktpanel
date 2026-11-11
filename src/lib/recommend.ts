import type {
  ContentItem,
  Idea,
  PanelData,
  WorkspaceId,
} from "./types";
import { STATUS_ORDER, WORKSPACES } from "./types";
import { publishQueue } from "./derive";
import { NEXT_STEP_LABEL } from "./agent";

/* ------------------------------------------------------------------ */
/* "Qué publicar": las recomendaciones del Dashboard general, sacadas  */
/* de lo que ya existe en el store — nunca inventadas. En orden:       */
/* (1) lo que ya está en el pipeline y puede avanzar, (2) los casos    */
/* del banco de ideas, (3) los espacios vacíos, dichos tal cual, y     */
/* (4) la nota honesta de sonidos: el panel no guarda ningún sonido    */
/* hasta que Israel registre el de cada Reel publicado, así que no     */
/* puede recomendar uno concreto. Todo se deriva en cada render.       */
/* ------------------------------------------------------------------ */

export interface ReadyItem {
  wsId: WorkspaceId;
  item: ContentItem;
  nextStep: string;
}

export interface EmptyWorkspace {
  wsId: WorkspaceId;
  name: string;
  short: string;
}

export interface Recommendations {
  /** Reels sin publicar, ordenados por etapa del pipeline. */
  ready: ReadyItem[];
  /** Casos de EVYM, por puntuación. */
  cases: Idea[];
  /** Espacios sin contenido ni ideas. */
  emptyWorkspaces: EmptyWorkspace[];
  /** Reels publicados sin sonido registrado. */
  publishedWithoutSound: number;
  totalPublished: number;
  /** Primer Reel publicado sin sonido, para abrirlo directo. */
  firstPublishedWithoutSound: {
    wsId: WorkspaceId;
    item: ContentItem;
  } | null;
}

const WORKSPACE_IDS: WorkspaceId[] = ["evym", "antojo", "personal"];

export function buildRecommendations(data: PanelData): Recommendations {
  const ready: ReadyItem[] = [];
  for (const id of WORKSPACE_IDS) {
    for (const item of publishQueue(data[id]).filter(
      (c) => c.status !== "publicado",
    )) {
      ready.push({ wsId: id, item, nextStep: NEXT_STEP_LABEL[item.status] });
    }
  }
  // Por etapa del pipeline (guion → imágenes → edición) y luego por
  // espacio, para que lo más avanzado salga primero.
  ready.sort(
    (a, b) =>
      STATUS_ORDER.indexOf(a.item.status) -
        STATUS_ORDER.indexOf(b.item.status) ||
      WORKSPACE_IDS.indexOf(a.wsId) - WORKSPACE_IDS.indexOf(b.wsId),
  );

  const cases = [...data.evym.ideas].sort(
    (a, b) => b.score - a.score || a.createdAt.localeCompare(b.createdAt),
  );

  const emptyWorkspaces = WORKSPACE_IDS.filter(
    (id) => data[id].content.length === 0 && data[id].ideas.length === 0,
  ).map((id) => ({
    wsId: id,
    name: WORKSPACES.find((w) => w.id === id)?.name ?? id,
    short: WORKSPACES.find((w) => w.id === id)?.short ?? id,
  }));

  const published = WORKSPACE_IDS.flatMap((id) =>
    data[id].content
      .filter((c) => c.status === "publicado")
      .map((item) => ({ wsId: id, item })),
  );
  const withoutSound = published.filter((p) => !p.item.sound?.trim());

  return {
    ready,
    cases,
    emptyWorkspaces,
    publishedWithoutSound: withoutSound.length,
    totalPublished: published.length,
    firstPublishedWithoutSound: withoutSound[0] ?? null,
  };
}
