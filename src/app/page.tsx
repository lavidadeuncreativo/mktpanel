"use client";

import { PanelProvider, usePanel } from "@/components/panel-context";
import { Header } from "@/components/Header";
import { CommandCenter } from "@/components/CommandCenter";
import { ModuleOverlay } from "@/components/ModuleOverlay";

function Shell() {
  const { resetAll } = usePanel();

  const reset = () => {
    if (
      window.confirm(
        "¿Restablecer el panel a sus datos iniciales? Se borran los cambios que hayas guardado en este navegador.",
      )
    ) {
      resetAll();
    }
  };

  return (
    <div className="shell-in flex h-dvh flex-col overflow-hidden">
      <Header />
      <main className="min-h-0 flex-1 overflow-y-auto lg:overflow-hidden">
        <CommandCenter />
      </main>
      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-line/70 px-4 py-2.5 sm:px-6">
        <p className="text-xs text-muted-fg">
          Panel EVYM — tus datos se guardan solo en este navegador
          (localStorage). Nada sale de aquí.
        </p>
        <button
          type="button"
          onClick={reset}
          className="cursor-pointer text-xs font-medium text-muted-fg transition-opacity duration-200 ease-apple hover:text-danger hover:opacity-80"
        >
          Restablecer datos iniciales
        </button>
      </footer>
      <ModuleOverlay />
    </div>
  );
}

export default function Home() {
  return (
    <PanelProvider>
      <Shell />
    </PanelProvider>
  );
}
