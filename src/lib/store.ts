import {
  ANTOJO_FB_SNAPSHOT_2026_11_11,
  ANTOJO_IG_SNAPSHOT_2026_11_11,
  ANTOJO_LOG_2026_11_11,
  EVYM_LOG_2026_11_11,
  FB_SNAPSHOT_2026_11_11,
  IG_SNAPSHOT_2026_11_11,
  PENDING_REELS_2026_11_11,
  PERSONAL_IG_SNAPSHOT_2026_11_11,
  PERSONAL_LOG_2026_11_11,
  REEL_VIEWS_2026_11_11,
  SEED_IDEAS_2026_11_11,
  seedAntojo,
  seedEvym,
  seedPersonal,
} from "./seed";
import type {
  LogEntry,
  MetricSnapshot,
  PanelData,
  WorkspaceData,
  WorkspaceId,
} from "./types";

export const STORAGE_KEY = "panel-evym-v1";

export function buildSeedData(): PanelData {
  return {
    evym: seedEvym(),
    antojo: seedAntojo(),
    personal: seedPersonal(),
  };
}

export function loadStoredData(): PanelData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PanelData;
    // Guard against partial/corrupt payloads: every workspace must exist
    // and carry the arrays the UI expects.
    const ids: WorkspaceId[] = ["evym", "antojo", "personal"];
    for (const id of ids) {
      const ws = parsed[id];
      if (
        !ws ||
        !Array.isArray(ws.snapshots) ||
        !Array.isArray(ws.content) ||
        !Array.isArray(ws.ideas) ||
        !Array.isArray(ws.anecdotes) ||
        !Array.isArray(ws.tasks) ||
        !Array.isArray(ws.log)
      ) {
        return null;
      }
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveStoredData(data: PanelData) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage full or unavailable: the app keeps working in memory.
  }
}

/**
 * External store for the panel data, wired for useSyncExternalStore.
 * The cache is the single source of truth in memory; every write persists
 * to localStorage and notifies subscribers. During SSR the seed is used;
 * on the client the stored payload wins on first read, which is the
 * supported hydration pattern for localStorage-backed state.
 */
let cache: PanelData | null = null;
const listeners = new Set<() => void>();

function emitPanelData() {
  for (const listener of listeners) listener();
}

/**
 * One-shot migration for stored payloads that still carry the old 10 nov
 * seed (e.g. a browser that loaded the panel before the 11 nov live
 * captures landed). Pure and idempotent: it appends any missing 11 nov
 * snapshot/log entry (matched by id), and updates the two published Reels'
 * Views ONLY when they still hold their old seed values (Pascualita 281,
 * Salamanca null) — a real edit the user made is never overwritten.
 * Returns the same reference when nothing changed.
 */
export function migratePanelData(data: PanelData): PanelData {
  let next = data;
  let changed = false;

  const migrateWorkspace = (
    ws: WorkspaceData,
    snapshots: MetricSnapshot[],
    logEntries: LogEntry[],
  ): WorkspaceData => {
    const missingSnaps = snapshots.filter(
      (s) => !ws.snapshots.some((x) => x.id === s.id),
    );
    const missingLogs = logEntries.filter(
      (l) => !ws.log.some((x) => x.id === l.id),
    );
    if (missingSnaps.length === 0 && missingLogs.length === 0) return ws;
    return {
      ...ws,
      snapshots: [...ws.snapshots, ...missingSnaps],
      log: [...ws.log, ...missingLogs],
    };
  };

  const apply = (id: WorkspaceId, ws: WorkspaceData) => {
    if (ws !== next[id]) {
      if (!changed) {
        next = { ...next };
        changed = true;
      }
      next[id] = ws;
    }
  };

  // EVYM: 11 nov snapshots + log, then the two Reel Views (guarded).
  let evym = migrateWorkspace(data.evym, [FB_SNAPSHOT_2026_11_11, IG_SNAPSHOT_2026_11_11], EVYM_LOG_2026_11_11);
  const migratedContent = evym.content.map((item) => {
    if (
      item.id === "seed-reel-pascualita" &&
      item.views === 281 &&
      REEL_VIEWS_2026_11_11[item.id] !== undefined
    ) {
      return { ...item, views: REEL_VIEWS_2026_11_11[item.id] };
    }
    if (
      item.id === "seed-reel-salamanca" &&
      item.views === null &&
      REEL_VIEWS_2026_11_11[item.id] !== undefined
    ) {
      return { ...item, views: REEL_VIEWS_2026_11_11[item.id] };
    }
    return item;
  });
  if (migratedContent.some((item, i) => item !== evym.content[i])) {
    evym = { ...evym, content: migratedContent };
  }
  // The three scripted Reels waiting for images (11 nov): append any
  // missing one by id, never touch the rest of the pipeline.
  const missingReels = PENDING_REELS_2026_11_11.filter(
    (r) => !evym.content.some((c) => c.id === r.id),
  );
  if (missingReels.length > 0) {
    evym = { ...evym, content: [...evym.content, ...missingReels] };
  }
  // The four researched cases in the ideas bank (11 nov): append any
  // missing one by id. Ideas the user already moved to script or
  // deleted stay gone — only the seed ids are added.
  const missingIdeas = SEED_IDEAS_2026_11_11.filter(
    (idea) => !evym.ideas.some((i) => i.id === idea.id),
  );
  if (missingIdeas.length > 0) {
    evym = { ...evym, ideas: [...evym.ideas, ...missingIdeas] };
  }
  apply("evym", evym);

  // Antojo: 11 nov snapshots + log.
  apply(
    "antojo",
    migrateWorkspace(
      data.antojo,
      [ANTOJO_FB_SNAPSHOT_2026_11_11, ANTOJO_IG_SNAPSHOT_2026_11_11],
      ANTOJO_LOG_2026_11_11,
    ),
  );

  // Personal: 11 nov Instagram snapshot + log.
  apply(
    "personal",
    migrateWorkspace(
      data.personal,
      [PERSONAL_IG_SNAPSHOT_2026_11_11],
      PERSONAL_LOG_2026_11_11,
    ),
  );

  return next;
}

export function getPanelData(): PanelData {
  if (!cache) {
    const stored = loadStoredData();
    if (stored) {
      const migrated = migratePanelData(stored);
      cache = migrated;
      if (migrated !== stored) saveStoredData(migrated);
    } else {
      cache = buildSeedData();
    }
  }
  return cache;
}

export function setPanelData(next: PanelData): void {
  cache = next;
  saveStoredData(next);
  emitPanelData();
}

export function subscribePanelData(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function uid(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Today as an ISO date (local time). */
export function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** "10 nov 2026" style, Spanish, short. */
export function formatDateShort(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

/** "lunes, 10 de noviembre de 2026" style, Spanish, long. */
export function formatDateLong(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("es-MX").format(n);
}

/** Signed delta, e.g. "+12.4%" or "-8.3%". Null when it cannot be computed. */
export function formatDeltaPct(current: number, previous: number): string | null {
  if (!previous || previous === 0) return null;
  const pct = ((current - previous) / previous) * 100;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}
