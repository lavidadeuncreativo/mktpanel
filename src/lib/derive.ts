import type {
  ContentItem,
  ContentStatus,
  Idea,
  MetricSnapshot,
  Network,
  PanelData,
  WorkspaceData,
  WorkspaceId,
} from "./types";
import { NETWORK_LABELS } from "./types";

/** Latest snapshot per network, newest first by date. */
export function latestByNetwork(
  snapshots: MetricSnapshot[],
): Partial<Record<Network, MetricSnapshot>> {
  const out: Partial<Record<Network, MetricSnapshot>> = {};
  const sorted = [...snapshots].sort((a, b) => b.date.localeCompare(a.date));
  for (const s of sorted) {
    if (!out[s.network]) out[s.network] = s;
  }
  return out;
}

/** Previous snapshot per network (the one right before the latest). */
export function previousByNetwork(
  snapshots: MetricSnapshot[],
): Partial<Record<Network, MetricSnapshot>> {
  const out: Partial<Record<Network, MetricSnapshot>> = {};
  const sorted = [...snapshots].sort((a, b) => b.date.localeCompare(a.date));
  const seen = new Set<Network>();
  for (const s of sorted) {
    if (seen.has(s.network)) {
      if (!out[s.network]) out[s.network] = s;
    } else {
      seen.add(s.network);
    }
  }
  return out;
}

export interface WorkspaceTotals {
  followers: number;
  views: number;
  reactions: number;
  comments: number;
  shares: number;
  /** Interactions as reported; when a network does not report a total,
   *  reactions + comments + shares stand in, so the number stays honest. */
  interactions: number;
  published: number;
  anecdotes: number;
  pendingTasks: number;
  networksWithData: Network[];
}

export function workspaceTotals(ws: WorkspaceData): WorkspaceTotals {
  const latest = latestByNetwork(ws.snapshots);
  let followers = 0;
  let views = 0;
  let reactions = 0;
  let comments = 0;
  let shares = 0;
  let interactions = 0;
  const networksWithData: Network[] = [];
  (Object.keys(latest) as Network[]).forEach((net) => {
    const s = latest[net];
    if (!s) return;
    networksWithData.push(net);
    followers += s.followers;
    views += s.views;
    // A null breakdown means "not reported", not zero: it adds nothing
    // to the total and the per-network card shows "Sin datos".
    reactions += s.reactions ?? 0;
    comments += s.comments ?? 0;
    shares += s.shares ?? 0;
    interactions +=
      s.interactions ?? (s.reactions ?? 0) + (s.comments ?? 0) + (s.shares ?? 0);
  });
  return {
    followers,
    views,
    reactions,
    comments,
    shares,
    interactions,
    published: ws.content.filter((c) => c.status === "publicado").length,
    anecdotes: ws.anecdotes.length,
    pendingTasks: ws.tasks.filter((t) => !t.done).length,
    networksWithData,
  };
}

export function aggregateTotals(data: PanelData): WorkspaceTotals {
  const ids: WorkspaceId[] = ["evym", "antojo", "personal"];
  const acc: WorkspaceTotals = {
    followers: 0,
    views: 0,
    reactions: 0,
    comments: 0,
    shares: 0,
    interactions: 0,
    published: 0,
    anecdotes: 0,
    pendingTasks: 0,
    networksWithData: [],
  };
  for (const id of ids) {
    const t = workspaceTotals(data[id]);
    acc.followers += t.followers;
    acc.views += t.views;
    acc.reactions += t.reactions;
    acc.comments += t.comments;
    acc.shares += t.shares;
    acc.interactions += t.interactions;
    acc.published += t.published;
    acc.anecdotes += t.anecdotes;
    acc.pendingTasks += t.pendingTasks;
    for (const n of t.networksWithData) {
      if (!acc.networksWithData.includes(n)) acc.networksWithData.push(n);
    }
  }
  return acc;
}

export function networkDisplayName(net: Network): string {
  return NETWORK_LABELS[net];
}

/** Share of total views per network, from the latest capture each. */
export function viewsShare(
  snapshots: MetricSnapshot[],
): { network: Network; views: number; pct: number }[] {
  const latest = latestByNetwork(snapshots);
  const entries = (Object.keys(latest) as Network[])
    .map((net) => ({ network: net, views: latest[net]?.views ?? 0 }))
    .filter((e) => e.views > 0)
    .sort((a, b) => b.views - a.views);
  const total = entries.reduce((sum, e) => sum + e.views, 0);
  return entries.map((e) => ({
    ...e,
    pct: total > 0 ? (e.views / total) * 100 : 0,
  }));
}

/** One point per capture date: the chosen metric summed across networks.
 *  Used for sparklines and the views-over-time line chart. Real captures
 *  only — with a single capture the series has a single point, and the
 *  UI says so instead of drawing a fake trend. */
