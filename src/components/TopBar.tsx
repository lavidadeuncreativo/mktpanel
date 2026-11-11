"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Clapperboard, Gift, Lightbulb, Search } from "lucide-react";
import {
  SCREEN_TITLES,
  usePanel,
  type ScreenId,
  type ViewId,
} from "./panel-context";
import type { WorkspaceId, WorkspaceData } from "@/lib/types";
import { WORKSPACES } from "@/lib/types";
import { aggregateTotals, workspaceTotals } from "@/lib/derive";
import { formatNumber } from "@/lib/store";
import { SegmentedControl } from "./ui";
import { cn } from "./cn";

/**
 * Barra superior (reemplaza a la barra lateral): marca a la izquierda,
 * buscador al centro como pieza principal, selector de espacio a la
 * derecha, y debajo la fila de secciones en píldoras con scroll
 * horizontal. Como la barra de la referencia fintech, pero con nuestro
 * degradado naranja: en Hoy va transparente sobre el degradado, con
 * texto blanco; en las demás pantallas, sobre el papel claro.
 */

interface SearchHit {
  key: string;
  label: string;
  sub: string;
  screen: ScreenId;
  icon: React.ReactNode;
}

function searchWorkspace(
  workspaces: WorkspaceData[],
  query: string,
): SearchHit[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const hits: SearchHit[] = [];

  for (const ws of workspaces) {
    for (const c of ws.content) {
      if (c.title.toLowerCase().includes(q)) {
        hits.push({
          key: `content-${c.id}`,
          label: c.title,
          sub: "Contenido",
          screen: "contenido",
          icon: <Clapperboard className="h-4 w-4" aria-hidden="true" />,
        });
      }
    }
    for (const i of ws.ideas) {
      if (
        i.title.toLowerCase().includes(q) ||
        i.notes.toLowerCase().includes(q)
      ) {
        hits.push({
          key: `idea-${i.id}`,
          label: i.title,
          sub: `${i.score} de 10`,
          screen: "ideas",
          icon: <Lightbulb className="h-4 w-4" aria-hidden="true" />,
        });
      }
    }
    for (const a of ws.anecdotes) {
      if (
        a.title.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q)
      ) {
        hits.push({
          key: `anecdote-${a.id}`,
          label: a.title,
          sub: a.name,
          screen: "giveaway",
          icon: <Gift className="h-4 w-4" aria-hidden="true" />,
        });
      }
    }
  }
  const screens: ScreenId[] = [
    "hoy",
    "agente",
    "metricas",
    "contenido",
    "calendario",
    "ideas",
    "giveaway",
    "pendientes",
    "bitacora",
    "conexiones",
  ];
  for (const s of screens) {
    if (SCREEN_TITLES[s].toLowerCase().includes(q)) {
      hits.push({
        key: `screen-${s}`,
        label: SCREEN_TITLES[s],
        sub: "Sección",
        screen: s,
        icon: <Search className="h-4 w-4" aria-hidden="true" />,
      });
    }
  }
  return hits.slice(0, 7);
}

const NAV: ScreenId[] = [
  "hoy",
  "agente",
  "contenido",
  "calendario",
  "metricas",
  "ideas",
  "giveaway",
  "pendientes",
  "bitacora",
  "conexiones",
];

