"use client";

import { AgentChat } from "./Agent";

/* ------------------------------------------------------------------ */
/* Hoy es el agente del panel (estilo Muse, chat-first):               */
/* la conversación es la pantalla principal; los módulos siguen        */
/* existiendo como destinos en la barra lateral y el agente los abre.  */
/* ------------------------------------------------------------------ */

export function Dashboard() {
  return <AgentChat />;
}
