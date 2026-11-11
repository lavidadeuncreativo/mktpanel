import type { ContentItem, WorkspaceId } from "./types";
import { WORKSPACES } from "./types";

/* ------------------------------------------------------------------ */
/* Inteligencia artificial del panel (clave del usuario, OpenAI por    */
/* defecto). Todo ocurre EN EL NAVEGADOR: la clave se guarda solo en   */
/* localStorage y solo se envía a la API del proveedor con fetch,      */
/* nunca al repo ni a ningún servidor nuestro. La clave NUNCA se       */
/* registra en consola ni se muestra en pantalla: ni en errores ni     */
/* en mensajes.                                                        */
/*                                                                     */
/* El agente usa esto para dos acciones reales: generar el guion de    */
/* un Reel y generar su copy. Sin clave, el agente lo dice y apunta    */
/* a Conexiones — nunca finge haber generado nada.                     */
/* ------------------------------------------------------------------ */

export const AI_KEY_STORAGE_KEY = "panel-evym-ai-key";
export const AI_SETTINGS_STORAGE_KEY = "panel-evym-ai-settings";

export const DEFAULT_AI_MODEL = "gpt-4o-mini";
export const DEFAULT_AI_BASE_URL = "https://api.openai.com/v1";

export interface AiConfig {
  provider: "openai";
  /** La clave en sí. Nunca se muestra ni se registra. */
  key: string;
  model: string;
  baseUrl: string;
}

export function loadAiConfig(): AiConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const key = window.localStorage.getItem(AI_KEY_STORAGE_KEY);
    if (!key) return null;
    let model = DEFAULT_AI_MODEL;
    let baseUrl = DEFAULT_AI_BASE_URL;
    const raw = window.localStorage.getItem(AI_SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { model?: string; baseUrl?: string };
      if (parsed.model?.trim()) model = parsed.model.trim();
      if (parsed.baseUrl?.trim())
        baseUrl = parsed.baseUrl.trim().replace(/\/+$/, "");
    }
    return { provider: "openai", key, model, baseUrl };
  } catch {
    return null;
  }
}

export function saveAiConfig(key: string, model: string, baseUrl: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AI_KEY_STORAGE_KEY, key.trim());
  window.localStorage.setItem(
    AI_SETTINGS_STORAGE_KEY,
    JSON.stringify({
      model: model.trim() || DEFAULT_AI_MODEL,
      baseUrl: (baseUrl.trim() || DEFAULT_AI_BASE_URL).replace(/\/+$/, ""),
    }),
  );
}

export function clearAiConfig(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AI_KEY_STORAGE_KEY);
  window.localStorage.removeItem(AI_SETTINGS_STORAGE_KEY);
}

/** Error con mensaje en español llano para la interfaz. Nunca lleva
 *  la clave ni detalles técnicos que no ayuden. */
export class AiApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiApiError";
  }
}

interface ChatMessage {
  role: "system" | "user";
  content: string;
}

/** Una llamada a /chat/completions del proveedor, desde el navegador.
 *  Errores traducidos a español llano: clave inválida, sin saldo,
 *  sin conexión. */
export async function chatCompletion(
  config: AiConfig,
  messages: ChatMessage[],
): Promise<string> {
  let res: Response;
  try {
    res = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.key}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: 0.7,
      }),
    });
  } catch {
    throw new AiApiError(
      "No hay conexión con la API. Revisa tu internet y que la dirección base sea correcta.",
    );
  }

  if (!res.ok) {
    if (res.status === 401) {
      throw new AiApiError(
        "La clave no es válida o caducó. Revisa la clave en Conexiones y pega una nueva.",
      );
    }
    if (res.status === 402 || res.status === 429) {
      throw new AiApiError(
        "La cuenta no tiene saldo o se acabó la cuota. Revisa el saldo en la plataforma del proveedor.",
      );
    }
    if (res.status === 404) {
      throw new AiApiError(
        "El modelo no existe o la dirección base está mal. Revisa el modelo y la URL en Conexiones.",
      );
    }
    throw new AiApiError(
      `La API devolvió un error (${res.status}). Inténtalo de nuevo en un momento.`,
    );
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new AiApiError(
      "La API respondió algo que no se pudo leer. Inténtalo de nuevo.",
    );
  }
  const text = (
    data as { choices?: { message?: { content?: string } }[] }
  )?.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new AiApiError(
      "La API no devolvió texto. Inténtalo de nuevo.",
    );
  }
  return text;
}

/** Prueba rápida de la clave: un prompt mínimo. */
export async function testAiConnection(config: AiConfig): Promise<void> {
  await chatCompletion(config, [
    { role: "user", content: "Responde solo con la palabra: OK" },
  ]);
}

/* ------------------------- Guion y copy ------------------------- */

const EVYM_STYLE = `Eres el guionista de "Entre Vivos y Muertos", historias de terror
mexicanas en video. Narración reflexiva y humana, estilo Farid Dieck:
frases cortas, pausas, preguntas directas al espectador, sin
sensacionalismo y sin inventar datos. Todo en español de México.`;

function caseContext(item: ContentItem, wsId: WorkspaceId): string {
  const ws = WORKSPACES.find((w) => w.id === wsId)?.name ?? wsId;
  return `Reel: "${item.title}" (${ws}).`;
}

/** Guion de ~1:30 para un Reel, en loop: empieza con el gancho y
 *  termina con una pregunta que invita a comentar. Solo usa los datos
 *  del caso que se le dan; si falta un dato, no lo inventa. */
export function buildScriptMessages(
  item: ContentItem,
  wsId: WorkspaceId,
  notes: string | null,
): ChatMessage[] {
  return [
    { role: "system", content: EVYM_STYLE },
    {
      role: "user",
      content: `${caseContext(item, wsId)}
${notes ? `Datos del caso: ${notes}` : "No hay notas del caso guardadas: usa solo lo que dice el título y no inventes fechas, lugares ni nombres."}

Escribe el guion de narración para este Reel, de unos 90 segundos
hablados (unas 220 palabras). En formato loop: abre con el gancho
más fuerte del caso y cierra con una pregunta directa al espectador
que lo invite a contar su propia historia en los comentarios. Incluye
las fechas y los lugares reales del caso cuando estén en los datos.
Devuelve solo el guion, sin explicaciones ni encabezados.`,
    },
  ];
}

/** Caption + hashtags para el Reel, en el tono del canal. */
export function buildCopyMessages(
  item: ContentItem,
  wsId: WorkspaceId,
  notes: string | null,
): ChatMessage[] {
  return [
    { role: "system", content: EVYM_STYLE },
    {
      role: "user",
      content: `${caseContext(item, wsId)}
${notes ? `Datos del caso: ${notes}` : ""}

Escribe el copy para publicar este Reel en Instagram y Facebook:
una primera línea con gancho, dos o tres líneas con el dato más
fuerte del caso, la pregunta de cierre para los comentarios y entre
5 y 8 hashtags en español. Tono directo, sin clickbait barato y sin
inventar datos. Devuelve solo el copy, sin explicaciones.`,
    },
  ];
}

export async function generateScript(
  config: AiConfig,
  item: ContentItem,
  wsId: WorkspaceId,
  notes: string | null,
): Promise<string> {
  return chatCompletion(config, buildScriptMessages(item, wsId, notes));
}

export async function generateCopy(
  config: AiConfig,
  item: ContentItem,
  wsId: WorkspaceId,
  notes: string | null,
): Promise<string> {
  return chatCompletion(config, buildCopyMessages(item, wsId, notes));
}
