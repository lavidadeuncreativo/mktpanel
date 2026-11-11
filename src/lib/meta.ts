import type { MetricSnapshot } from "./types";
import { formatNumber, todayIso } from "./store";

/**
 * Conexión real con Meta (Facebook + Instagram) vía Graph API.
 *
 * El token lo pega el usuario en la vista Conexiones y se guarda SOLO en
 * localStorage de su navegador (claves `panel-evym-meta-token` y
 * `panel-evym-meta-state`). Nada de esto sale del navegador ni se guarda
 * en el repo ni en ningún archivo. Las llamadas van directas del
 * navegador a graph.facebook.com.
 *
 * Flujo que el usuario sigue (documentado en el README y en la vista):
 * developers.facebook.com → su app → Explorador de la API Graph →
 * token con pages_show_list, pages_read_engagement, instagram_basic e
 * instagram_manage_insights → ampliar a larga duración → pegar aquí.
 */

const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

export const META_TOKEN_KEY = "panel-evym-meta-token";
export const META_STATE_KEY = "panel-evym-meta-state";

export interface MetaPage {
  id: string;
  name: string;
  pageAccessToken: string;
  igId: string | null;
  igUsername: string | null;
}

export interface MetaConnectionState {
  pageId: string;
  pageName: string;
  igId: string | null;
  igUsername: string | null;
  lastSyncAt: string | null;
  lastSyncError: string | null;
}

export interface MetaSyncResult {
  snapshots: MetricSnapshot[];
  /** Human lines for the bitácora and the sync report. */
  notes: string[];
  /** Per-network failures that did not block the other network. */
  failures: string[];
}

export class MetaApiError extends Error {
  constructor(
    message: string,
    public code?: number,
  ) {
    super(message);
    this.name = "MetaApiError";
  }
}

/* ------------------------------------------------------------------ */
/* Persistencia local (solo navegador)                                 */
/* ------------------------------------------------------------------ */

export function loadMetaToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(META_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function saveMetaToken(token: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(META_TOKEN_KEY, token);
  } catch {
    // Storage unavailable: the connection simply won't persist.
  }
}

export function loadMetaState(): MetaConnectionState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(META_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MetaConnectionState;
    if (!parsed || typeof parsed.pageId !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveMetaState(state: MetaConnectionState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(META_STATE_KEY, JSON.stringify(state));
  } catch {
    // Storage unavailable: the connection simply won't persist.
  }
}

export function clearMetaConnection(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(META_TOKEN_KEY);
    window.localStorage.removeItem(META_STATE_KEY);
  } catch {
    // Nothing to do.
  }
}

/* ------------------------------------------------------------------ */
/* Graph API                                                           */
/* ------------------------------------------------------------------ */

interface GraphErrorBody {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
  };
}

function mapGraphError(body: GraphErrorBody | null, status: number): MetaApiError {
  const err = body?.error;
  const code = err?.code;
  const raw = err?.message ?? "";

  if (code === 190) {
    return new MetaApiError(
      "El token es inválido o caducó. Genera uno nuevo en developers.facebook.com y pégalo de nuevo en Conexiones.",
      code,
    );
  }
  if (code === 200) {
    const perm =
      raw.match(/requires?\s+(?:the\s+)?([a-z_]+)\s+permission/i)?.[1] ??
      raw.match(/\(([\w_]+)\)\s*permission/i)?.[1];
    return new MetaApiError(
      perm
        ? `Falta el permiso “${perm}” en el token. En el Explorador de la API Graph, agrega ese permiso, genera el token de nuevo y pégalo aquí.`
        : "Falta un permiso en el token. Revisa que incluya pages_show_list, pages_read_engagement, instagram_basic e instagram_manage_insights, genera el token de nuevo y pégalo aquí.",
      code,
    );
  }
  if (code === 100) {
    return new MetaApiError(
      "Meta no encontró lo que se pidió. Revisa que la Página y la cuenta de Instagram sigan vinculadas en Business Suite.",
      code,
    );
  }
  if (code === 4 || code === 17) {
    return new MetaApiError(
      "Meta limitó las peticiones por el momento. Espera unos minutos e inténtalo de nuevo.",
      code,
    );
  }
  if (raw) {
    return new MetaApiError(`Meta respondió con un error: ${raw}`, code);
  }
  return new MetaApiError(
    `Meta respondió con un error (HTTP ${status}). Inténtalo de nuevo.`,
    code,
  );
}

async function graphFetch(path: string, token: string): Promise<unknown> {
  const sep = path.includes("?") ? "&" : "?";
  let res: Response;
  try {
    res = await fetch(
      `${GRAPH_BASE}${path}${sep}access_token=${encodeURIComponent(token)}`,
    );
  } catch {
    throw new MetaApiError(
      "No se pudo conectar con Meta. Revisa tu conexión a internet e inténtalo de nuevo.",
    );
  }
  const json = (await res.json().catch(() => null)) as GraphErrorBody | null;
  if (!res.ok || (json && typeof json === "object" && "error" in json)) {
    throw mapGraphError(json, res.status);
  }
  return json;
}

/** Pages the token's user manages, with their Instagram account if linked. */
export async function testMetaConnection(
  userToken: string,
): Promise<MetaPage[]> {
  const json = (await graphFetch(
    "/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}",
    userToken,
  )) as {
    data?: {
      id: string;
      name: string;
      access_token: string;
      instagram_business_account?: { id: string; username: string };
    }[];
  };
  const pages = json.data ?? [];
  return pages.map((p) => ({
    id: p.id,
    name: p.name,
    pageAccessToken: p.access_token,
    igId: p.instagram_business_account?.id ?? null,
    igUsername: p.instagram_business_account?.username ?? null,
  }));
}

