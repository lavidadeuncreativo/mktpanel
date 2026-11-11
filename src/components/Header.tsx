"use client";

import { usePanel } from "./panel-context";
import type { WorkspaceId } from "@/lib/types";
import { SegmentedControl } from "./ui";

/**
 * El único chrome que queda arriba: la marca y un solo control para
 * cambiar de espacio (EVYM / Antojo / Personal). La fecha vive bajo el
 * título grande "Hoy". Sin buscador, sin avatar, sin navegación: la
 * vista única ya lo dice todo.
 */
const VIEWS: { id: WorkspaceId; label: string }[] = [
  { id: "evym", label: "EVYM" },
  { id: "antojo", label: "Antojo" },
  { id: "personal", label: "Personal" },
];

export function Header() {
  const { view, setView } = usePanel();

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
      </div>
    </header>
  );
}
