import type {
  ContentItem,
  Idea,
  LogEntry,
  MetricSnapshot,
  TaskItem,
  WorkspaceData,
} from "./types";
import { CHECKLIST_TASKS } from "./types";

export function emptyWorkspace(): WorkspaceData {
  return {
    snapshots: [],
    content: [],
    ideas: [],
    anecdotes: [],
    tasks: [],
    log: [],
  };
}

const FB_SNAPSHOT: MetricSnapshot = {
  id: "seed-fb-2026-11-10",
  network: "facebook",
  date: "2026-11-10",
  period: "Últimos 30 días (11 oct – 9 nov)",
  followers: 1,
  views: 281,
  reactions: 5,
  comments: 0,
  shares: 0,
  interactions: null,
};

const IG_SNAPSHOT: MetricSnapshot = {
  id: "seed-ig-2026-11-10",
  network: "instagram",
  date: "2026-11-10",
  period: "Últimos 30 días",
  followers: 42,
  views: 3172,
  reactions: 13,
  comments: 0,
  shares: 2,
  interactions: 537,
};

const SEED_TASKS: TaskItem[] = CHECKLIST_TASKS.map((label, i) => ({
  id: `seed-task-${i + 1}`,
  label,
  done: false,
}));

const SEED_LOG: LogEntry[] = [
  {
    id: "seed-log-fb",
    date: "2026-11-10",
    text: "Captura de Facebook (11 oct – 9 nov): 281 vistas, 1 seguidor, 5 reacciones, 0 comentarios, 0 compartidos.",
    source: "Facebook / Business Suite",
  },
  {
    id: "seed-log-ig",
    date: "2026-11-10",
    text: "Captura de Estadísticas de Instagram (últimos 30 días): 42 seguidores, 3,172 vistas, 13 me gusta, 0 comentarios, 2 compartidos, 537 interacciones.",
    source: "Instagram / Business Suite",
  },
];

/**
 * Live captures from 11 nov 2026, fetched via the connected Facebook /
 * Instagram accounts (source "meta"). The 10 nov snapshots above stay as
 * history so the panel can show real deltas from a second capture.
 * Facebook page-level reactions/comments/shares are genuinely unavailable
 * from the Pages tools, so they stay null — never an invented 0.
 */
export const FB_SNAPSHOT_2026_11_11: MetricSnapshot = {
  id: "seed-fb-2026-11-11",
  network: "facebook",
  date: "2026-11-11",
  period: "Últimos 28 días (14 oct – 10 nov)",
  followers: 2,
  views: 568,
  reactions: null,
  comments: null,
  shares: null,
  interactions: 11,
  source: "meta",
};

export const IG_SNAPSHOT_2026_11_11: MetricSnapshot = {
  id: "seed-ig-2026-11-11",
  network: "instagram",
  date: "2026-11-11",
  period: "Últimos 30 días",
  followers: 122,
  views: 15171,
  reactions: 913,
  comments: 6,
  shares: 103,
  interactions: 1333,
  source: "meta",
};

export const ANTOJO_FB_SNAPSHOT_2026_11_11: MetricSnapshot = {
  id: "seed-antojo-fb-2026-11-11",
  network: "facebook",
  date: "2026-11-11",
  period: "Últimos 28 días (14 oct – 10 nov)",
  followers: 1,
  views: 45,
  reactions: null,
  comments: null,
  shares: null,
  interactions: 2,
  source: "meta",
};

export const ANTOJO_IG_SNAPSHOT_2026_11_11: MetricSnapshot = {
  id: "seed-antojo-ig-2026-11-11",
  network: "instagram",
  date: "2026-11-11",
  period: "Últimos 30 días",
  followers: 22344,
  views: 45128,
  reactions: 1599,
  comments: 161,
  shares: 671,
  interactions: 3913,
  source: "meta",
};

export const PERSONAL_IG_SNAPSHOT_2026_11_11: MetricSnapshot = {
  id: "seed-personal-ig-2026-11-11",
  network: "instagram",
  date: "2026-11-11",
  period: "Últimos 28 días",
  followers: 1427,
  views: 19308,
  reactions: null,
  comments: null,
  shares: null,
  interactions: 465,
  source: "meta",
};

/** Lifetime Instagram Views per published Reel, 11 nov 2026. */
export const REEL_VIEWS_2026_11_11: Record<string, number> = {
  "seed-reel-pascualita": 11859,
  "seed-reel-salamanca": 3434,
};

export const EVYM_LOG_2026_11_11: LogEntry[] = [
  {
    id: "seed-log-fb-2026-11-11",
    date: "2026-11-11",
    text: "Captura de Facebook (14 oct – 10 nov): 568 vistas, 2 seguidores, 11 interacciones.",
    source: "Facebook / Meta",
  },
  {
    id: "seed-log-ig-2026-11-11",
    date: "2026-11-11",
    text: "Captura de Estadísticas de Instagram (últimos 30 días): 122 seguidores, 15,171 vistas, 913 me gusta, 6 comentarios, 103 compartidos, 1,333 interacciones.",
    source: "Instagram / Meta",
  },
];

export const ANTOJO_LOG_2026_11_11: LogEntry[] = [
  {
    id: "seed-log-antojo-fb-2026-11-11",
    date: "2026-11-11",
    text: "Captura de Facebook (14 oct – 10 nov): 45 vistas, 1 seguidor, 2 interacciones.",
    source: "Facebook / Meta",
  },
  {
    id: "seed-log-antojo-ig-2026-11-11",
    date: "2026-11-11",
    text: "Captura de Estadísticas de Instagram (últimos 30 días): 22,344 seguidores, 45,128 vistas, 1,599 me gusta, 161 comentarios, 671 compartidos, 3,913 interacciones.",
    source: "Instagram / Meta",
  },
];