export function TopBar() {
  const { data, view, screen, openScreen, setView } = usePanel();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // En Hoy la barra va sobre el degradado animado (como la barra
  // superior de la referencia): fondo transparente y texto blanco.
  const onGradient = screen === "hoy";

  // "General" vuelve a ofrecerse: ahora sí es un resumen agregado de
  // verdad (antes era EVYM disfrazado y por eso se había quitado). En
  // General el buscador busca en las tres cuentas y la línea de estado
  // muestra los totales agregados.
  const activeView: ViewId = view;
  const isGeneral = view === "general";
  const totals = isGeneral
    ? aggregateTotals(data)
    : workspaceTotals(data[view]);
  const hasData = isGeneral
    ? (Object.keys(data) as WorkspaceId[]).some(
        (id) => data[id].snapshots.length > 0,
      )
    : data[view].snapshots.length > 0;
  const activeLabel = isGeneral
    ? "General"
    : (WORKSPACES.find((w) => w.id === view)?.name ?? view);

  const visibleNav = NAV.filter(
    (id) => id !== "giveaway" || view === "evym",
  );

  const results = useMemo(
    () =>
      searchWorkspace(
        isGeneral
          ? [data.evym, data.antojo, data.personal]
          : [data[view]],
        query,
      ),
    [data, isGeneral, view, query],
  );

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-30 shrink-0 border-b backdrop-blur-xl",
        onGradient
          ? "border-white/20 bg-transparent"
          : "border-line bg-page/85",
      )}
    >
      {/* Fila 1: marca | buscador | espacio */}
      <div className="flex min-h-14 flex-wrap items-center gap-x-4 gap-y-2 px-4 pt-2 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => openScreen("hoy")}
          aria-label="Ir a Hoy"
          className="flex shrink-0 cursor-pointer items-center gap-2.5 rounded-lg"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-ink text-[13px] font-bold text-white">
            EV
          </span>
          <span className="min-w-0 text-left">
            <span
              className={cn(
                "block text-[15px] leading-tight font-semibold tracking-[-0.01em]",
                onGradient ? "text-white" : "text-ink",
              )}
            >
              Panel
            </span>
            <span
              className={cn(
                "block text-xs",
                onGradient ? "text-white/75" : "text-muted-fg",
              )}
            >
              Marketing de contenido
            </span>
          </span>
        </button>

        <div
          className="relative min-w-[200px] flex-1 sm:max-w-md lg:max-w-xl"
          ref={boxRef}
        >
          <div className="relative">
            <Search
              className={cn(
                "pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2",
                onGradient ? "text-white/70" : "text-muted-fg",
              )}
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              placeholder="Buscar Reels, ideas, anécdotas…"
              aria-label="Buscar en el panel"
              className={cn(
                "h-10 w-full rounded-full border pr-4 pl-10 text-[14px] transition-colors duration-200 ease-apple focus:outline-none",
                onGradient
                  ? "border-white/30 bg-white/15 text-white placeholder:text-white/70 focus:border-white focus:bg-white/20"
                  : "border-line bg-control text-ink placeholder:text-muted-fg/80 focus:border-primary focus:bg-card",
              )}
            />
          </div>
          {open && query.trim().length >= 2 ? (
            <div className="absolute inset-x-0 top-12 overflow-hidden rounded-[12px] border border-line bg-card shadow-[0_12px_32px_rgba(28,25,23,0.14)]">
              {results.length === 0 ? (
                <p className="px-4 py-3.5 text-sm text-muted-fg">
                  Sin resultados para “{query.trim()}” en este espacio.
                </p>
              ) : (
                <ul className="py-1.5">
                  {results.map((hit) => (
                    <li key={hit.key}>
                      <button
                        type="button"
                        onClick={() => {
                          openScreen(hit.screen);
                          setQuery("");
                          setOpen(false);
                        }}
                        className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-black/[0.03]"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-control text-muted-fg">
                          {hit.icon}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-medium text-ink">
                            {hit.label}
                          </span>
                          <span className="block text-xs text-muted-fg">
                            {hit.sub}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </div>

        <div className="ml-auto shrink-0">
          <SegmentedControl
            options={[
              { id: "general" as ViewId, label: "General" },
              ...WORKSPACES.map((w) => ({ id: w.id as ViewId, label: w.short })),
            ]}
            value={activeView}
            onChange={(id) => setView(id)}
            ariaLabel="Espacio de trabajo"
          />
          <p
            className={cn(
              "mt-1 text-right text-xs leading-none",
              onGradient ? "text-white/75" : "text-muted-fg",
            )}
          >
            {activeLabel}
            {hasData
              ? ` · ${formatNumber(totals.views)} vistas`
              : " · sin datos todavía"}
          </p>
        </div>
      </div>

      {/* Fila 2: secciones en píldoras, con scroll horizontal */}
      <nav
        aria-label="Secciones del panel"
        className="scroll-thin flex items-center gap-1 overflow-x-auto px-4 pt-1 pb-2 sm:px-6 lg:px-8"
      >
        {visibleNav.map((id) => {
          const active = screen === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => openScreen(id)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "min-h-9 shrink-0 cursor-pointer rounded-full px-3.5 text-sm font-medium whitespace-nowrap transition-colors duration-150",
                active
                  ? onGradient
                    ? "bg-white text-[#991b1b] shadow-[0_1px_4px_rgba(28,25,23,0.25)]"
                    : "bg-ink text-white"
                  : onGradient
                    ? "text-white/85 hover:bg-white/15 hover:text-white"
                    : "text-muted-fg hover:bg-black/[0.03] hover:text-ink",
              )}
            >
              {SCREEN_TITLES[id]}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
