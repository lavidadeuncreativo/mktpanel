"use client";

import {
  ArrowRight,
  Clapperboard,
  Lightbulb,
  Music,
  Plus,
} from "lucide-react";
import { usePanel } from "./panel-context";
import { buildRecommendations } from "@/lib/recommend";
import { STATUS_LABELS, WORKSPACES } from "@/lib/types";
import { uid } from "@/lib/store";
import { statusTone } from "./modules/Content";
import { Button, Pill } from "./ui";

/* ------------------------------------------------------------------ */
/* "Qué publicar": la sección del Dashboard general que responde       */
/* "si no hay nada programado, ¿qué subo?". Tres fuentes, en orden:    */
/* lo que ya está en el pipeline y puede avanzar, los casos del banco  */
/* de ideas y los espacios vacíos (dichos tal cual, sin inventarles    */
/* contenido). Los sonidos no se recomiendan: el panel no guarda       */
/* ningún sonido hasta que se registre el de cada Reel publicado.      */
/* Todo se deriva del store en cada render.                            */
/* ------------------------------------------------------------------ */

export function Recommendations() {
  const { data, update, setView, openScreen, focusContent } = usePanel();
  const r = buildRecommendations(data);
  const firstWithoutSound = r.firstPublishedWithoutSound;

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
    <section
      aria-label="Qué publicar"
      className="surface space-y-6 p-5"
    >
      <div>
        <h3 className="flex items-center gap-2 text-base font-semibold tracking-[-0.01em] text-ink">
          <Lightbulb className="h-5 w-5 text-primary" aria-hidden="true" />
          Qué publicar
        </h3>
        <p className="mt-1 text-sm text-muted-fg">
          Si no hay nada programado, esto es lo que sigue: sacado de tu
          pipeline y de tu banco de casos, no inventado.
        </p>
      </div>

      {/* ---------- Listo para avanzar ---------- */}
      <div>
        <h4 className="text-sm font-semibold text-ink">
          Listo para avanzar
        </h4>
        {r.ready.length === 0 ? (
          <p className="mt-1 text-sm text-muted-fg">
            Nada en el pipeline todavía. Agrega un Reel en Contenido.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {r.ready.map(({ wsId, item, nextStep }) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[12px] border border-line bg-page px-3.5 py-3"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-control text-muted-fg">
                  <Clapperboard className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium text-ink">
                    {item.title}
                  </span>
                  <span className="block text-[13px] text-muted-fg">
                    {WORKSPACES.find((w) => w.id === wsId)?.short} ·{" "}
                    {STATUS_LABELS[item.status]} · Siguiente paso: {nextStep}
                  </span>
                </span>
                <Pill tone={statusTone(item.status)}>
                  {STATUS_LABELS[item.status]}
                </Pill>
                <Button
                  variant="outline"
                  onClick={() => focusContent(item.id, wsId)}
                >
                  Abrir en Contenido
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ---------- Casos que puedes contar ---------- */}
      <div>
        <h4 className="text-sm font-semibold text-ink">
          Casos que puedes contar
        </h4>
        {r.cases.length === 0 ? (
          <p className="mt-1 text-sm text-muted-fg">
            El banco de casos está vacío. Guarda un tema en Ideas y aparece
            aquí.
          </p>
        ) : (
          <div className="mt-2 grid gap-3 md:grid-cols-2">
            {r.cases.map((idea) => (
              <article
                key={idea.id}
                className="flex flex-col rounded-[12px] border border-line bg-page p-4"
              >
                <p className="text-2xl leading-none font-semibold tracking-[-0.02em] text-ink">
                  {idea.score}
                  <span className="text-sm font-medium text-muted-fg">
                    /10
                  </span>
                </p>
                <h5 className="mt-2 text-[15px] font-semibold text-ink">
                  {idea.title}
                </h5>
                {idea.notes ? (
                  <p className="mt-1 flex-1 text-sm text-muted-fg">
                    {idea.notes}
                  </p>
                ) : null}
                <Button
                  variant="outline"
                  className="mt-3 w-full"
                  onClick={() => moveCaseToScript(idea.id, idea.title)}
                >
                  Pasar a guion
                </Button>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* ---------- Espacios sin contenido ---------- */}
      {r.emptyWorkspaces.length > 0 ? (
        <div>
          <h4 className="text-sm font-semibold text-ink">
            Espacios sin contenido
          </h4>
          <ul className="mt-2 space-y-2">
            {r.emptyWorkspaces.map((ws) => (
              <li
                key={ws.wsId}
                className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[12px] border border-line bg-page px-3.5 py-3"
              >
                <span className="min-w-0 flex-1 text-sm text-muted-fg">
                  <span className="font-semibold text-ink">{ws.name}</span>{" "}
                  no tiene contenido en el pipeline todavía.
                </span>
                <Button
                  variant="outline"
                  onClick={() => {
                    setView(ws.wsId);
                    openScreen("ideas");
                  }}
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Agregar idea en {ws.short}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* ---------- Sonidos: nota honesta, no recomendación ---------- */}
      <div className="flex flex-wrap items-start gap-3 rounded-[12px] border border-line bg-page p-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-control text-muted-fg">
          <Music className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-ink">Sonidos</p>
          <p className="mt-0.5 text-sm text-muted-fg">
            Para recomendarte sonidos, registra el sonido que usaste en
            cada Reel publicado. El panel todavía no guarda ningún sonido,
            así que no puede decirte cuál usar.
            {r.totalPublished > 0 && r.publishedWithoutSound > 0
              ? ` Tienes ${r.publishedWithoutSound} de ${r.totalPublished} Reels publicados sin sonido registrado.`
              : ""}
          </p>
        </div>
        {firstWithoutSound ? (
          <Button
            variant="outline"
            onClick={() =>
              focusContent(firstWithoutSound.item.id, firstWithoutSound.wsId)
            }
          >
            Registrar sonido
          </Button>
        ) : null}
      </div>
    </section>
  );
}
