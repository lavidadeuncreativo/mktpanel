"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Link2,
  RefreshCw,
  Share2,
  Unplug,
} from "lucide-react";
import { usePanel } from "../panel-context";
import type { MetricSnapshot, WorkspaceId } from "@/lib/types";
import { WORKSPACES } from "@/lib/types";
import { todayIso, uid } from "@/lib/store";
import {
  clearMetaConnection,
  loadMetaState,
  loadMetaToken,
  saveMetaState,
  saveMetaToken,
  syncMetaPage,
  testMetaConnection,
  MetaApiError,
  type MetaConnectionState,
  type MetaPage,
} from "@/lib/meta";
import {
  Button,
  Field,
  Input,
  Pill,
  SectionHeading,
  Select,
} from "../ui";
import { cn } from "../cn";

/**
 * Conexiones: sincronización real con Meta (Facebook + Instagram).
 *
 * El token lo pega el usuario y se guarda SOLO en localStorage de su
 * navegador. "Probar conexión" lista las Páginas que administra el
 * token y la cuenta de Instagram vinculada. "Sincronizar ahora" trae
 * las métricas de los últimos 28 días y las guarda como capturas del
 * store existente (una por red, con la fecha de hoy; si ya existe una
 * captura de Meta para esa red y ese día, se reemplaza, no se duplica).
 *
 * Lo que la API no devuelve (reacciones, comentarios y compartidos a
 * nivel de página) se guarda como "Sin datos", nunca como 0.
 */

function upsertMetaSnapshots(
  existing: MetricSnapshot[],
  incoming: MetricSnapshot[],
): MetricSnapshot[] {
  const next = [...existing];
  for (const snap of incoming) {
    const key = `${snap.network}|${snap.date}|meta`;
    const idx = next.findIndex(
      (s) => `${s.network}|${s.date}|${s.source ?? "manual"}` === key,
    );
    if (idx >= 0) next[idx] = snap;
    else next.push(snap);
  }
  return next;
}

function formatSyncTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function Connections() {
  const { update } = usePanel();
  // Estado inicial perezoso: lee localStorage solo en el cliente. La
  // vista solo se renderiza tras la hidratación (no es la pantalla
  // inicial), así que no hay riesgo de desajuste con el prerender.
  const [token, setToken] = useState(() => loadMetaToken() ?? "");
  const [tokenSaved, setTokenSaved] = useState(
    () => loadMetaToken() !== null,
  );
  const [conn, setConn] = useState<MetaConnectionState | null>(() =>
    loadMetaState(),
  );
  const [pages, setPages] = useState<MetaPage[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(
    () => loadMetaState()?.pageId ?? null,
  );
  // El panel es multi-marca: cada Página sincronizada guarda sus
  // capturas en el espacio que le corresponde (EVYM, Antojo o personal).
  const [targetWs, setTargetWs] = useState<WorkspaceId>("evym");
  const [testing, setTesting] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncReport, setSyncReport] = useState<{
    notes: string[];
    failures: string[];
  } | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const selectedPage =
    pages.find((p) => p.id === selectedPageId) ??
    (conn
      ? {
          id: conn.pageId,
          name: conn.pageName,
          pageAccessToken: "",
          igId: conn.igId,
          igUsername: conn.igUsername,
        }
      : null);

  const saveToken = () => {
    const t = token.trim();
    if (!t) {
      setTestError("Pega primero el token de acceso.");
      return;
    }
    saveMetaToken(t);
    setTokenSaved(true);
    setTestError(null);
  };

  const testConnection = async () => {
    const t = token.trim();
    if (!t) {
      setTestError("Pega primero el token de acceso.");
      return;
    }
    saveMetaToken(t);
    setTokenSaved(true);
    setTesting(true);
    setTestError(null);
    setSyncReport(null);
    try {
      const found = await testMetaConnection(t);
      setPages(found);
      if (found.length === 0) {
        setTestError(
          "El token es válido, pero este usuario no administra ninguna Página de Facebook. Revisa que el token se generó con tu cuenta de administrador de la Página.",
        );
      } else if (found.length === 1) {
        setSelectedPageId(found[0].id);
      } else if (conn && found.some((p) => p.id === conn.pageId)) {
        setSelectedPageId(conn.pageId);
      }
    } catch (e) {
      setTestError(
        e instanceof MetaApiError
          ? e.message
          : "No se pudo probar la conexión. Inténtalo de nuevo.",
      );
    } finally {
      setTesting(false);
    }
  };

  const choosePage = (page: MetaPage) => {
    setSelectedPageId(page.id);
    const next: MetaConnectionState = {
      pageId: page.id,
      pageName: page.name,
      igId: page.igId,
      igUsername: page.igUsername,
      lastSyncAt: conn?.lastSyncAt ?? null,
      lastSyncError: conn?.lastSyncError ?? null,
    };
    setConn(next);
    saveMetaState(next);
  };

  const syncNow = async () => {
    if (!selectedPage) {
      setSyncError("Primero prueba la conexión y elige una Página.");
      return;
    }
    // El token de la Página viene de la prueba; si la conexión ya estaba
    // guardada de antes, hay que probar de nuevo para obtenerlo.
    const pageWithToken =
      pages.find((p) => p.id === selectedPage.id) ?? null;
    if (!pageWithToken) {
      setSyncError(
        "Falta el token de la Página. Pulsa “Probar conexión” para obtenerlo y luego sincroniza.",
      );
      return;
    }
    setSyncing(true);
    setSyncError(null);
    setSyncReport(null);
    try {
      const result = await syncMetaPage(pageWithToken, todayIso());
      const date = todayIso();
      update((d) => {
        const ws = d[targetWs];
        const snapshots = upsertMetaSnapshots(ws.snapshots, result.snapshots);
        const logLines = [
          ...result.notes.map(
            (n) => `Sincronizado con Meta: ${n}`,
          ),
          ...result.failures.map((f) => `Sincronización con Meta: ${f}`),
        ];
        return {
          ...d,
          [targetWs]: {
            ...ws,
            snapshots,
            log: [
              ...ws.log,
              {
                id: uid(),
                date,
                text:
                  result.snapshots.length > 0
                    ? logLines.join(" ")
                    : `Sincronización con Meta sin capturas nuevas. ${result.failures.join(" ")}`,
                source: "Meta / Sincronización",
              },
            ],
          },
        };
      });
      const next: MetaConnectionState = {
        pageId: pageWithToken.id,
        pageName: pageWithToken.name,
        igId: pageWithToken.igId,
        igUsername: pageWithToken.igUsername,
        lastSyncAt: new Date().toISOString(),
        lastSyncError:
          result.failures.length > 0 ? result.failures.join(" ") : null,
      };
      setConn(next);
      saveMetaState(next);
      setSyncReport({ notes: result.notes, failures: result.failures });
    } catch (e) {
      const msg =
        e instanceof MetaApiError
          ? e.message
          : "No se pudo sincronizar. Inténtalo de nuevo.";
      setSyncError(msg);
      if (conn) {
        const next: MetaConnectionState = { ...conn, lastSyncError: msg };
        setConn(next);
        saveMetaState(next);
      }
    } finally {
      setSyncing(false);
    }
  };

  const disconnect = () => {
    if (
      !window.confirm(
        "¿Desconectar Meta? Se borran el token y la Página guardada de este navegador. Las capturas ya sincronizadas se quedan.",
      )
    ) {
      return;
    }
    clearMetaConnection();
    setToken("");
    setTokenSaved(false);
    setConn(null);
    setPages([]);
    setSelectedPageId(null);
    setSyncReport(null);
    setSyncError(null);
    setTestError(null);
  };

  return (
    <div className="space-y-4">
      <SectionHeading
        title="Conexiones"
        description="Sincroniza las métricas reales de Facebook e Instagram con Meta. El token se guarda solo en este navegador; nunca sale de aquí."
      />

      {/* Meta */}
      <div className="surface p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-[#1877f2] text-white">
              <Share2 className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-base font-semibold tracking-[-0.01em] text-ink">
                Meta · Facebook + Instagram
              </h2>
              <p className="text-sm text-muted-fg">
                {conn
                  ? `${conn.pageName}${conn.igUsername ? ` · @${conn.igUsername}` : " · sin Instagram vinculada"}`
                  : "Sin conectar"}
              </p>
            </div>
          </div>
          {conn ? (
            <Pill tone="green">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              Conectado
            </Pill>
          ) : (
            <Pill tone="neutral">Sin conectar</Pill>
          )}
        </div>

        {conn ? (
          <div className="mt-4 space-y-1 text-sm">
            <p className="text-muted-fg">
              Última sincronización:{" "}
              <span className="font-medium text-ink">
                {conn.lastSyncAt
                  ? formatSyncTime(conn.lastSyncAt)
                  : "nunca"}
              </span>
            </p>
            <p className="text-muted-fg">
              Las capturas se guardan en el espacio que elijas al
              sincronizar, con la fecha de hoy y el periodo “Últimos 28
              días (Meta)”.
            </p>
            {conn.lastSyncError ? (
              <p className="flex items-start gap-1.5 text-danger-text">
                <AlertTriangle
                  className="mt-0.5 h-4 w-4 shrink-0"
                  aria-hidden="true"
                />
                Último error: {conn.lastSyncError}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="mt-5 space-y-4">
          <Field
            label="Token de acceso de larga duración"
            hint={
              tokenSaved
                ? "Token guardado en este navegador. Si caduca, genera uno nuevo y pégalo aquí."
                : "Se guarda solo en este navegador. Nunca se sube al repo ni sale de aquí."
            }
          >
            <div className="flex gap-2">
              <Input
                type="password"
                value={token}
                onChange={(e) => {
                  setToken(e.target.value);
                  setTokenSaved(false);
                }}
                placeholder="EAABwzLixnjYB…"
                autoComplete="off"
                spellCheck={false}
              />
              <Button
                type="button"
                variant="outline"
                onClick={saveToken}
                className="shrink-0"
              >
                Guardar token
              </Button>
            </div>
          </Field>

          <div className="flex flex-wrap gap-2">
            <Button onClick={testConnection} disabled={testing}>
              <Link2 className="h-4 w-4" aria-hidden="true" />
              {testing ? "Probando…" : "Probar conexión"}
            </Button>
            <Button
              variant="outline"
              onClick={syncNow}
              disabled={syncing || !selectedPage}
            >
              <RefreshCw
                className={cn("h-4 w-4", syncing && "animate-spin")}
                aria-hidden="true"
              />
              {syncing ? "Sincronizando…" : "Sincronizar ahora"}
            </Button>
            {conn ? (
              <Button variant="ghost" onClick={disconnect}>
                <Unplug className="h-4 w-4" aria-hidden="true" />
                Desconectar
              </Button>
            ) : null}
          </div>

          {selectedPage ? (
            <Field
              label="Guardar las capturas en"
              hint="El panel es multi-marca: cada Página va a su espacio. La Página de EVYM va en EVYM; si sincronizas la de Antojo, cámbialo aquí."
            >
              <Select
                value={targetWs}
                onChange={(e) =>
                  setTargetWs(e.target.value as WorkspaceId)
                }
              >
                {WORKSPACES.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}

          {testError ? (
            <p className="flex items-start gap-1.5 text-sm text-danger-text">
              <AlertTriangle
                className="mt-0.5 h-4 w-4 shrink-0"
                aria-hidden="true"
              />
              {testError}
            </p>
          ) : null}

          {pages.length > 0 ? (
            <div>
              <p className="mb-2 text-sm font-medium text-ink">
                Páginas que administra este token:
              </p>
              <ul className="space-y-2">
                {pages.map((p) => {
                  const active = p.id === selectedPageId;
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => choosePage(p)}
                        aria-pressed={active}
                        className={cn(
                          "flex w-full cursor-pointer items-center gap-3 rounded-[12px] border px-4 py-3 text-left transition-colors",
                          active
                            ? "border-primary bg-primary-soft"
                            : "border-line bg-white hover:bg-black/[0.02]",
                        )}
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1877f2] text-sm font-bold text-white">
                          {p.name.charAt(0).toUpperCase()}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-ink">
                            {p.name}
                          </span>
                          <span className="block truncate text-xs text-muted-fg">
                            {p.igId ? (
                              <>
                                <Camera
                                  className="mr-1 inline h-3.5 w-3.5"
                                  aria-hidden="true"
                                />
                                @{p.igUsername ?? "Instagram vinculada"}
                              </>
                            ) : (
                              "Sin cuenta de Instagram vinculada"
                            )}
                          </span>
                        </span>
                        {active ? (
                          <Pill tone="blue">Seleccionada</Pill>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          {syncReport ? (
            <div
              className={cn(
                "rounded-[12px] border p-4 text-sm",
                syncReport.failures.length > 0
                  ? "border-amber/40 bg-amber-soft"
                  : "border-line bg-[#f5f5f7]",
              )}
            >
              <p className="font-semibold text-ink">
                Sincronización terminada
              </p>
              <ul className="mt-2 space-y-1 text-muted-fg">
                {syncReport.notes.map((n) => (
                  <li key={n} className="flex items-start gap-1.5">
                    <CheckCircle2
                      className="mt-0.5 h-4 w-4 shrink-0 text-accent"
                      aria-hidden="true"
                    />
                    {n}
                  </li>
                ))}
                {syncReport.failures.map((f) => (
                  <li key={f} className="flex items-start gap-1.5">
                    <AlertTriangle
                      className="mt-0.5 h-4 w-4 shrink-0 text-amber-text"
                      aria-hidden="true"
                    />
                    {f}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted-fg">
                Las capturas nuevas están en Métricas del espacio{" "}
                {WORKSPACES.find((w) => w.id === targetWs)?.name ?? targetWs}
                , con la fecha de hoy. Las reacciones, comentarios y
                compartidos de Facebook se guardan como “Sin datos”: Meta
                no los desglosa a nivel de página.
              </p>
            </div>
          ) : null}

          {syncError ? (
            <p className="flex items-start gap-1.5 text-sm text-danger-text">
              <AlertTriangle
                className="mt-0.5 h-4 w-4 shrink-0"
                aria-hidden="true"
              />
              {syncError}
            </p>
          ) : null}
        </div>
      </div>

      {/* Cómo conseguir el token */}
      <div className="surface p-5 sm:p-6">
        <h2 className="text-base font-semibold tracking-[-0.01em] text-ink">
          Cómo conseguir el token
        </h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted-fg marker:text-ink">
          <li>
            Entra a{" "}
            <span className="font-medium text-ink">
              developers.facebook.com
            </span>{" "}
            con tu cuenta de Facebook (la que administra la Página) y crea
            una app (tipo “Negocios” u “Otro”).
          </li>
          <li>
            En la app, abre{" "}
            <span className="font-medium text-ink">
              Herramientas → Explorador de la API Graph
            </span>
            , elige tu app y pulsa “Generar token de acceso”.
          </li>
          <li>
            Agrega estos permisos:{" "}
            <span className="font-medium text-ink">
              pages_show_list, pages_read_engagement, instagram_basic,
              instagram_manage_insights
            </span>
            . Como eres el dueño de la app, funcionan sin revisión de Meta.
          </li>
          <li>
            En el mismo Explorador, abre el token en el “Depurador de tokens”
            y pulsa “Ampliar token de acceso”: así dura unos 60 días en
            lugar de una hora.
          </li>
          <li>
            Copia el token ampliado y pégalo arriba. Pulsa “Probar
            conexión”: deberías ver tu Página “Entre vivos y muertos” y la
            cuenta @entrevivosymuertos666.
          </li>
        </ol>
        <p className="mt-3 text-sm text-muted-fg">
          El token de larga duración caduca: cuando la sincronización falle
          con “token inválido o caducó”, repite los pasos 2–5 y pega el
          nuevo. El token de la Página que usa el panel no caduca mientras
          el token de usuario siga vigente.
        </p>
      </div>

      {/* Próximamente: TikTok y YouTube */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="surface p-5">
          <h2 className="text-base font-semibold tracking-[-0.01em] text-ink">
            TikTok
          </h2>
          <p className="mt-1 text-sm text-muted-fg">
            Próximamente: necesita su propia app de desarrollador y la API
            de TikTok para Empresas. Por ahora, registra sus métricas a mano
            en Métricas.
          </p>
        </div>
        <div className="surface p-5">
          <h2 className="text-base font-semibold tracking-[-0.01em] text-ink">
            YouTube
          </h2>
          <p className="mt-1 text-sm text-muted-fg">
            Próximamente: necesita un proyecto en Google Cloud y la API de
            datos de YouTube. Por ahora, registra sus métricas a mano en
            Métricas.
          </p>
        </div>
      </div>

      <p className="text-xs text-muted-fg">
        El token y la Página guardada viven solo en este navegador
        (localStorage). Al restablecer los datos iniciales del panel, la
        conexión se conserva: usa “Desconectar” si quieres borrarla.
      </p>
    </div>
  );
}
