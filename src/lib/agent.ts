import type { PanelData, WorkspaceData, WorkspaceId } from "./types";
import { STATUS_LABELS, WORKSPACES } from "./types";
import {
  latestByNetwork,
  nextSuggestedIdea,
  publishQueue,
  statusCounts,
  streak,
  todayReel,
  weeklyProgress,
  workspaceTotals,
} from "./derive";
import { formatDateShort, formatNumber } from "./store";

/* ------------------------------------------------------------------ */
/* Agente del panel: respuestas por reglas sobre los datos REALES del  */
/* store (localStorage). No hay llamadas externas, no hay IA de       */
/* verdad y no se inventa nada: cada cifra sale de una captura        */
/* registrada o el agente dice claro que no existe. Cuando algo       */
/* necesita el token de Meta (métricas reales, publicar), el agente   */
/* lo dice y apunta a Conexiones.                                     */
/* ------------------------------------------------------------------ */

export type AgentScreen =
  | "hoy"
  | "metricas"
  | "contenido"
  | "ideas"
  | "giveaway"
  | "pendientes"
  | "bitacora"
  | "conexiones";

export type AgentWidgetKind =
  | "reel"
  | "metrics"
  | "queue"
  | "idea"
  | "tasks"
  | "giveaway";

export type AgentEffect =
  | { type: "addIdea"; title: string; score: number }
  | { type: "addReel"; title: string };

export type PendingIntent = "idea" | "reel" | null;

export interface AgentReply {
  text: string;
  widget?: AgentWidgetKind;
  /** Botón de acción que abre una sección. */
  action?: { label: string; screen: AgentScreen };
  /** Efecto que el chat aplica al store (crear idea o Reel). */
  effect?: AgentEffect;
  /** Cambio de espacio que el chat aplica. */
  workspace?: WorkspaceId;
  /** Si el agente queda esperando un dato (el título de algo). */
  pending?: PendingIntent;
}

const SCREEN_NAMES: Record<string, AgentScreen> = {
  hoy: "hoy",
  inicio: "hoy",
  metricas: "metricas",
  contenido: "contenido",
  pipeline: "contenido",
  ideas: "ideas",
  banco: "ideas",
  giveaway: "giveaway",
  sorteo: "giveaway",
  pendientes: "pendientes",
  checklist: "pendientes",
  tareas: "pendientes",
  bitacora: "bitacora",
  conexiones: "conexiones",
  conexion: "conexiones",
  cuentas: "conexiones",
};

const SCREEN_LABELS: Record<AgentScreen, string> = {
  hoy: "Hoy",
  metricas: "Métricas",
  contenido: "Contenido",
  ideas: "Ideas",
  giveaway: "Giveaway",
  pendientes: "Pendientes",
  bitacora: "Bitácora",
  conexiones: "Conexiones",
};

