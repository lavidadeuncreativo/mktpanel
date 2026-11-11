"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowUp,
  ChevronRight,
  Clapperboard,
  ListVideo,
  Sparkles,
  Trophy,
} from "lucide-react";
import { usePanel, type ScreenId } from "./panel-context";
import type {
  ContentItem,
  ContentStatus,
  PanelData,
  WorkspaceId,
} from "@/lib/types";
import { STATUS_LABELS, STATUS_ORDER, WEEK_DAYS } from "@/lib/types";
import {
  answerAgent,
  greetingText,
  type AgentWidgetKind,
  type PendingIntent,
} from "@/lib/agent";
import {
  nextSuggestedIdea,
  publishQueue,
  streak,
  todayReel,
  weeklyProgress,
  workspaceTotals,
} from "@/lib/derive";
import {
  formatDateShort,
  formatNumber,
  todayIso,
  uid,
} from "@/lib/store";
import { useTodayIso } from "./useToday";
import { AnimatedNumber, Button, Pill } from "./ui";
import { cn } from "./cn";

/* ------------------------------------------------------------------ */
/* Agente del panel (Muse-style, chat-first):                         */
/*                                                                    */
/* - La pantalla Hoy es una conversación. El agente responde por      */
/*   reglas sobre los datos REALES del store: nunca inventa cifras,   */
/*   nunca llama a ninguna API y nunca finge ser una IA.              */
/* - Las respuestas traen tarjetas en línea (Reel de hoy, métricas,   */
/*   cola, idea, pendientes, giveaway) que se pueden accionar:        */
/*   avanzar el Reel, pasar una idea a guion, tachar pendientes.      */
/* - También crea: "agregar idea: ..." y "agregar reel: ..."         */
/*   guardan de verdad en el store.                                   */
/* - Movimiento rápido y sutil (framer-motion, 180 ms, ease Apple);   */
/*   MotionConfig reducedMotion="user" lo apaga si el sistema lo pide.*/
/* ------------------------------------------------------------------ */

const EASE: [number, number, number, number] = [0.32, 0.72, 0, 1];

const NEXT_STEP: Record<ContentStatus, { label: string; action: string }> = {
  idea: { label: "Escribe el guion", action: "Empezar guion" },
  guion: { label: "Prepara las imágenes", action: "Pasar a imágenes" },
  imagenes: { label: "Edita el video", action: "Pasar a edición" },
  edicion: { label: "Publícalo hoy", action: "Publicar hoy" },
  publicado: { label: "Publicado", action: "Publicado" },
};

function statusTone(
  status: ContentStatus,
): "green" | "blue" | "violet" | "neutral" | "amber" {
  switch (status) {
    case "publicado":
      return "green";
    case "edicion":
      return "blue";
    case "imagenes":
      return "violet";
    case "guion":
      return "amber";
    default:
      return "neutral";
  }
}

function advance(
  item: ContentItem,
  wsId: WorkspaceId,
  update: (fn: (d: PanelData) => PanelData) => void,
) {
  const idx = STATUS_ORDER.indexOf(item.status);
  const next = STATUS_ORDER[Math.min(idx + 1, STATUS_ORDER.length - 1)];
  update((d) => ({
    ...d,
    [wsId]: {
      ...d[wsId],
      content: d[wsId].content.map((c) =>
        c.id === item.id
          ? {
              ...c,
              status: next,
              publishDate: next === "publicado" ? todayIso() : c.publishDate,
            }
          : c,
      ),
    },
  }));
}

/* ------------------------------ Widgets ------------------------------ */

