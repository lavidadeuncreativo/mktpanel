"use client";

import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { PanelProvider, usePanel } from "@/components/panel-context";
import { TopBar } from "@/components/TopBar";
import { Dashboard } from "@/components/Dashboard";
import { AgentChat } from "@/components/Agent";
import { Metrics } from "@/components/modules/Metrics";
import { Content } from "@/components/modules/Content";
import { Calendar } from "@/components/modules/Calendar";
import { Ideas } from "@/components/modules/Ideas";
import { Giveaway } from "@/components/modules/Giveaway";
import { Tasks } from "@/components/modules/Tasks";
import { Log } from "@/components/modules/Log";
import { Connections } from "@/components/modules/Connections";
import { cn } from "@/components/cn";

function Screen() {
  const { screen, view } = usePanel();

  // Giveaway only exists for EVYM; anywhere else falls back to Hoy.
  const effective = screen === "giveaway" && view !== "evym" ? "hoy" : screen;

  let content: React.ReactNode;
  switch (effective) {
    case "hoy":
      content = <Dashboard />;
      break;
    case "agente":
      content = <AgentChat />;
      break;
    case "metricas":
      content = <Metrics />;
      break;
    case "contenido":
      content = <Content />;
      break;
    case "calendario":
      content = <Calendar />;
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
  const { resetAll, screen, view } = usePanel();

  // Fondo limpio estilo Apple en toda la app: #F5F5F7 con tarjetas
  // blancas y sólidas. Sin degradados en ningún sitio.
  // La vista general es UNA sola pantalla sin scroll: en ella el
  // main y el pie van compactos para que todo quepa en el viewport.
  const onGeneral = screen === "hoy" && view === "general";

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
    <div className="shell-in flex min-h-screen flex-col bg-page">
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main
          className={cn(
            "min-w-0 flex-1 px-4 sm:px-6 lg:px-8",
            onGeneral ? "py-1.5" : "py-5 lg:py-6",
          )}
        >
          <div className="mx-auto w-full max-w-[1280px]">
            <Screen />
          </div>
        </main>
        <footer
          className={cn(
            // En la vista general el pie va compacto (sin el aire
            // inferior de desarrollo) para que la pantalla quepa sin
            // scroll; en el resto, el aire evita que el botón fijo de
            // las herramientas de desarrollo tape el texto.
            "flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-line bg-card px-4 sm:px-6 lg:px-8",
            onGeneral ? "pt-1.5 pb-2.5" : "pt-2.5 pb-16",
          )}
        >
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
