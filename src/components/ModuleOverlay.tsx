"use client";

import { MODULE_TITLES, usePanel, type ModuleId } from "./panel-context";
import { Overview } from "./modules/Overview";
import { Metrics } from "./modules/Metrics";
import { Content } from "./modules/Content";
import { Ideas } from "./modules/Ideas";
import { Giveaway } from "./modules/Giveaway";
import { Tasks } from "./modules/Tasks";
import { Log } from "./modules/Log";
import { Sheet } from "./ui";

/** Un solo overlay a la vez. Abrir otro módulo reemplaza este. */
export function ModuleOverlay() {
  const { overlay, closeModule } = usePanel();

  const renderModule = (id: ModuleId) => {
    switch (id) {
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
        return null;
    }
  };

  return (
    <Sheet
      open={overlay !== null}
      onClose={closeModule}
      title={overlay ? MODULE_TITLES[overlay] : ""}
    >
      {overlay ? renderModule(overlay) : null}
    </Sheet>
  );
}
