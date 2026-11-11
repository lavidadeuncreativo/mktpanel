export type WorkspaceId = "evym" | "antojo" | "personal";
export type Network = "facebook" | "instagram" | "tiktok" | "youtube" | "threads";
export type ContentStatus =
  | "idea"
  | "guion"
  | "imagenes"
  | "edicion"
  | "publicado";

export interface MetricSnapshot {
  id: string;
  network: Network;
  /** ISO date of the capture, e.g. "2026-11-10" */
  date: string;
  /** Human label for the period the capture covers, e.g. "Últimos 30 días" */
  period: string;
  followers: number;
  views: number;
  /** Null = la fuente no devolvió este dato (por ejemplo, la API de Meta
   *  no desglosa reacciones/comentarios/compartidos a nivel de página).
   *  Nunca se inventa un 0: la interfaz muestra "Sin datos". */
  reactions: number | null;
  comments: number | null;
  shares: number | null;
  /** Total interactions as reported by the network, when the network
   *  reports it separately. Null when not reported. */
  interactions: number | null;
  /** How the capture got here: manual form, CSV import, or Meta sync. */
  source?: "manual" | "csv" | "meta";
}

export interface ContentItem {
  id: string;
  title: string;
  status: ContentStatus;
  /** Views as reported after publishing; null while unpublished or unknown. */
  views: number | null;
  publishDate: string | null;
  /** 0 = Monday … 6 = Sunday, within the current week. Null when unscheduled. */
  dayIndex: number | null;
  /** Sonido o audio usado en el Reel, si se registró. Opcional: vacío
   *  hasta que Israel diga qué sonido usó cada Reel publicado; nunca se
   *  inventa un sonido. Sirve para que el panel recomiende sonidos a
   *  partir de lo que funcionó. */
  sound?: string;
  /** Guion generado por la IA del panel (clave en Conexiones), si se
   *  guardó. Se edita en el diálogo de Contenido; nunca se inventa. */
  script?: string;
  /** Copy generado por la IA del panel (caption + hashtags), si se
   *  guardó. Se edita en el diálogo de Contenido; nunca se inventa. */
  copy?: string;
}

export interface Idea {
  id: string;
  title: string;
  score: number; // 1–10
  notes: string;
  createdAt: string;
}

export interface Anecdote {
  id: string;
  name: string;
  contact: string;
  city: string;
  category: string;
  title: string;
  text: string;
  source: "landing" | "comentario";
  adult: boolean;
  finalist: boolean;
  winner: boolean;
  createdAt: string;
}

export interface TaskItem {
  id: string;
  label: string;
  done: boolean;
}

export interface LogEntry {
  id: string;
  date: string;
  text: string;
  source: string;
}

/** Estrategia de un espacio: qué quiere lograr, con qué ritmo y con
 *  qué enfoque. Cada cuenta tiene la suya: EVYM no es Antojo y Antojo
 *  no es el perfil personal. Se guarda en el store y se edita desde
 *  Hoy; sin estrategia guardada, el panel usa la sugerencia inicial
 *  de strategy.ts (nunca se inventa una métrica, solo una meta que el
 *  usuario puede cambiar). */
export interface WorkspaceStrategy {
  /** Qué quiere lograr esta cuenta (una frase). */
  goal: string;
  /** Reels por semana que se propone publicar. */
  cadencePerWeek: number;
  /** En qué se concentra el contenido de esta cuenta. */
  focus: string;
}

export interface WorkspaceData {
  snapshots: MetricSnapshot[];
  content: ContentItem[];
  ideas: Idea[];
  anecdotes: Anecdote[];
  tasks: TaskItem[];
  log: LogEntry[];
  /** Estrategia propia del espacio; ausente = sugerencia inicial. */
  strategy?: WorkspaceStrategy;
}

export type PanelData = Record<WorkspaceId, WorkspaceData>;

export interface WorkspaceMeta {
  id: WorkspaceId;
  name: string;
  short: string;
  description: string;
}

export const WORKSPACES: WorkspaceMeta[] = [
  {
    id: "evym",
    name: "Entre Vivos y Muertos",
    short: "EVYM",
    description: "Historias de terror mexicanas en video",
  },
  {
    id: "antojo",
    name: "Antojo",
    short: "Antojo",
    description: "Bebidas frías para eventos · latas personalizadas y catering",
  },
  {
    id: "personal",
    name: "Perfil personal",
    short: "Personal",
    description: "Perfil personal de Isra Granados",
  },
];

export const NETWORK_LABELS: Record<Network, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  threads: "Threads",
};

/** El universo de cuentas de Israel, por espacio: las redes que
 *  realmente tiene cada marca. TikTok y Threads todavía no tienen
 *  capturas registradas: sus huecos muestran "Sin datos todavía" y
 *  nunca un 0 inventado. YouTube no está en el universo todavía. */
export const UNIVERSE_NETWORKS: Record<WorkspaceId, Network[]> = {
  evym: ["instagram", "facebook", "tiktok", "threads"],
  antojo: ["instagram", "facebook", "tiktok", "threads"],
  personal: ["instagram", "threads"],
};

export const STATUS_LABELS: Record<ContentStatus, string> = {
  idea: "Idea",
  guion: "Guion",
  imagenes: "Imágenes",
  edicion: "Edición",
  publicado: "Publicado",
};

export const STATUS_ORDER: ContentStatus[] = [
  "idea",
  "guion",
  "imagenes",
  "edicion",
  "publicado",
];

export const WEEK_DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export const CHECKLIST_TASKS: string[] = [
  "Verificar el destino de publicaciones cruzadas a Facebook",
  "Fijar el comentario con la pregunta",
  "Publicar el Reel en Instagram y Facebook",
  "Responder los primeros comentarios",
  "Registrar la captura de métricas en el panel",
  "Revisar la retención del Reel en Business Suite",
];
