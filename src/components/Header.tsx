"use client";

import { useSyncExternalStore } from "react";
import { usePanel } from "./panel-context";
import type { WorkspaceId } from "@/lib/types";
import { formatDateLong, todayIso } from "@/lib/store";
import { SegmentedControl } from "./ui";

/**
 * El único chrome que queda arriba: la marca, un solo control para
 * cambiar de espacio (EVYM / Antojo / Personal) y la fecha. Sin
 * buscador, sin avatar, sin navegación: la vista única ya lo dice todo.
 */
const VIEWS: { id: WorkspaceId; label: string }[] = [
  { id: "evym", label: "EVYM" },
  { id: "antojo", label: "Antojo" },
  { id: "personal", label: "Personal" },
];

export function Header() {
  const { view, setView } = usePanel();
  // Current date via an external store: null during prerender, today's
  // date on the client. Reading the clock during render would tie the
  // static page to the build time.
  const today = useSyncExternalStore(
    () => () => {},
    () => (typeof window === "undefined" ? null : todayIso()),
    () => null,
  );

  // "General" ya no se ofrece en la interfaz; si por algún estado
  // heredado llegara, se cae a EVYM.
  const activeView: WorkspaceId =
    view === "general" ? "evym" : view;

  return (
    <header className="shrink-0 border-b border-line/70 bg-[#fbfbfd]/70 backdrop-blur-xl">
      <div className="flex min-h-14 items-center gap-3 px-4 sm:px-6">
        <p className="text-[17px] font-semibold tracking-[-0.01em] whitespace-nowrap text-ink">
          Panel EVYM
        </p>

        <div className="flex-1" />

        <SegmentedControl
          options={VIEWS}
          value={activeView}
          onChange={(v) => setView(v)}
          ariaLabel="Espacio de trabajo"
        />

        {today ? (
          <span className="hidden rounded-full bg-control px-3 py-1.5 text-xs font-medium whitespace-nowrap text-muted-fg md:inline-flex">
            {formatDateLong(today)}
          </span>
        ) : null}
      </div>
    </header>
  );
}
