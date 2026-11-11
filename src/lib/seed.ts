import type {
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
 * Real EVYM seed data, captured 10 nov 2026. Nothing here is invented:
 * the two published Reels are the only content, and the week stands at 2/7.
 * Antojo and the personal profile start empty on purpose.
 */
export function seedEvym(): WorkspaceData {
  return {
    snapshots: [FB_SNAPSHOT, IG_SNAPSHOT],
    content: [
      {
        id: "seed-reel-pascualita",
        title: "Leyenda de La Pascualita",
        status: "publicado",
        views: 281,
        publishDate: "2026-11-09",
        dayIndex: 0, // Monday
      },
      {
        id: "seed-reel-salamanca",
        title: "El Secreto de la Calle Salamanca",
        status: "publicado",
        views: null,
        publishDate: "2026-11-10",
        dayIndex: 1, // Tuesday
      },
    ],
    ideas: [],
    anecdotes: [],
    tasks: SEED_TASKS,
    log: SEED_LOG,
  };
}
