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
  const { resetAll, screen } = usePanel();

  // En Hoy, el degradado animado es el fondo de toda la página (como
  // en la referencia: las tarjetas blancas flotan sobre él). En las
  // demás pantallas la página sigue siendo el papel claro.
  const onGradient = screen === "hoy";

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
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col",
          onGradient && "hero-animated",
        )}
      >
        <TopBar />
        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
          <div className="mx-auto w-full max-w-[1280px]">
            <Screen />
          </div>
        </main>
        <footer
          className={cn(
            // Aire abajo para que el botón fijo de las herramientas de
            // desarrollo (esquina inferior izquierda) nunca tape el texto.
            "flex shrink-0 flex-wrap items-center justify-between gap-3 border-t px-4 pt-2.5 pb-16 sm:px-6 lg:px-8",
            onGradient
              ? "border-white/20 bg-transparent"
              : "border-line bg-card",
          )}
        >
          <p
            className={cn(
              "text-xs",
              onGradient ? "text-white/75" : "text-muted-fg",
            )}
          >
            Panel — tus datos se guardan solo en este navegador
            (localStorage). Nada sale de aquí.
          </p>
          <button
            type="button"
            onClick={reset}
            className={cn(
              "cursor-pointer text-xs font-medium transition-opacity duration-200 ease-apple hover:opacity-80",
              onGradient
                ? "text-white/85 hover:text-white"
                : "text-muted-fg hover:text-danger",
            )}
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
