import type {
  ContentStatus,
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
    reactions += s.reactions;
    comments += s.comments;
    shares += s.shares;
    interactions +=
      s.interactions ?? s.reactions + s.comments + s.shares;
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