/* ------------------------------------------------------------------ */
/* Insights                                                            */
/* ------------------------------------------------------------------ */

interface InsightValue {
  value?: number;
  end_time?: string;
}

interface InsightMetric {
  name?: string;
  values?: InsightValue[];
}

/** With period=days_28 each value is the 28-day total ending at end_time:
 *  the last one is the current total. Never sum them. */
function lastMetricValue(metrics: InsightMetric[], name: string): number | null {
  const metric = metrics.find((m) => m.name === name);
  const values = metric?.values ?? [];
  for (let i = values.length - 1; i >= 0; i--) {
    const v = values[i]?.value;
    if (typeof v === "number") return v;
  }
  return null;
}

/** With period=day each value is one day: the total is the sum. */
function sumMetricValues(metrics: InsightMetric[], name: string): number | null {
  const metric = metrics.find((m) => m.name === name);
  const values = metric?.values ?? [];
  let total = 0;
  let seen = false;
  for (const v of values) {
    if (typeof v.value === "number") {
      total += v.value;
      seen = true;
    }
  }
  return seen ? total : null;
}

function uid(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

const DAY_SECONDS = 86400;

/**
 * Sync one page (+ its linked Instagram) into MetricSnapshots.
 * Fields the API does not return are left null ("Sin datos"), never
 * invented. A failure in one network does not block the other: it lands
 * in `failures` and the rest still syncs.
 */
export async function syncMetaPage(
  page: MetaPage,
  date: string = todayIso(),
): Promise<MetaSyncResult> {
  const token = page.pageAccessToken;
  const snapshots: MetricSnapshot[] = [];
  const notes: string[] = [];
  const failures: string[] = [];
  const period = "Últimos 28 días (Meta)";

  // ---- Facebook Page ----
  try {
    const pageInfo = (await graphFetch(
      `/${page.id}?fields=fan_count`,
      token,
    )) as { fan_count?: number };
    const insights = (await graphFetch(
      `/${page.id}/insights?metric=page_impressions,page_post_engagements&period=days_28`,
      token,
    )) as { data?: InsightMetric[] };
    const metrics = insights.data ?? [];
    const impressions = lastMetricValue(metrics, "page_impressions");
    const engagements = lastMetricValue(metrics, "page_post_engagements");
    const fans = typeof pageInfo.fan_count === "number" ? pageInfo.fan_count : null;

    if (fans === null || impressions === null) {
      failures.push(
        "Facebook: Meta no devolvió los seguidores o las impresiones de la Página, así que no se guardó su captura.",
      );
    } else {
      snapshots.push({
        id: uid(),
        network: "facebook",
        date,
        period,
        followers: fans,
        views: impressions,
        // Meta no desglosa reacciones, comentarios y compartidos a nivel
        // de página: se guardan como no disponibles, nunca como 0.
        reactions: null,
        comments: null,
        shares: null,
        interactions: engagements,
        source: "meta",
      });
      notes.push(
        `Facebook: ${formatNumber(impressions)} vistas y ${formatNumber(fans)} seguidores en los últimos 28 días${
          engagements !== null
            ? `, ${formatNumber(engagements)} interacciones`
            : ""
        }.`,
      );
    }
  } catch (e) {
    failures.push(
      `Facebook: ${e instanceof MetaApiError ? e.message : "Error al sincronizar la Página."}`,
    );
  }

  // ---- Instagram ----
  if (page.igId) {
    try {
      const igInfo = (await graphFetch(
        `/${page.igId}?fields=followers_count,username`,
        token,
      )) as { followers_count?: number; username?: string };
      const until = Math.floor(Date.now() / 1000);
      const since = until - 28 * DAY_SECONDS;
      const igInsights = (await graphFetch(
        `/${page.igId}/insights?metric=reach,impressions&period=day&since=${since}&until=${until}`,
        token,
      )) as { data?: InsightMetric[] };
      const metrics = igInsights.data ?? [];
      const impressions = sumMetricValues(metrics, "impressions");
      const reach = sumMetricValues(metrics, "reach");
      const followers =
        typeof igInfo.followers_count === "number"
          ? igInfo.followers_count
          : null;

      if (followers === null || impressions === null) {
        failures.push(
          "Instagram: Meta no devolvió los seguidores o las impresiones de la cuenta, así que no se guardó su captura.",
        );
      } else {
        snapshots.push({
          id: uid(),
          network: "instagram",
          date,
          period,
          followers,
          views: impressions,
          reactions: null,
          comments: null,
          shares: null,
          interactions: null,
          source: "meta",
        });
        notes.push(
          `Instagram${page.igUsername ? ` (@${page.igUsername})` : ""}: ${formatNumber(impressions)} vistas y ${formatNumber(followers)} seguidores en los últimos 28 días${
            reach !== null ? `, alcance ${formatNumber(reach)}` : ""
          }.`,
        );
      }
    } catch (e) {
      failures.push(
        `Instagram: ${e instanceof MetaApiError ? e.message : "Error al sincronizar la cuenta."}`,
      );
    }
  } else {
    notes.push(
      "La Página no tiene una cuenta de Instagram profesional vinculada, así que solo se sincronizó Facebook.",
    );
  }

  return { snapshots, notes, failures };
}
