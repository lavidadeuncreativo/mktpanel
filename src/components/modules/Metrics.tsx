"use client";

import { useState } from "react";
import { ArrowDownRight, ArrowUpRight, Plus, Trash2, Upload } from "lucide-react";
import { usePanel } from "../panel-context";
import type { MetricSnapshot, Network } from "@/lib/types";
import { NETWORK_LABELS } from "@/lib/types";
import {
  latestByNetwork,
  previousByNetwork,
} from "@/lib/derive";
import { formatDateShort, formatDeltaPct, formatNumber, todayIso, uid } from "@/lib/store";
import { ViewsBars, FollowersArea } from "../charts";
import { CsvImport } from "../CsvImport";
import { AnimatedNumber, Button, Dialog, EmptyState, Field, Input, Pill, SectionHeading, Select, Stagger, StaggerItem } from "../ui";

const NETWORKS: Network[] = ["facebook", "instagram", "tiktok", "youtube", "threads"];

function SnapshotForm({
  onClose,
  workspaceId,
}: {
  onClose: () => void;
  workspaceId: "evym" | "antojo" | "personal";
}) {
  const { update } = usePanel();
  const [network, setNetwork] = useState<Network>("instagram");
  const [date, setDate] = useState(todayIso());
  const [period, setPeriod] = useState("Últimos 30 días");
  const [followers, setFollowers] = useState("");
  const [views, setViews] = useState("");
  const [reactions, setReactions] = useState("");
  const [comments, setComments] = useState("");
  const [shares, setShares] = useState("");
  const [interactions, setInteractions] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const snap: MetricSnapshot = {
      id: uid(),
      network,
      date,
      period: period.trim() || "Últimos 30 días",
      followers: Number(followers) || 0,
      views: Number(views) || 0,
      reactions: Number(reactions) || 0,
      comments: Number(comments) || 0,
      shares: Number(shares) || 0,
      interactions: interactions.trim() === "" ? null : Number(interactions),
      source: "manual",
    };
    update((d) => {
      const ws = d[workspaceId];
      return {
        ...d,
        [workspaceId]: {
          ...ws,
          snapshots: [...ws.snapshots, snap],
          log: [
            ...ws.log,
            {
              id: uid(),
              date,
              text: `Captura de ${NETWORK_LABELS[network]}: ${formatNumber(snap.followers)} seguidores, ${formatNumber(snap.views)} vistas, ${formatNumber(snap.reactions ?? 0)} reacciones, ${formatNumber(snap.comments ?? 0)} comentarios, ${formatNumber(snap.shares ?? 0)} compartidos.`,
              source: `${NETWORK_LABELS[network]} / Business Suite`,
            },
          ],
        },
      };
    });
    onClose();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Red">
          <Select
            value={network}
            onChange={(e) => setNetwork(e.target.value as Network)}
          >
            {NETWORKS.map((n) => (
              <option key={n} value={n}>
                {NETWORK_LABELS[n]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Fecha de la captura">
          <Input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
      </div>
      <Field label="Periodo que cubre" hint="Por ejemplo: Últimos 30 días.">
        <Input
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          placeholder="Últimos 30 días"
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Seguidores">
          <Input
            type="number"
            min={0}
            inputMode="numeric"
            required
            value={followers}
            onChange={(e) => setFollowers(e.target.value)}
            placeholder="0"
          />
        </Field>
        <Field label="Vistas">
          <Input
            type="number"
            min={0}
            inputMode="numeric"
            required
            value={views}
            onChange={(e) => setViews(e.target.value)}
            placeholder="0"
          />
        </Field>
        <Field label="Reacciones">
          <Input
            type="number"
            min={0}
            inputMode="numeric"
            value={reactions}
            onChange={(e) => setReactions(e.target.value)}
            placeholder="0"
          />
        </Field>
        <Field label="Comentarios">
          <Input
            type="number"
            min={0}
            inputMode="numeric"
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="0"
          />
        </Field>
        <Field label="Compartidos">
          <Input
            type="number"
            min={0}
            inputMode="numeric"
            value={shares}
            onChange={(e) => setShares(e.target.value)}
            placeholder="0"
          />
        </Field>
        <Field
          label="Interacciones totales (opcional)"
          hint="Solo si la red reporta un total aparte."
        >
          <Input
            type="number"
            min={0}
            inputMode="numeric"
            value={interactions}
            onChange={(e) => setInteractions(e.target.value)}
            placeholder="Vacío si no aplica"
          />
        </Field>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit">Guardar captura</Button>
      </div>
    </form>
  );
}

export function Metrics() {
  const { data, view, update } = usePanel();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  if (view === "general") {
    const totals = ["evym", "antojo", "personal"] as const;
    return (
      <div className="space-y-4">
        <SectionHeading
          title="Métricas"
          description="Resumen por espacio. Entra a un espacio para registrar capturas."
        />
        <Stagger>
          <div className="grid gap-4 md:grid-cols-3">
            {totals.map((id) => {
              const ws = data[id];
              const latest = latestByNetwork(ws.snapshots);
              const followers = Object.values(latest).reduce(
                (s, snap) => s + (snap?.followers ?? 0),
                0,
              );
              const views = Object.values(latest).reduce(
                (s, snap) => s + (snap?.views ?? 0),
                0,
              );
              const name =
                id === "evym"
                  ? "Entre Vivos y Muertos"
                  : id === "antojo"
                    ? "Antojo"
                    : "Perfil personal";
              return (
                <StaggerItem
                  key={id}
                  className="surface surface-hover p-5"
                >
                  <h3 className="text-base font-semibold tracking-[-0.01em] text-ink">
                    {name}
                  </h3>
                  <p className="mt-3 text-[28px] leading-none font-semibold tracking-[-0.02em] text-ink">
                    <AnimatedNumber value={views} format={formatNumber} />
                  </p>
                  <p className="mt-1 text-sm text-muted-fg">vistas en total</p>
                  <p className="mt-2 text-sm text-muted-fg">
                    <AnimatedNumber value={followers} format={formatNumber} />{" "}
                    seguidores
                  </p>
                </StaggerItem>
              );
            })}
          </div>
        </Stagger>
        <p className="text-sm text-muted-fg">
          Usa el selector de arriba para entrar a un espacio y registrar sus
          capturas.
        </p>
      </div>
    );
  }

  const ws = data[view];
  const latest = latestByNetwork(ws.snapshots);
  const previous = previousByNetwork(ws.snapshots);
  const sorted = [...ws.snapshots].sort((a, b) => b.date.localeCompare(a.date));

  const removeSnapshot = (id: string) => {
    if (!window.confirm("¿Borrar esta captura?")) return;
    update((d) => ({
      ...d,
      [view]: { ...d[view], snapshots: d[view].snapshots.filter((s) => s.id !== id) },
    }));
  };

  return (
    <div className="space-y-4">
      <SectionHeading
        title="Métricas"
        description="Capturas registradas a mano desde Business Suite, o importadas desde un CSV. La curva y los deltas aparecen con la segunda captura por red."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4" aria-hidden="true" />
              Importar CSV
            </Button>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Registrar captura
            </Button>
          </div>
        }
      />

      {/* KPI per network */}
      {Object.keys(latest).length === 0 ? (
        <EmptyState
          title="Sin capturas todavía"
          description="Registra tu primera captura de Business Suite: red, fecha, seguidores, vistas, reacciones, comentarios y compartidos. Con la segunda captura aparecen los deltas y la curva."
          action={
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Registrar primera captura
            </Button>
          }
        />
      ) : (
        <Stagger>
          <div className="grid gap-4 md:grid-cols-2">
            {(Object.keys(latest) as Network[]).map((net) => {
              const s = latest[net];
              const p = previous[net];
              if (!s) return null;
              const fDelta = p ? formatDeltaPct(s.followers, p.followers) : null;
              const vDelta = p ? formatDeltaPct(s.views, p.views) : null;
              return (
                <StaggerItem key={net} className="surface surface-hover p-5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-base font-semibold tracking-[-0.01em] text-ink">
                      {NETWORK_LABELS[net]}
                    </h3>
                    <span className="text-xs text-muted-fg">
                      {formatDateShort(s.date)}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
                    <div>
                      <p className="text-2xl leading-none font-semibold tracking-[-0.02em] text-ink">
                        <AnimatedNumber value={s.followers} format={formatNumber} />
                      </p>
                      <p className="mt-1 flex items-center gap-2 text-sm text-muted-fg">
                        Seguidores
                        {fDelta ? (
                          <Pill tone={s.followers >= (p?.followers ?? 0) ? "green" : "red"}>
                            {s.followers >= (p?.followers ?? 0) ? (
                              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                            ) : (
                              <ArrowDownRight className="h-3.5 w-3.5" aria-hidden="true" />
                            )}
                            {fDelta}
                          </Pill>
                        ) : (
                          <Pill tone="neutral">Línea base</Pill>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-2xl leading-none font-semibold tracking-[-0.02em] text-ink">
                        <AnimatedNumber value={s.views} format={formatNumber} />
                      </p>
                      <p className="mt-1 flex items-center gap-2 text-sm text-muted-fg">
                        Vistas
                        {vDelta ? (
                          <Pill tone={s.views >= (p?.views ?? 0) ? "green" : "red"}>
                            {s.views >= (p?.views ?? 0) ? (
                              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                            ) : (
                              <ArrowDownRight className="h-3.5 w-3.5" aria-hidden="true" />
                            )}
                            {vDelta}
                          </Pill>
                        ) : (
                          <Pill tone="neutral">Línea base</Pill>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-ink">
                        {s.reactions !== null
                          ? <AnimatedNumber value={s.reactions} format={formatNumber} />
                          : "Sin datos"}
                      </p>
                      <p className="text-sm text-muted-fg">Reacciones</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-ink">
                        {s.comments !== null
                          ? <AnimatedNumber value={s.comments} format={formatNumber} />
                          : "Sin datos"}
                      </p>
                      <p className="text-sm text-muted-fg">Comentarios</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-ink">
                        {s.shares !== null
                          ? <AnimatedNumber value={s.shares} format={formatNumber} />
                          : "Sin datos"}
                      </p>
                      <p className="text-sm text-muted-fg">Compartidos</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-ink">
                        {s.interactions !== null
                          ? <AnimatedNumber value={s.interactions} format={formatNumber} />
                          : "Sin datos"}
                      </p>
                      <p className="text-sm text-muted-fg">Interacciones</p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-muted-fg">{s.period}</p>
                </StaggerItem>
              );
            })}
          </div>
        </Stagger>
      )}

      {/* Views per capture */}
      {sorted.length > 0 ? (
        <div className="surface p-5">
          <h2 className="text-base font-semibold tracking-[-0.01em] text-ink">
            Vistas por captura
          </h2>
          <p className="mt-0.5 text-sm text-muted-fg">
            Cada barra es una captura registrada.
          </p>
          <ViewsBars snapshots={ws.snapshots} />
        </div>
      ) : null}

      {/* Followers over time */}
      {sorted.length > 0 ? (
        <div className="surface p-5">
          <h2 className="text-base font-semibold tracking-[-0.01em] text-ink">
            Seguidores en el tiempo
          </h2>
          <p className="mt-0.5 text-sm text-muted-fg">
            Evolución según tus capturas registradas. Con una sola captura
            por red la curva es un punto: la tendencia aparece con la
            segunda.
          </p>
          <FollowersArea snapshots={ws.snapshots} />
        </div>
      ) : null}

      {/* Snapshot history */}
      {sorted.length > 0 ? (
        <div className="surface p-5">
          <h2 className="text-base font-semibold tracking-[-0.01em] text-ink">
            Historial de capturas
          </h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-muted-fg">
                  <th scope="col" className="py-2 pr-3 font-medium">Red</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Fecha</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Origen</th>
                  <th scope="col" className="py-2 pr-3 text-right font-medium">Seguidores</th>
                  <th scope="col" className="py-2 pr-3 text-right font-medium">Vistas</th>
                  <th scope="col" className="py-2 pr-3 text-right font-medium">Reacciones</th>
                  <th scope="col" className="py-2 pr-3 text-right font-medium">Comentarios</th>
                  <th scope="col" className="py-2 pr-3 text-right font-medium">Compartidos</th>
                  <th scope="col" className="py-2 text-right font-medium">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((s) => (
                  <tr key={s.id} className="border-b border-line last:border-0">
                    <td className="py-3 pr-3 font-medium text-ink">
                      {NETWORK_LABELS[s.network]}
                    </td>
                    <td className="py-3 pr-3 text-muted-fg">
                      {formatDateShort(s.date)}
                    </td>
                    <td className="py-3 pr-3">
                      <Pill
                        tone={
                          s.source === "meta"
                            ? "blue"
                            : s.source === "csv"
                              ? "violet"
                              : "neutral"
                        }
                      >
                        {s.source === "meta"
                          ? "Meta"
                          : s.source === "csv"
                            ? "CSV"
                            : "Manual"}
                      </Pill>
                    </td>
                    <td className="py-3 pr-3 text-right text-ink">
                      {formatNumber(s.followers)}
                    </td>
                    <td className="py-3 pr-3 text-right text-ink">
                      {formatNumber(s.views)}
                    </td>
                    <td className="py-3 pr-3 text-right text-ink">
                      {s.reactions !== null
                        ? formatNumber(s.reactions)
                        : "Sin datos"}
                    </td>
                    <td className="py-3 pr-3 text-right text-ink">
                      {s.comments !== null
                        ? formatNumber(s.comments)
                        : "Sin datos"}
                    </td>
                    <td className="py-3 pr-3 text-right text-ink">
                      {s.shares !== null
                        ? formatNumber(s.shares)
                        : "Sin datos"}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        onClick={() => removeSnapshot(s.id)}
                        aria-label={`Borrar captura de ${NETWORK_LABELS[s.network]} del ${formatDateShort(s.date)}`}
                        className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-muted-fg transition-colors duration-200 ease-apple hover:bg-danger-soft hover:text-danger"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Registrar captura"
      >
        <SnapshotForm
          onClose={() => setDialogOpen(false)}
          workspaceId={view}
        />
      </Dialog>

      <Dialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Importar CSV de Business Suite"
      >
        <CsvImport
          workspaceId={view}
          onClose={() => setImportOpen(false)}
        />
      </Dialog>
    </div>
  );
}