function norm(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function wsName(wsId: WorkspaceId): string {
  return WORKSPACES.find((w) => w.id === wsId)?.name ?? wsId;
}

function wsShort(wsId: WorkspaceId): string {
  return WORKSPACES.find((w) => w.id === wsId)?.short ?? wsId;
}

const NEXT_STEP_LABEL: Record<string, string> = {
  idea: "Escribe el guion",
  guion: "Prepara las imágenes",
  imagenes: "Edita el video",
  edicion: "Publícalo hoy",
  publicado: "Publicado",
};

function todayLine(ws: WorkspaceData, iso: string): string {
  const reel = todayReel(ws, iso);
  const week = weeklyProgress(ws);
  if (reel) {
    return reel.status === "publicado"
      ? `Hoy ya salió: ${reel.title}. Llevas ${week.published} de 7 publicados esta semana.`
      : `Hoy toca ${reel.title}, está en ${STATUS_LABELS[reel.status]}. Siguiente paso: ${NEXT_STEP_LABEL[reel.status]}. Llevas ${week.published} de 7 publicados esta semana.`;
  }
  return `Hoy no hay Reel asignado. Llevas ${week.published} de 7 publicados esta semana.`;
}

function metricsText(ws: WorkspaceData, wsId: WorkspaceId): string {
  if (ws.snapshots.length === 0) {
    return `En ${wsName(wsId)} todavía no hay métricas registradas. Registra tu primera captura en Métricas y aquí te leo los números.`;
  }
  const totals = workspaceTotals(ws);
  const latest = latestByNetwork(ws.snapshots);
  const lastDate = [...ws.snapshots].sort((a, b) =>
    b.date.localeCompare(a.date),
  )[0].date;
  const lines = (Object.keys(latest) as (keyof typeof latest)[])
    .map((net) => {
      const s = latest[net];
      if (!s) return null;
      const name = net === "facebook" ? "Facebook" : "Instagram";
      return `${name}: ${formatNumber(s.views)} vistas, ${formatNumber(s.followers)} seguidores`;
    })
    .filter((l): l is string => l !== null);
  const trend =
    ws.snapshots.length < 2
      ? "Con una sola captura todavía no hay tendencia; con la segunda aparecen los cambios."
      : "";
  return [
    `En ${wsName(wsId)}, última captura ${formatDateShort(lastDate)}: ${formatNumber(totals.views)} vistas en total y ${formatNumber(totals.followers)} seguidores. ${formatNumber(totals.comments)} comentarios.`,
    ...lines,
    trend,
  ]
    .filter(Boolean)
    .join(" ");
}

function queueText(ws: WorkspaceData): string {
  const counts = statusCounts(ws);
  const upcoming = publishQueue(ws).filter((c) => c.status !== "publicado");
  if (upcoming.length === 0) {
    return `No hay nada pendiente de publicar. El pipeline tiene ${counts.publicado} publicados y nada en camino; agrega un Reel o pasa una idea a guion.`;
  }
  const first = upcoming
    .slice(0, 3)
    .map((c) => `${c.title} (${STATUS_LABELS[c.status]})`)
    .join("; ");
  return `Faltan ${upcoming.length} por publicar. En camino: ${first}. En total: ${counts.guion} en guion, ${counts.imagenes} en imágenes y ${counts.edicion} en edición.`;
}

function ideasText(ws: WorkspaceData): string {
  const top = nextSuggestedIdea(ws);
  if (!top) {
    return `El banco de ideas está vacío. Dime "agregar idea: ..." y la guardo con su puntuación.`;
  }
  return `Tienes ${ws.ideas.length} ${ws.ideas.length === 1 ? "idea" : "ideas"} en el banco. La más fuerte es "${top.title}", ${top.score} de 10${top.notes ? `: ${top.notes}` : "."}`;
}

function giveawayText(data: PanelData, wsId: WorkspaceId): string {
  const evym = data.evym;
  const winner = evym.anecdotes.find((a) => a.winner);
  const finalists = evym.anecdotes.filter((a) => a.finalist).length;
  if (wsId !== "evym") {
    return `El giveaway vive en Entre Vivos y Muertos. Ahí hay ${evym.anecdotes.length} anécdotas registradas${winner ? ` y ya hay ganador: ${winner.title}` : ", todavía sin ganador"}.`;
  }
  return `El giveaway tiene ${evym.anecdotes.length} anécdotas registradas, ${finalists} finalistas${winner ? ` y el ganador ya es "${winner.title}"` : " y todavía sin ganador"}.`;
}

function tasksText(ws: WorkspaceData): string {
  const pending = ws.tasks.filter((t) => !t.done);
  if (pending.length === 0) {
    return `No tienes pendientes. La lista está al día.`;
  }
  const first = pending
    .slice(0, 3)
    .map((t) => t.label)
    .join("; ");
  return `Te faltan ${pending.length} pendientes: ${first}${pending.length > 3 ? `, y ${pending.length - 3} más` : "."}`;
}

function capabilitiesText(): string {
  return `Puedo ayudarte con lo que ya tienes guardado aquí: qué toca hoy, cómo van las métricas, qué falta por publicar, tus ideas, el giveaway y tus pendientes. También puedo guardar ideas y Reels si me dices "agregar idea: ..." o "agregar reel: ...", y llevarte a cualquier sección. Lo que todavía no puedo: traer métricas nuevas de Meta ni publicar por ti; eso necesita el token, que se conecta en Conexiones.`;
}

/** ¿Esto parece una orden o pregunta para el agente, y no el título de
 *  algo que estábamos creando? Se usa para no tragarse un comando
 *  cuando el agente esperaba un título. */
function looksLikeCommand(q: string): boolean {
  return (
    /^(hola|buenas|hey|que tal|ayuda|gracias|cancelar|olvida)/.test(q) ||
    /(metrica|contenido|pipeline|idea|giveaway|sorteo|pendiente|checklist|bitacora|conexion|conecta|meta|token|publica|que toca|que falta|como van|hoy|abre|llevame|ir a|cambia|resumen)/.test(
      q,
    )
  );
}

export function answerAgent(
  raw: string,
  data: PanelData,
  wsId: WorkspaceId,
  iso: string,
  pending: PendingIntent,
): AgentReply {
  const q = norm(raw);
  const ws = data[wsId];

  if (!q) {
    return { text: "Dime qué necesitas y lo buscamos aquí mismo.", pending: null };
  }

  // Cancelar una creación a medias.
  if (/^(cancelar|olvida(lo)?|dejalo|nada)$/.test(q)) {
    return { text: "Listo, lo dejamos ahí. ¿Qué hacemos?", pending: null };
  }

  // El agente esperaba un título y el usuario lo escribió.
  if (pending === "idea" || pending === "reel") {
    if (!looksLikeCommand(q)) {
      const title = raw.trim();
      if (pending === "idea") {
        return {
          text: `Guardé "${title}" en el banco de ideas con 7 de 10. Puedes cambiar la puntuación en Ideas.`,
          widget: "idea",
          effect: { type: "addIdea", title, score: 7 },
          pending: null,
        };
      }
      return {
        text: `Agregué "${title}" al pipeline como idea. Lo ves en Contenido y lo mueves por los estados cuando quieras.`,
        widget: "queue",
        effect: { type: "addReel", title },
        pending: null,
      };
    }
    // Cayó un comando en lugar del título: se procesa normal y se
    // suelta la espera.
    pending = null;
  }

  // Crear en un solo mensaje: "agregar idea: La casa de Aramberri".
  // El título se extrae del texto original (con mayúsculas y tildes),
  // no del normalizado.
  const addIdea = raw.match(
    /^(agregar|nueva?|crea|anade)\s+(una\s+)?idea\b[:\-]?\s*(.*)$/i,
  );
  if (addIdea) {
    const title = (addIdea[3] ?? "").trim();
    if (title) {
      return {
        text: `Guardé "${title}" en el banco de ideas con 7 de 10. Puedes cambiar la puntuación en Ideas.`,
        widget: "idea",
        effect: { type: "addIdea", title, score: 7 },
        pending: null,
      };
    }
    return {
      text: "Claro. ¿Cómo se llama la idea?",
      pending: "idea",
    };
  }

  const addReel = raw.match(
    /^(agregar|nuevo|crea|anade)\s+(un\s+)?reel\b[:\-]?\s*(.*)$/i,
  );
  if (addReel) {
    const title = (addReel[3] ?? "").trim();
    if (title) {
      return {
        text: `Agregué "${title}" al pipeline como idea. Lo ves en Contenido y lo mueves por los estados cuando quieras.`,
        widget: "queue",
        effect: { type: "addReel", title },
        pending: null,
      };
    }
    return {
      text: "Claro. ¿Cómo se llama el Reel?",
      pending: "reel",
    };
  }

  // Cambiar de espacio: "cambia a Antojo", "ponte en personal".
  const switchWs = q.match(
    /\b(cambia(r)?|pon(te)?|pas[ae]te?|usa|ve(te)?)\s+(a|al|en)\s+(evym|antojo|personal)\b/,
  );
  if (switchWs) {
    const target = switchWs[6] as WorkspaceId;
    if (target === wsId) {
      return { text: `Ya estás en ${wsName(target)}.`, pending: null };
    }
    return {
      text: `Listo, ahora estás en ${wsName(target)}. ${todayLine(data[target], iso)}`,
      workspace: target,
      widget: "reel",
      pending: null,
    };
  }

  // Navegación: "llévame a Métricas", "abre Contenido".
  const nav = q.match(
    /\b(llevame|abre|abrir|ir a|muestrame|ver|ve a|lleva)\b[^,.;]*?\b(hoy|inicio|metricas|contenido|pipeline|ideas|banco|giveaway|sorteo|pendientes|checklist|tareas|bitacora|conexiones|conexion|cuentas)\b/,
  );
  if (nav) {
    const screen = SCREEN_NAMES[nav[2]];
    return {
      text: `Te llevo a ${SCREEN_LABELS[screen]}.`,
      action: { label: `Abrir ${SCREEN_LABELS[screen]}`, screen },
      pending: null,
    };
  }

  // Cola / pipeline. Va antes que la orden de publicar: "qué falta por
  // publicar" es una pregunta por la cola, no la orden de publicar.
  if (/(cola|pipeline|por publicar|que sigue)/.test(q)) {
    return {
      text: queueText(ws),
      widget: "queue",
      action: { label: "Ver pipeline", screen: "contenido" },
      pending: null,
    };
  }

  // Publicar: todavía no se puede desde el panel. Solo la orden directa
  // ("publica el reel", "publícalo") llega aquí.
  if (/publicalo|publica (el|este|ese|hoy|ahora)\b/.test(q)) {
    return {
      text: "Publicar directo desde el panel todavía no está conectado: necesita el token de Meta y el permiso de publicación. Por ahora el panel te deja el Reel listo y la lista de publicación. Revisa tus pendientes y cuando lo publiques lo marcas aquí.",
      widget: "tasks",
      action: { label: "Ver pendientes", screen: "pendientes" },
      pending: null,
    };
  }

  // Conectar Meta / token.
  if (/(conecta|conexion|meta|token|sincroniz|facebook|instagram|tiktok|youtube)/.test(q)) {
    return {
      text: "La conexión con Meta todavía no está hecha: el token se saca el viernes, cuando se acabe el candado de la cuenta. Cuando esté, las métricas llegan solas y no tendrás que registrar capturas a mano. Mientras, tus capturas manuales siguen valiendo.",
      action: { label: "Abrir Conexiones", screen: "conexiones" },
      pending: null,
    };
  }

  // Métricas.
  if (/(metrica|vistas|seguidores|comentarios|numeros|como van|resumen)/.test(q)) {
    return {
      text: metricsText(ws, wsId),
      widget: "metrics",
      action: { label: "Ver Métricas", screen: "metricas" },
      pending: null,
    };
  }

  // Qué toca hoy.
  if (/(que toca|que hay hoy|plan de hoy|que publico|hoy toca|que hago hoy)/.test(q)) {
    return {
      text: todayLine(ws, iso),
      widget: "reel",
      action: { label: "Ver Contenido", screen: "contenido" },
      pending: null,
    };
  }

  // Ideas.
  if (/(idea|tema|sugerencia|de que hablo|que grabo|banco)/.test(q)) {
    return {
      text: ideasText(ws),
      widget: "idea",
      action: { label: "Ver Ideas", screen: "ideas" },
      pending: null,
    };
  }

  // Giveaway.
  if (/(giveaway|sorteo|anecdota|premio|botella|ganador)/.test(q)) {
    if (wsId !== "evym") {
      return {
        text: giveawayText(data, wsId),
        workspace: "evym",
        widget: "giveaway",
        pending: null,
      };
    }
    return {
      text: giveawayText(data, wsId),
      widget: "giveaway",
      action: { label: "Abrir Giveaway", screen: "giveaway" },
      pending: null,
    };
  }

  // Pendientes.
  if (/(pendiente|checklist|tarea|que me falta|que falta|por hacer)/.test(q)) {
    return {
      text: tasksText(ws),
      widget: "tasks",
      action: { label: "Ver Pendientes", screen: "pendientes" },
      pending: null,
    };
  }

  // Racha / semana.
  if (/(racha|semana|cuantos llevo)/.test(q)) {
    const week = weeklyProgress(ws);
    const s = streak(ws, iso);
    return {
      text: `Llevas ${week.published} de 7 publicados esta semana y una racha de ${s} ${s === 1 ? "día" : "días"}. ${todayLine(ws, iso)}`,
      widget: "reel",
      pending: null,
    };
  }

  // Saludo.
  if (/^(hola|buenas|hey|que tal|que onda|buenos dias|buenas tardes|buenas noches)/.test(q)) {
    return {
      text: `Hola, Isra. ${todayLine(ws, iso)}`,
      widget: "reel",
      pending: null,
    };
  }

  // Ayuda / capacidades.
  if (/(ayuda|que puedes hacer|que sabes hacer|que haces|como funciona)/.test(q)) {
    return { text: capabilitiesText(), pending: null };
  }

  // Sin coincidencia: honesto, sin inventar.
  return {
    text: `Eso todavía no lo puedo hacer. ${capabilitiesText()}`,
    pending: null,
  };
}

export function greetingText(data: PanelData, wsId: WorkspaceId, iso: string): string {
  return `Hola, Isra. Soy tu agente del panel, en ${wsShort(wsId)}. ${todayLine(data[wsId], iso)}`;
}
