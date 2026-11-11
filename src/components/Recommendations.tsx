"use client";

import { Clapperboard, Lightbulb } from "lucide-react";
import { usePanel } from "./panel-context";
import { buildRecommendations } from "@/lib/recommend";
import { STATUS_LABELS, WORKSPACES } from "@/lib/types";
import { uid } from "@/lib/store";
import { statusTone } from "./modules/Content";
import { Pill } from "./ui";

/* ------------------------------------------------------------------ */
/* "Qué publicar", versión compacta para el bento general: UNA idea    */
/* por tarjeta. Solo lo primero de cada fuente: el Reel más avanzado   */
/* del pipeline y el caso mejor puntuado del banco. El resto vive      */
/* donde ya estaba — el pipeline en Contenido, los casos en Ideas —    */
/* y se llega con un botón. Nada inventado, todo del store. La nota    */
/* de sonidos no va aquí: vive en Contenido, donde se registra el      */
/* sonido de cada Reel.                                                */
/* ------------------------------------------------------------------ */

export function RecommendationsCompact() {
  const { data, update, setView, openScreen, focusContent } = usePanel();
  const r = buildRecommendations(data);
  const firstReady = r.ready[0] ?? null;
  const firstCase = r.cases[0] ?? null;

  const moveCaseToScript = (ideaId: string, title: string) => {
    update((d) => ({
      ...d,
      evym: {
        ...d.evym,
        ideas: d.evym.ideas.filter((i) => i.id !== ideaId),
        content: [
          ...d.evym.content,
          {
            id: uid(),
            title,
            status: "guion",
            views: null,
            publishDate: null,
            dayIndex: null,
          },
        ],
      },
    }));
    // Contenido en vista general solo resume: hay que entrar al espacio.
    setView("evym");
    openScreen("contenido");
  };

  return (
    <article aria-label="Qué publicar" className="surface flex flex-col p-4">
      <h3 className="flex items-center gap-2 text-[17px] font-semibold tracking-[-0.01em] text-ink">
        <Lightbulb className="h-5 w-5 text-primary" aria-hidden="true" />
        Qué publicar
      </h3>

      {firstReady ? (
        <button
          type="button"
          onClick={() => focusContent(firstReady.item.id, firstReady.wsId)}
          className="mt-3 flex w-full cursor-pointer items-start gap-3 text-left"
          title="Abrir en Contenido"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-control text-muted-fg">
            <Clapperboard className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[16px] leading-snug font-semibold text-ink">
              {firstReady.item.title}
            </span>
            <span className="mt-0.5 block text-[14px] text-muted-fg">
              {WORKSPACES.find((w) => w.id === firstReady.wsId)?.short} ·{" "}
              Siguiente paso: {firstReady.nextStep}
            </span>
          </span>
          <Pill tone={statusTone(firstReady.item.status)}>
            {STATUS_LABELS[firstReady.item.status]}
          </Pill>
        </button>
      ) : (
        <p className="mt-3 text-[15px] text-muted-fg">
          Nada en el pipeline todavía. Agrega un Reel en Contenido.
        </p>
      )}

      {firstCase ? (
        <div className="mt-3 flex items-center gap-3 border-t border-line/70 pt-3">
          <p className="shrink-0 text-[22px] leading-none font-semibold tracking-[-0.02em] tabular-nums text-ink">
            {firstCase.score}
            <span className="text-[13px] font-medium text-muted-fg">
              /10
            </span>
          </p>
          <p className="min-w-0 flex-1 truncate text-[15px] font-semibold text-ink">
            {firstCase.title}
          </p>
          <button
            type="button"
            onClick={() => moveCaseToScript(firstCase.id, firstCase.title)}
            className="shrink-0 cursor-pointer text-[14px] font-semibold text-primary hover:opacity-75"
          >
            Pasar a guion
          </button>
        </div>
      ) : null}
    </article>
  );
}