function ReelWidget() {
  const { data, view, update, openScreen } = usePanel();
  const iso = useTodayIso();
  const wsId: WorkspaceId = view === "general" ? "evym" : view;
  const ws = data[wsId];
  const reel = todayReel(ws, iso);
  const step = reel ? NEXT_STEP[reel.status] : null;

  return (
    <div className="surface surface-hover p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-semibold text-muted-fg">Reel de hoy</p>
        {reel ? (
          <Pill tone={reel.status === "publicado" ? "green" : "blue"}>
            {STATUS_LABELS[reel.status]}
          </Pill>
        ) : null}
      </div>
      {reel ? (
        <>
          <p className="mt-2 text-[19px] leading-snug font-semibold tracking-[-0.01em] text-ink">
            {reel.title}
          </p>
          <p className="mt-1 text-sm text-muted-fg">
            {step?.label}
            {reel.views !== null
              ? ` · ${formatNumber(reel.views)} reproducciones`
              : ""}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {reel.status !== "publicado" ? (
              <Button onClick={() => advance(reel, wsId, update)}>
                {step?.action}
              </Button>
            ) : (
              <Button onClick={() => openScreen("metricas")}>
                Registrar métricas del Reel
              </Button>
            )}
            <Button variant="ghost" onClick={() => openScreen("contenido")}>
              Ver pipeline
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="mt-2 text-[19px] leading-snug font-semibold tracking-[-0.01em] text-ink">
            Hoy no hay Reel asignado
          </p>
          <p className="mt-1 text-sm text-muted-fg">
            Agrega un Reel al pipeline o pasa una idea a guion y el día queda
            cubierto.
          </p>
          <div className="mt-4">
            <Button onClick={() => openScreen("contenido")}>
              Agregar Reel al pipeline
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function MetricsWidget() {
  const { data, view, openScreen } = usePanel();
  const iso = useTodayIso();
  const wsId: WorkspaceId = view === "general" ? "evym" : view;
  const ws = data[wsId];
  const totals = workspaceTotals(ws);
  const week = weeklyProgress(ws);
  const streakCount = streak(ws, iso);
  const lastCaptureDate =
    ws.snapshots.length > 0
      ? [...ws.snapshots].sort((a, b) => b.date.localeCompare(a.date))[0].date
      : null;

  if (ws.snapshots.length === 0) {
    return (
      <div className="surface surface-hover p-5">
        <p className="text-[15px] font-semibold text-ink">
          Todavía no hay métricas
        </p>
        <p className="mt-1 text-sm text-muted-fg">
          Registra tu primera captura en Métricas. La sincronización con Meta
          todavía no está conectada.
        </p>
        <div className="mt-4">
          <Button onClick={() => openScreen("metricas")}>
            Registrar captura
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="surface surface-hover p-5">
      <div className="grid grid-cols-2 gap-x-4 gap-y-4">
        <div>
          <p className="text-[22px] leading-none font-semibold tracking-[-0.02em] tabular-nums text-ink">
            <AnimatedNumber value={totals.views} format={formatNumber} />
          </p>
          <p className="mt-1 text-[13px] text-muted-fg">Vistas totales</p>
        </div>
        <div>
          <p className="text-[22px] leading-none font-semibold tracking-[-0.02em] tabular-nums text-ink">
            <AnimatedNumber value={totals.followers} format={formatNumber} />
          </p>
          <p className="mt-1 text-[13px] text-muted-fg">Seguidores</p>
        </div>
        <div>
          <p className="text-[22px] leading-none font-semibold tracking-[-0.02em] tabular-nums text-ink">
            <AnimatedNumber value={totals.comments} format={formatNumber} />
          </p>
          <p className="mt-1 text-[13px] text-muted-fg">Comentarios</p>
        </div>
        <div>
          <p className="text-[22px] leading-none font-semibold tracking-[-0.02em] tabular-nums text-ink">
            <AnimatedNumber value={streakCount} />
          </p>
          <p className="mt-1 text-[13px] text-muted-fg">
            {streakCount === 1 ? "Día de racha" : "Días de racha"}
          </p>
        </div>
      </div>
      <p className="mt-4 text-[13px] text-muted-fg">
        Llevas {week.published} de 7 publicados esta semana.
        {lastCaptureDate
          ? ` Última captura: ${formatDateShort(lastCaptureDate)}.`
          : ""}
      </p>
      <div className="mt-4">
        <Button variant="outline" onClick={() => openScreen("metricas")}>
          Ver Métricas
        </Button>
      </div>
    </div>
  );
}

function QueueWidget() {
  const { data, view, openScreen } = usePanel();
  const wsId: WorkspaceId = view === "general" ? "evym" : view;
  const ws = data[wsId];
  const queue = publishQueue(ws);
  const upcoming = queue.filter((c) => c.status !== "publicado");

  return (
    <div className="surface surface-hover overflow-hidden">
      <div className="border-b border-line px-5 py-3">
        <p className="text-[13px] font-semibold text-muted-fg">
          {upcoming.length === 0
            ? "Nada pendiente de publicar"
            : `${upcoming.length} por publicar`}
        </p>
      </div>
      {upcoming.length === 0 ? (
        <p className="px-5 py-4 text-sm text-muted-fg">
          El pipeline está al día. Agrega un Reel o pasa una idea a guion.
        </p>
      ) : (
        <ul>
          {upcoming.slice(0, 4).map((item, i) => (
            <li
              key={item.id}
              className={cn(
                "flex items-center gap-3 px-5 py-3",
                i > 0 && "border-t border-line/70",
              )}
            >
              <ListVideo
                className="h-[18px] w-[18px] shrink-0 text-muted-fg"
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-medium text-ink">
                  {item.title}
                </span>
                <span className="block text-[13px] text-muted-fg">
                  {item.dayIndex !== null
                    ? WEEK_DAYS[item.dayIndex]
                    : "Sin día asignado"}
                </span>
              </span>
              <Pill tone={statusTone(item.status)}>
                {STATUS_LABELS[item.status]}
              </Pill>
            </li>
          ))}
        </ul>
      )}
      <div className="border-t border-line px-5 py-3">
        <button
          type="button"
          onClick={() => openScreen("contenido")}
          className="flex cursor-pointer items-center gap-1 text-sm font-medium text-primary transition-opacity duration-200 ease-apple hover:opacity-70"
        >
          Ver pipeline
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function IdeaWidget() {
  const { data, view, update, openScreen } = usePanel();
  const wsId: WorkspaceId = view === "general" ? "evym" : view;
  const ws = data[wsId];
  const top = nextSuggestedIdea(ws);

  if (!top) {
    return (
      <div className="surface surface-hover p-5">
        <p className="text-[15px] font-semibold text-ink">
          El banco de ideas está vacío
        </p>
        <p className="mt-1 text-sm text-muted-fg">
          Dime “agregar idea: …” aquí mismo y la guardo con su puntuación.
        </p>
        <div className="mt-4">
          <Button onClick={() => openScreen("ideas")}>Abrir Ideas</Button>
        </div>
      </div>
    );
  }

  const moveToScript = () => {
    update((d) => ({
      ...d,
      [wsId]: {
        ...d[wsId],
        ideas: d[wsId].ideas.filter((i) => i.id !== top.id),
        content: [
          ...d[wsId].content,
          {
            id: uid(),
            title: top.title,
            status: "guion",
            views: null,
            publishDate: null,
            dayIndex: null,
          },
        ],
      },
    }));
    openScreen("contenido");
  };

  return (
    <div className="surface surface-hover p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-semibold text-muted-fg">
          La idea más fuerte
        </p>
        <p className="text-2xl leading-none font-semibold tracking-[-0.02em] text-ink">
          {top.score}
          <span className="text-sm font-medium text-muted-fg">/10</span>
        </p>
      </div>
      <p className="mt-2 text-[17px] leading-snug font-semibold tracking-[-0.01em] text-ink">
        {top.title}
      </p>
      {top.notes ? (
        <p className="mt-1 text-sm text-muted-fg">{top.notes}</p>
      ) : null}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button onClick={moveToScript}>
          <Clapperboard className="h-4 w-4" aria-hidden="true" />
          Pasar a guion
        </Button>
        <Button variant="ghost" onClick={() => openScreen("ideas")}>
          Ver ideas
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

function TasksWidget() {
  const { data, view, update, openScreen } = usePanel();
  const wsId: WorkspaceId = view === "general" ? "evym" : view;
  const ws = data[wsId];
  const pending = ws.tasks.filter((t) => !t.done);
  const doneCount = ws.tasks.length - pending.length;

  const toggle = (id: string) => {
    update((d) => ({
      ...d,
      [wsId]: {
        ...d[wsId],
        tasks: d[wsId].tasks.map((t) =>
          t.id === id ? { ...t, done: !t.done } : t,
        ),
      },
    }));
  };

  return (
    <div className="surface surface-hover overflow-hidden">
      <div className="border-b border-line px-5 py-3">
        <p className="text-[13px] font-semibold text-muted-fg">
          {doneCount} de {ws.tasks.length} completadas
        </p>
      </div>
      {pending.length === 0 ? (
        <p className="px-5 py-4 text-sm text-muted-fg">
          No tienes pendientes. La lista está al día.
        </p>
      ) : (
        <ul>
          {pending.slice(0, 5).map((task, i) => (
            <li
              key={task.id}
              className={cn(
                "flex items-center gap-3 px-5 py-3",
                i > 0 && "border-t border-line/70",
              )}
            >
              <button
                type="button"
                role="checkbox"
                aria-checked={false}
                aria-label={`Marcar completada: ${task.label}`}
                onClick={() => toggle(task.id)}
                className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-line bg-transparent transition-colors duration-150 ease-apple hover:border-primary"
              >
                <span className="sr-only">Completar</span>
              </button>
              <span className="min-w-0 flex-1 text-[15px] text-ink">
                {task.label}
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="border-t border-line px-5 py-3">
        <button
          type="button"
          onClick={() => openScreen("pendientes")}
          className="flex cursor-pointer items-center gap-1 text-sm font-medium text-primary transition-opacity duration-200 ease-apple hover:opacity-70"
        >
          Ver pendientes
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function GiveawayWidget() {
  const { data, view, openScreen, setView } = usePanel();
  const evym = data.evym;
  const winner = evym.anecdotes.find((a) => a.winner);
  const finalists = evym.anecdotes.filter((a) => a.finalist).length;

  if (view !== "evym") {
    return (
      <div className="surface surface-hover p-5">
        <p className="text-[15px] font-semibold text-ink">
          El giveaway vive en Entre Vivos y Muertos
        </p>
        <p className="mt-1 text-sm text-muted-fg">
          {evym.anecdotes.length} anécdotas registradas
          {winner ? `, y ya hay ganador: “${winner.title}”` : ", todavía sin ganador"}.
        </p>
        <div className="mt-4">
          <Button
            onClick={() => {
              setView("evym");
              openScreen("giveaway");
            }}
          >
            Ir a EVYM
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="surface surface-hover p-5">
      <div className="flex items-center gap-2">
        <Trophy
          className="h-[18px] w-[18px] text-muted-fg"
          aria-hidden="true"
        />
        <p className="text-[13px] font-semibold text-muted-fg">Giveaway</p>
      </div>
      <p className="mt-2 text-[22px] leading-none font-semibold tracking-[-0.02em] tabular-nums text-ink">
        {evym.anecdotes.length}
        <span className="ml-2 text-[15px] font-medium text-muted-fg">
          anécdotas
        </span>
      </p>
      <p className="mt-2 text-sm text-muted-fg">
        {finalists} finalistas
        {winner ? ` · Ganador: “${winner.title}”` : " · Todavía sin ganador."}
      </p>
      <div className="mt-4">
        <Button variant="outline" onClick={() => openScreen("giveaway")}>
          Abrir Giveaway
        </Button>
      </div>
    </div>
  );
}

function AgentWidget({ kind }: { kind: AgentWidgetKind }) {
  switch (kind) {
    case "reel":
      return <ReelWidget />;
    case "metrics":
      return <MetricsWidget />;
    case "queue":
      return <QueueWidget />;
    case "idea":
      return <IdeaWidget />;
    case "tasks":
      return <TasksWidget />;
    case "giveaway":
      return <GiveawayWidget />;
  }
}

/* ------------------------------ Chat ------------------------------ */

interface ChatMsg {
  id: string;
  role: "user" | "agent";
  text: string;
  widget?: AgentWidgetKind;
  action?: { label: string; screen: ScreenId };
}

const CHIPS = [
  "¿Qué toca hoy?",
  "¿Cómo van las métricas?",
  "¿Qué falta por publicar?",
  "Dame una idea",
  "¿Qué hay pendiente?",
];

function TypingDots() {
  return (
    <span className="flex items-center gap-1 py-1" aria-label="Escribiendo">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="block h-2 w-2 rounded-full bg-muted-fg"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </span>
  );
}

export function AgentChat() {
  const { data, view, update, openScreen, setView } = usePanel();
  const iso = useTodayIso();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [pending, setPending] = useState<PendingIntent>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  const wsId: WorkspaceId = view === "general" ? "evym" : view;
  const wsName =
    wsId === "evym"
      ? "Entre Vivos y Muertos"
      : wsId === "antojo"
        ? "Antojo"
        : "Perfil personal";

  // Saludo inicial, solo en el cliente (evita desajustes de hidratación).
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    setMessages([
      {
        id: uid(),
        role: "agent",
        text: greetingText(data, wsId, iso),
        widget: "reel",
      },
    ]);
    // Solo al montar: el saludo no se recalcula al cambiar de espacio.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, typing]);

  const send = (raw: string) => {
    const text = raw.trim();
    if (!text || typing) return;
    setMessages((m) => [...m, { id: uid(), role: "user", text }]);
    setInput("");
    setTyping(true);

    // La respuesta se calcula ya, con los datos de este render, y sus
    // efectos se aplican de inmediato; solo la aparición del mensaje
    // espera al indicador de escritura.
    const reply = answerAgent(text, data, wsId, iso, pending);
    if (reply.effect?.type === "addIdea") {
      const title = reply.effect.title;
      const score = reply.effect.score;
      update((d) => ({
        ...d,
        [wsId]: {
          ...d[wsId],
          ideas: [
            ...d[wsId].ideas,
            { id: uid(), title, score, notes: "", createdAt: todayIso() },
          ],
        },
      }));
    } else if (reply.effect?.type === "addReel") {
      const title = reply.effect.title;
      update((d) => ({
        ...d,
        [wsId]: {
          ...d[wsId],
          content: [
            ...d[wsId].content,
            {
              id: uid(),
              title,
              status: "idea",
              views: null,
              publishDate: null,
              dayIndex: null,
            },
          ],
        },
      }));
    }
    if (reply.workspace) setView(reply.workspace);
    setPending(reply.pending ?? null);

    timerRef.current = setTimeout(() => {
      setMessages((m) => [
        ...m,
        {
          id: uid(),
          role: "agent",
          text: reply.text,
          widget: reply.widget,
          action: reply.action
            ? {
                label: reply.action.label,
                screen: reply.action.screen as ScreenId,
              }
            : undefined,
        },
      ]);
      setTyping(false);
    }, 550);
  };

  const lastIsAgent =
    messages.length > 0 && messages[messages.length - 1].role === "agent";

  return (
    <div className="mx-auto w-full max-w-[760px]">
      {/* Cabecera del agente */}
      <div className="flex items-center gap-3 pb-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-ink">
          <Sparkles className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="text-[17px] leading-tight font-semibold tracking-[-0.01em] text-ink">
            Agente del panel
          </h2>
          <p className="truncate text-[13px] text-muted-fg">
            {wsName} · Responde con tus datos reales
          </p>
        </div>
      </div>

      {/* Hilo */}
      <div className="space-y-5 pb-4" aria-live="polite">
        {messages.map((msg) =>
          msg.role === "user" ? (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, ease: EASE }}
              className="flex justify-end"
            >
              <p className="max-w-[85%] rounded-[20px] rounded-br-md bg-primary px-4 py-2.5 text-[15px] leading-relaxed text-[#1c1c1e]">
                {msg.text}
              </p>
            </motion.div>
          ) : (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, ease: EASE }}
              className="flex gap-3"
            >
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-ink">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] leading-relaxed text-ink">
                  {msg.text}
                </p>
                {msg.widget ? (
                  <div className="mt-3">
                    <AgentWidget kind={msg.widget} />
                  </div>
                ) : null}
                {msg.action ? (
                  <div className="mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openScreen(msg.action!.screen)}
                    >
                      {msg.action.label}
                      <ChevronRight
                        className="h-4 w-4"
                        aria-hidden="true"
                      />
                    </Button>
                  </div>
                ) : null}
              </div>
            </motion.div>
          ),
        )}

        {typing ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
            className="flex gap-3"
          >
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-ink">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </span>
            <TypingDots />
          </motion.div>
        ) : null}
        <div ref={endRef} />
      </div>

      {/* Sugerencias rápidas */}
      {!typing && lastIsAgent ? (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: EASE }}
          className="flex flex-wrap gap-2 pb-4"
        >
          {CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => send(chip)}
              className="min-h-9 cursor-pointer rounded-full border border-line bg-card px-3.5 text-sm font-medium text-ink transition-colors duration-150 ease-apple hover:border-primary hover:text-primary"
            >
              {chip}
            </button>
          ))}
        </motion.div>
      ) : null}

      {/* Compositor */}
      <div className="sticky bottom-0 bg-gradient-to-t from-page via-page to-transparent pt-4 pb-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-end gap-2 rounded-[24px] border border-line bg-card p-2 pl-4 shadow-[0_8px_24px_rgba(0,0,0,0.4)]"
        >
          <label htmlFor="agent-input" className="sr-only">
            Escribe al agente del panel
          </label>
          <input
            id="agent-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pregunta por tus cuentas, guarda una idea…"
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent py-2 text-[15px] text-ink placeholder:text-muted-fg/70 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim() || typing}
            aria-label="Enviar"
            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-primary text-[#1c1c1e] transition-colors duration-150 ease-apple hover:bg-[#ffe14d] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowUp className="h-5 w-5" aria-hidden="true" />
          </button>
        </form>
        <p className="px-2 pt-2 pb-1 text-center text-xs text-muted-fg">
          El agente solo usa lo guardado en este navegador. Para métricas
          nuevas de Meta, ve a Conexiones.
        </p>
      </div>
    </div>
  );
}