export const PERSONAL_LOG_2026_11_11: LogEntry[] = [
  {
    id: "seed-log-personal-ig-2026-11-11",
    date: "2026-11-11",
    text: "Captura de Estadísticas de Instagram (últimos 28 días): 1,427 seguidores, 19,308 vistas, 465 interacciones.",
    source: "Instagram / Meta",
  },
];

/**
 * The three Reels already scripted and waiting for images (11 nov 2026).
 * Unscheduled on purpose: no publish date, no weekday — they show in
 * Contenido's pipeline and in Calendario's "Sin fecha". Nothing about
 * their stage is invented: all three finished their Farid-style script
 * and are waiting on the image set.
 */
export const PENDING_REELS_2026_11_11: ContentItem[] = [
  {
    id: "seed-reel-canibal",
    title: "El Club Caníbal de Facebook",
    status: "imagenes",
    views: null,
    publishDate: null,
    dayIndex: null,
  },
  {
    id: "seed-reel-josue",
    title: "El caso Josué (La Mano Peluda)",
    status: "imagenes",
    views: null,
    publishDate: null,
    dayIndex: null,
  },
  {
    id: "seed-reel-parque-delta",
    title: "El Secreto Escondido en Parque Delta",
    status: "imagenes",
    views: null,
    publishDate: null,
    dayIndex: null,
  },
];

/**
 * Banco de casos de EVYM (11 nov 2026): los casos under investigados el
 * 10–11 nov que Israel ya discutió. Aramberri fue elegido por él como
 * próximo caso; los otros tres se ofrecieron y no se han elegido todavía
 * — las notas lo dicen tal cual. No se incluyen los casos que descartó
 * explícitamente (Los Narcosatánicos, El asesino de Cumbres, secta de la
 * Santa Muerte).
 */
export const SEED_IDEAS_2026_11_11: Idea[] = [
  {
    id: "seed-idea-aramberri",
    title: "Casa de Aramberri, Monterrey",
    score: 9,
    notes:
      "Elegido por Israel el 11 nov como próximo caso: Antonia Lozano, 54, y su hija Florinda, 22, asesinadas el 5 abr 1933 en Aramberri 1026; el loro que repetía \"¡No me mates, Gabriel!\" es leyenda, no hecho probado. Ya existen versiones de guion (Farid y Fausto+Farid).",
    createdAt: "2026-11-11",
  },
  {
    id: "seed-idea-hiena",
    title: "La Hiena de Querétaro (Claudia Mijangos)",
    score: 7,
    notes:
      "Opción under ofrecida el 10 nov, no elegida todavía: 24 abr 1989, mató a sus tres hijos; requiere un enfoque no sensacionalista (posesión vs. enfermedad).",
    createdAt: "2026-11-11",
  },
  {
    id: "seed-idea-canitas",
    title: "Cañitas (casa de Carlos Trejo, Popotla)",
    score: 7,
    notes:
      "Opción under ofrecida el 10 nov, no elegida todavía: casa de 1982, caso clásico del terror mexicano.",
    createdAt: "2026-11-11",
  },
  {
    id: "seed-idea-tubos",
    title: "Casa de los Tubos, Monterrey",
    score: 7,
    notes:
      "Opción under ofrecida el 10 nov, no elegida todavía.",
    createdAt: "2026-11-11",
  },
];

/**
 * Real seed data: 10 nov 2026 manual capture plus the 11 nov 2026 live
 * Meta captures, the three Reels already scripted and waiting for
 * images, and the four cases under del banco de ideas. Nothing here is
 * invented. Antojo and the personal profile now carry their real 11 nov
 * snapshots (Facebook + Instagram for Antojo, Instagram for personal);
 * their content, ideas and anecdotes stay empty.
 */
export function seedEvym(): WorkspaceData {
  return {
    snapshots: [FB_SNAPSHOT, IG_SNAPSHOT, FB_SNAPSHOT_2026_11_11, IG_SNAPSHOT_2026_11_11],
    content: [
      {
        id: "seed-reel-pascualita",
        title: "Leyenda de La Pascualita",
        status: "publicado",
        views: REEL_VIEWS_2026_11_11["seed-reel-pascualita"],
        publishDate: "2026-11-09",
        dayIndex: 0, // Monday
      },
      {
        id: "seed-reel-salamanca",
        title: "El Secreto de la Calle Salamanca",
        status: "publicado",
        views: REEL_VIEWS_2026_11_11["seed-reel-salamanca"],
        publishDate: "2026-11-10",
        dayIndex: 1, // Tuesday
      },
      ...PENDING_REELS_2026_11_11,
    ],
    ideas: [...SEED_IDEAS_2026_11_11],
    anecdotes: [],
    tasks: SEED_TASKS,
    log: [...SEED_LOG, ...EVYM_LOG_2026_11_11],
  };
}

/** Antojo: real 11 nov 2026 Meta captures; no content yet. */
export function seedAntojo(): WorkspaceData {
  return {
    snapshots: [ANTOJO_FB_SNAPSHOT_2026_11_11, ANTOJO_IG_SNAPSHOT_2026_11_11],
    content: [],
    ideas: [],
    anecdotes: [],
    tasks: [],
    log: ANTOJO_LOG_2026_11_11,
  };
}

/** Personal profile: real 11 nov 2026 Instagram capture; no content yet. */
export function seedPersonal(): WorkspaceData {
  return {
    snapshots: [PERSONAL_IG_SNAPSHOT_2026_11_11],
    content: [],
    ideas: [],
    anecdotes: [],
    tasks: [],
    log: PERSONAL_LOG_2026_11_11,
  };
}