export function metricSeries(
  snapshots: MetricSnapshot[],
  key: "views" | "followers" | "comments" | "reactions" | "shares",
): { date: string; value: number }[] {
  const byDate = new Map<string, number>();
  for (const s of snapshots) {
    byDate.set(s.date, (byDate.get(s.date) ?? 0) + (s[key] ?? 0));
  }
  return Array.from(byDate.entries())
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Views per date, one series per network, for the line chart. */
export function viewsSeriesByNetwork(
  snapshots: MetricSnapshot[],
): { date: string; facebook?: number; instagram?: number; tiktok?: number; youtube?: number }[] {
  const byDate = new Map<
    string,
    { date: string; facebook?: number; instagram?: number; tiktok?: number; youtube?: number }
  >();
  for (const s of snapshots) {
    const row = byDate.get(s.date) ?? { date: s.date };
    row[s.network] = s.views;
    byDate.set(s.date, row);
  }
  return Array.from(byDate.values()).sort((a, b) =>
    String(a.date).localeCompare(String(b.date)),
  );
}

/** Weekly progress: how many of the 7 day-slots hold a published Reel. */
export function weeklyProgress(ws: WorkspaceData): {
  published: number;
  total: number;
  pct: number;
} {
  const published = ws.content.filter(
    (c) => c.status === "publicado" && c.dayIndex !== null,
  ).length;
  return { published, total: 7, pct: Math.round((published / 7) * 100) };
}

export function statusCounts(ws: WorkspaceData): Record<ContentStatus, number> {
  const counts: Record<ContentStatus, number> = {
    idea: 0,
    guion: 0,
    imagenes: 0,
    edicion: 0,
    publicado: 0,
  };
  for (const c of ws.content) counts[c.status] += 1;
  return counts;
}

/* ------------------------------------------------------------------ */
/* La máquina: todo derivado de los datos que ya existen. Nada de      */
/* esto se guarda aparte, así que nunca puede desincronizarse.         */
/* ------------------------------------------------------------------ */

/** Today's slot: 0 = Monday … 6 = Sunday. Takes the date as input so the
 *  function stays pure — the clock is read once, on the client, by
 *  useTodayIso(). */
export function todayDayIndex(iso: string): number {
  return (new Date(`${iso}T12:00:00`).getDay() + 6) % 7;
}

export interface WeekSlot {
  dayIndex: number;
  item: ContentItem | null;
}

/** The 7 slots of the week, one per day, with their Reel (or empty). */
export function weekPlan(ws: WorkspaceData): WeekSlot[] {
  return Array.from({ length: 7 }, (_, i) => ({
    dayIndex: i,
    item: ws.content.find((c) => c.dayIndex === i) ?? null,
  }));
}

/** The Reel that belongs to today; if today is empty, the next one in
 *  the pipeline that still needs work. Null when there is nothing. */
export function todayReel(ws: WorkspaceData, iso: string): ContentItem | null {
  const today = weekPlan(ws)[todayDayIndex(iso)];
  if (today?.item) return today.item;
  const upcoming = [...ws.content]
    .filter((c) => c.status !== "publicado")
    .sort((a, b) => (a.dayIndex ?? 99) - (b.dayIndex ?? 99));
  return upcoming[0] ?? null;
}

function isoOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Consecutive days with a published Reel, derived from the publish dates.
 * The streak stays alive through today even if today is not published yet.
 */
export function streak(ws: WorkspaceData, iso: string): number {
  const dates = new Set(
    ws.content
      .filter((c) => c.status === "publicado" && c.publishDate)
      .map((c) => c.publishDate as string),
  );
  if (dates.size === 0) return 0;
  let count = 0;
  const cursor = new Date(`${iso}T12:00:00`);
  if (!dates.has(isoOf(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (dates.has(isoOf(cursor))) {
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

/** Highest-scored idea in the bank. Ideas leave the bank when they move
 *  to the pipeline, so the top one is always the next suggested topic. */
export function nextSuggestedIdea(ws: WorkspaceData): Idea | null {
  if (ws.ideas.length === 0) return null;
  return [...ws.ideas].sort(
    (a, b) => b.score - a.score || a.createdAt.localeCompare(b.createdAt),
  )[0];
}

/** What to publish next: unfinished Reels first (by weekday), then the
 *  published ones, newest first. */
export function publishQueue(ws: WorkspaceData): ContentItem[] {
  const byDay = (a: ContentItem, b: ContentItem) =>
    (a.dayIndex ?? 99) - (b.dayIndex ?? 99);
  const upcoming = ws.content
    .filter((c) => c.status !== "publicado")
    .sort(byDay);
  const published = ws.content
    .filter((c) => c.status === "publicado")
    .sort((a, b) => (b.publishDate ?? "").localeCompare(a.publishDate ?? ""));
  return [...upcoming, ...published];
}

