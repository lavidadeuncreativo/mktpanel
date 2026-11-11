import { emptyWorkspace, seedEvym } from "./seed";
import type { PanelData, WorkspaceId } from "./types";

export const STORAGE_KEY = "panel-evym-v1";

export function buildSeedData(): PanelData {
  return {
    evym: seedEvym(),
    antojo: emptyWorkspace(),
    personal: emptyWorkspace(),
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

export function getPanelData(): PanelData {
  if (!cache) cache = loadStoredData() ?? buildSeedData();
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
