"use client";

import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { PanelProvider, usePanel } from "@/components/panel-context";
import { Header, MobileNav } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { Dashboard } from "@/components/Dashboard";
import { Metrics } from "@/components/modules/Metrics";
import { Content } from "@/components/modules/Content";
import { Ideas } from "@/components/modules/Ideas";
import { Giveaway } from "@/components/modules/Giveaway";
import { Tasks } from "@/components/modules/Tasks";
import { Log } from "@/components/modules/Log";
import { Connections } from "@/components/modules/Connections";

function Screen() {
  const { screen, view } = usePanel();

  // Giveaway only exists for EVYM; anywhere else falls back to Hoy.
  const effective = screen === "giveaway" && view !== "evym" ? "hoy" : screen;

  let content: React.ReactNode;
  switch (effective) {
    case "hoy":
      content = <Dashboard />;
      break;
    case "metricas":
      content = <Metrics />;
      break;
    case "contenido":
      content = <Content />;
      break;
    case "ideas":
      content = <Ideas />;
      break;
    case "giveaway":
      content = <Giveaway />;
      break;
    case "pendientes":
      content = <Tasks />;
      break;
    case "bitacora":
      content = <Log />;
      break;
    case "conexiones":
      content = <Connections />;
      break;
    default:
      content = <Dashboard />;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={effective}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
      >
        {content}
      </motion.div>
    </AnimatePresence>
  );
}

function Shell() {
  const { resetAll } = usePanel();

  const reset = () => {
    if (
      window.confirm(
        "¿Restablecer el panel a sus datos iniciales? Se borran los cambios que hayas guardado en este navegador. (La conexión de Meta se conserva; se borra desde Conexiones.)",
      )
    ) {
      resetAll();
    }
  };

  return (
    <div className="shell-in flex min-h-screen bg-page">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <MobileNav />
        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
          <div className="mx-auto w-full max-w-[1280px]">
            <Screen />
          </div>
        </main>
        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-line bg-white px-4 py-2.5 sm:px-6 lg:px-8">
          <p className="text-xs text-muted-fg">
            Panel — tus datos se guardan solo en este navegador
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
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <PanelProvider>
      <MotionConfig reducedMotion="user">
        <Shell />
      </MotionConfig>
    </PanelProvider>
  );
}
