"use client";

import { PanelProvider, usePanel } from "@/components/panel-context";
import { Sidebar } from "@/components/Sidebar";
import { Header, MobileNav } from "@/components/Header";
import { Overview } from "@/components/modules/Overview";
import { Metrics } from "@/components/modules/Metrics";
import { Content } from "@/components/modules/Content";
import { Ideas } from "@/components/modules/Ideas";
import { Giveaway } from "@/components/modules/Giveaway";
import { Tasks } from "@/components/modules/Tasks";
import { Log } from "@/components/modules/Log";

function ActiveModule() {
  const { module } = usePanel();
  switch (module) {
    case "resumen":
      return <Overview />;
    case "metricas":
      return <Metrics />;
    case "contenido":
      return <Content />;
    case "ideas":
      return <Ideas />;
    case "giveaway":
      return <Giveaway />;
    case "pendientes":
      return <Tasks />;
    case "bitacora":
      return <Log />;
    default:
      return <Overview />;
  }
}

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
    <div className="shell-in min-h-screen">
      <Sidebar />
      <div className="lg:pl-[250px]">
        <Header />
        <main className="mx-auto w-full max-w-[1280px] px-4 pt-5 pb-24 sm:px-6 lg:pb-10">
          <ActiveModule />
          <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
            <p className="text-xs text-muted-fg">
              Panel EVYM — tus datos se guardan solo en este navegador
              (localStorage). Nada sale de aquí.
            </p>
            <button
              type="button"
              onClick={reset}
              className="cursor-pointer text-xs font-medium text-muted-fg underline-offset-2 transition-colors duration-150 hover:text-danger hover:underline"
            >
              Restablecer datos iniciales
            </button>
          </footer>
        </main>
      </div>
      <MobileNav />
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
