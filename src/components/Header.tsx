"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Clapperboard, Gift, Lightbulb, Search } from "lucide-react";
import {
  SCREEN_TITLES,
  usePanel,
  type ScreenId,
} from "./panel-context";
import type { WorkspaceId, WorkspaceData } from "@/lib/types";
import { cn } from "./cn";

/**
 * Cabecera del dashboard: título de la pantalla actual y buscador
 * global. El buscador encuentra Reels, ideas y anécdotas del espacio
 * activo (y las secciones por nombre); tocar un resultado abre la
 * pantalla que le corresponde. Nada de avatar ni iconos decorativos.
 */

interface SearchHit {
  key: string;
  label: string;
  sub: string;
  screen: ScreenId;
  icon: React.ReactNode;
}

function searchWorkspace(
  ws: WorkspaceData,
  query: string,
): SearchHit[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const hits: SearchHit[] = [];

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
  const screens: ScreenId[] = [
    "hoy",
    "metricas",
    "contenido",
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

export function Header() {
  const { data, view, screen, openScreen } = usePanel();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // "General" ya no se ofrece en la interfaz; si por algún estado
  // heredado llegara, se cae a EVYM.
  const activeView: WorkspaceId = view === "general" ? "evym" : view;
  const ws = data[activeView];

  const results = useMemo(() => searchWorkspace(ws, query), [ws, query]);

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
    <header className="sticky top-0 z-30 shrink-0 border-b border-line bg-page/85 backdrop-blur-xl">
      <div className="flex min-h-14 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <h1 className="text-[17px] font-semibold tracking-[-0.01em] whitespace-nowrap text-ink">
          {SCREEN_TITLES[screen]}
        </h1>

        <div className="relative min-w-0 flex-1 sm:max-w-md sm:flex-none sm:basis-80" ref={boxRef}>
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-fg"
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
              className="h-10 w-full rounded-full border border-line bg-control pr-4 pl-10 text-[14px] text-ink placeholder:text-muted-fg/80 focus:border-primary focus:bg-card focus:outline-none"
            />
          </div>
          {open && query.trim().length >= 2 ? (
            <div className="absolute inset-x-0 top-12 overflow-hidden rounded-[12px] border border-line bg-card shadow-[0_12px_32px_rgba(0,0,0,0.5)]">
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
                        className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/[0.04]"
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

        <div className="flex-1" />

        <p className="hidden text-sm text-muted-fg md:block">
          {activeView === "evym"
            ? "Entre Vivos y Muertos"
            : activeView === "antojo"
              ? "Antojo"
              : "Perfil personal"}
        </p>
      </div>
    </header>
  );
}

/** Navegación horizontal para móvil: la barra lateral no cabe. */
export function MobileNav() {
  const { screen, openScreen, view, setView } = usePanel();
  const activeView: WorkspaceId = view === "general" ? "evym" : view;

  const items: { id: ScreenId; label: string }[] = [
    { id: "hoy", label: "Hoy" },
    { id: "metricas", label: "Métricas" },
    { id: "contenido", label: "Contenido" },
    { id: "ideas", label: "Ideas" },
    { id: "pendientes", label: "Pendientes" },
    { id: "conexiones", label: "Conexiones" },
  ];

  return (
    <div className="shrink-0 border-b border-line bg-card lg:hidden">
      <div className="scroll-thin flex items-center gap-1 overflow-x-auto px-3 py-2">
        {items.map((item) => {
          const active = screen === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => openScreen(item.id)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "min-h-9 shrink-0 cursor-pointer rounded-full px-3.5 text-sm font-medium whitespace-nowrap transition-colors",
                active
                  ? "bg-white text-ink"
                  : "bg-white/[0.06] text-[#d4d4d8] hover:text-ink",
              )}
            >
              {item.label}
            </button>
          );
        })}
        <span className="mx-1 h-5 w-px shrink-0 bg-line" aria-hidden="true" />
        <select
          value={activeView}
          onChange={(e) => setView(e.target.value as WorkspaceId)}
          aria-label="Espacio de trabajo"
          className="h-9 shrink-0 cursor-pointer rounded-full border border-line bg-card px-3 text-sm font-medium text-ink focus:border-primary focus:outline-none"
        >
          <option value="evym">EVYM</option>
          <option value="antojo">Antojo</option>
          <option value="personal">Personal</option>
        </select>
      </div>
    </div>
  );
}
