"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import {
  BarChart3,
  CheckSquare,
  LayoutDashboard,
  Lightbulb,
  ListVideo,
  Search,
} from "lucide-react";
import { usePanel, type ModuleId } from "./panel-context";
import type { WorkspaceId } from "@/lib/types";
import { WORKSPACES } from "@/lib/types";
import { formatDateLong, todayIso } from "@/lib/store";
import { cn } from "./cn";

interface SearchHit {
  key: string;
  kind: string;
  label: string;
  detail: string;
  module: ModuleId;
  workspace: WorkspaceId;
}

const VIEWS: { id: "general" | WorkspaceId; label: string }[] = [
  { id: "general", label: "Vista general" },
  { id: "evym", label: "Entre Vivos y Muertos" },
  { id: "antojo", label: "Antojo" },
  { id: "personal", label: "Personal" },
];

export function Header() {
  const { data, view, setView, setModule } = usePanel();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  // Current date via an external store: null during prerender, today's
  // date on the client. Reading the clock during render would tie the
  // static page to the build time.
  const today = useSyncExternalStore(
    () => () => {},
    () => (typeof window === "undefined" ? null : todayIso()),
    () => null,
  );

  const hits = useMemo<SearchHit[]>(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const scopes: WorkspaceId[] =
      view === "general" ? ["evym", "antojo", "personal"] : [view];
    const out: SearchHit[] = [];
    for (const wsId of scopes) {
      const ws = data[wsId];
      const wsName =
        WORKSPACES.find((w) => w.id === wsId)?.short ?? wsId;
      for (const c of ws.content) {
        if (c.title.toLowerCase().includes(q)) {
          out.push({
            key: `c-${c.id}`,
            kind: "Reel",
            label: c.title,
            detail: wsName,
            module: "contenido",
            workspace: wsId,
          });
        }
      }
      for (const idea of ws.ideas) {
        if (
          idea.title.toLowerCase().includes(q) ||
          idea.notes.toLowerCase().includes(q)
        ) {
          out.push({
            key: `i-${idea.id}`,
            kind: "Idea",
            label: idea.title,
            detail: wsName,
            module: "ideas",
            workspace: wsId,
          });
        }
      }
      for (const a of ws.anecdotes) {
        if (
          a.title.toLowerCase().includes(q) ||
          a.name.toLowerCase().includes(q) ||
          a.text.toLowerCase().includes(q)
        ) {
          out.push({
            key: `a-${a.id}`,
            kind: "Anécdota",
            label: a.title,
            detail: `${a.name}, ${wsName}`,
            module: "giveaway",
            workspace: wsId,
          });
        }
      }
      for (const t of ws.tasks) {
        if (t.label.toLowerCase().includes(q)) {
          out.push({
            key: `t-${t.id}`,
            kind: "Pendiente",
            label: t.label,
            detail: wsName,
            module: "pendientes",
            workspace: wsId,
          });
        }
      }
    }
    return out.slice(0, 8);
  }, [query, data, view]);

  const goToHit = (hit: SearchHit) => {
    setView(hit.workspace);
    setModule(hit.module);
    setQuery("");
    setOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white">
      <div className="flex min-h-16 items-center gap-3 px-4 sm:px-6">
        {/* Brand on mobile */}
        <div className="flex items-center gap-2 lg:hidden">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink font-display text-xs font-bold text-white">
            EV
          </div>
          <span className="font-display text-[15px] font-semibold text-ink">
            Panel EVYM
          </span>
        </div>

        {/* Workspace switcher: segmented on desktop, select on mobile */}
        <div
          className="scroll-thin hidden items-center gap-1 overflow-x-auto rounded-lg bg-muted p-1 md:flex"
          role="tablist"
          aria-label="Espacio de trabajo"
        >
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              role="tab"
              aria-selected={view === v.id}
              onClick={() => setView(v.id)}
              className={cn(
                "min-h-9 cursor-pointer rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors duration-150",
                view === v.id
                  ? "bg-ink text-white"
                  : "text-muted-fg hover:text-ink",
              )}
            >
              {v.label}
            </button>
          ))}
        </div>
        <select
          aria-label="Espacio de trabajo"
          value={view}
          onChange={(e) => setView(e.target.value as "general" | WorkspaceId)}
          className="h-11 cursor-pointer rounded-lg border border-line bg-white px-2 text-sm font-medium text-ink md:hidden"
        >
          {VIEWS.map((v) => (
            <option key={v.id} value={v.id}>
              {v.label}
            </option>
          ))}
        </select>

        <div className="flex-1" />

        {/* Search */}
        <div className="relative hidden sm:block">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-fg"
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
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && hits.length > 0) goToHit(hits[0]);
              if (e.key === "Escape") setOpen(false);
            }}
            placeholder="Buscar Reels, ideas, anécdotas"
            aria-label="Buscar en el panel"
            className="h-11 w-64 rounded-lg border border-line bg-white pr-3 pl-9 text-[15px] text-ink placeholder:text-muted-fg/70 transition-colors duration-150 focus:border-primary focus:outline-none lg:w-80"
          />
          {open && query.trim().length >= 2 ? (
            <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-xl border border-line bg-white shadow-none">
              {hits.length === 0 ? (
                <p className="px-4 py-3 text-sm text-muted-fg">
                  Sin resultados para “{query.trim()}”.
                </p>
              ) : (
                <ul>
                  {hits.map((hit) => (
                    <li key={hit.key}>
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          goToHit(hit);
                        }}
                        className="flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-muted"
                      >
                        <span className="mt-0.5 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-fg">
                          {hit.kind}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-ink">
                            {hit.label}
                          </span>
                          <span className="block text-xs text-muted-fg">
                            {hit.detail}
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

        {/* Date pill */}
        {today ? (
          <span className="hidden rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-fg xl:inline-flex">
            {formatDateLong(today)}
          </span>
        ) : null}

        {/* Avatar */}
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink font-display text-xs font-bold text-white"
          title="Isra Granados"
          aria-label="Isra Granados"
        >
          IG
        </div>
      </div>

      {/* Mobile search row */}
      <div className="px-4 pb-3 sm:hidden">
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-fg"
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
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && hits.length > 0) goToHit(hits[0]);
              if (e.key === "Escape") setOpen(false);
            }}
            placeholder="Buscar Reels, ideas, anécdotas"
            aria-label="Buscar en el panel"
            className="h-11 w-full rounded-lg border border-line bg-white pr-3 pl-9 text-[15px] text-ink placeholder:text-muted-fg/70 focus:border-primary focus:outline-none"
          />
          {open && query.trim().length >= 2 ? (
            <div className="absolute right-0 left-0 z-40 mt-2 overflow-hidden rounded-xl border border-line bg-white">
              {hits.length === 0 ? (
                <p className="px-4 py-3 text-sm text-muted-fg">
                  Sin resultados para “{query.trim()}”.
                </p>
              ) : (
                <ul>
                  {hits.map((hit) => (
                    <li key={hit.key}>
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          goToHit(hit);
                        }}
                        className="flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left hover:bg-muted"
                      >
                        <span className="mt-0.5 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-fg">
                          {hit.kind}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-ink">
                            {hit.label}
                          </span>
                          <span className="block text-xs text-muted-fg">
                            {hit.detail}
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
      </div>
    </header>
  );
}

const MOBILE_NAV: { id: ModuleId; label: string; icon: React.ReactNode }[] = [
  {
    id: "resumen",
    label: "Resumen",
    icon: <LayoutDashboard className="h-5 w-5" aria-hidden="true" />,
  },
  {
    id: "metricas",
    label: "Métricas",
    icon: <BarChart3 className="h-5 w-5" aria-hidden="true" />,
  },
  {
    id: "contenido",
    label: "Contenido",
    icon: <ListVideo className="h-5 w-5" aria-hidden="true" />,
  },
  {
    id: "ideas",
    label: "Ideas",
    icon: <Lightbulb className="h-5 w-5" aria-hidden="true" />,
  },
  {
    id: "pendientes",
    label: "Pendientes",
    icon: <CheckSquare className="h-5 w-5" aria-hidden="true" />,
  },
];

export function MobileNav() {
  const { module, setModule, data, view } = usePanel();
  const pending =
    view === "general"
      ? data.evym.tasks.filter((t) => !t.done).length +
        data.antojo.tasks.filter((t) => !t.done).length +
        data.personal.tasks.filter((t) => !t.done).length
      : data[view].tasks.filter((t) => !t.done).length;

  return (
    <nav
      aria-label="Módulos del panel"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white lg:hidden"
    >
      <div className="grid grid-cols-5">
        {MOBILE_NAV.map((item) => {
          const active = module === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setModule(item.id)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-h-14 cursor-pointer flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors duration-150",
                active ? "text-primary" : "text-muted-fg hover:text-ink",
              )}
            >
              {item.icon}
              {item.label}
              {item.id === "pendientes" && pending > 0 ? (
                <span className="absolute top-1.5 right-[calc(50%-20px)] flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
                  {pending}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
