export type WorkspaceId = "evym" | "antojo" | "personal";
export type Network = "facebook" | "instagram" | "tiktok" | "youtube";
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
  reactions: number;
  comments: number;
  shares: number;
  /** Total interactions as reported by the network, when the network
   *  reports it separately. Null when not reported. */
  interactions: number | null;
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

export interface WorkspaceData {
  snapshots: MetricSnapshot[];
  content: ContentItem[];
  ideas: Idea[];
  anecdotes: Anecdote[];
  tasks: TaskItem[];
  log: LogEntry[];
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
    description: "Contenido y ventas de Antojo",
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
