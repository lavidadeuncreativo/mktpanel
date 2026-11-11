"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { usePanel } from "../panel-context";
import { formatDateShort, todayIso, uid } from "@/lib/store";
import {
  Button,
  Dialog,
  EmptyState,
  Field,
  Input,
  SectionHeading,
  Textarea,
} from "../ui";

function NoteForm({
  workspaceId,
  onClose,
}: {
  workspaceId: "evym" | "antojo" | "personal";
  onClose: () => void;
}) {
  const { update } = usePanel();
  const [text, setText] = useState("");
  const [source, setSource] = useState("Business Suite");
  const [date, setDate] = useState(todayIso());

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    update((d) => ({
      ...d,
      [workspaceId]: {
        ...d[workspaceId],
        log: [
          ...d[workspaceId].log,
          {
            id: uid(),
            date,
            text: text.trim(),
            source: source.trim() || "Nota manual",
          },
        ],
      },
    }));
    onClose();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Nota">
        <Textarea
          required
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Qué pasó, qué se registró, qué cambió…"
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Fuente">
          <Input
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="Business Suite"
          />
        </Field>
        <Field label="Fecha">
          <Input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit">Guardar en bitácora</Button>
      </div>
    </form>
  );
}

export function Log() {
  const { data, view, update } = usePanel();
  const [dialogOpen, setDialogOpen] = useState(false);

  if (view === "general") {
    const all = [
      ...data.evym.log.map((l) => ({ ...l, ws: "EVYM" })),
      ...data.antojo.log.map((l) => ({ ...l, ws: "Antojo" })),
      ...data.personal.log.map((l) => ({ ...l, ws: "Personal" })),
    ].sort((a, b) => b.date.localeCompare(a.date));
    return (
      <div className="space-y-6">
        <SectionHeading
          title="Bitácora"
          description="Registro de cada captura de métricas, en todos los espacios."
        />
        {all.length === 0 ? (
          <EmptyState
            title="Bitácora vacía"
            description="Aquí queda registrado cada captura de métricas con su fecha y su fuente."
          />
        ) : (
          <ul className="space-y-3">
            {all.map((entry) => (
              <li
                key={`${entry.ws}-${entry.id}`}
                className="surface p-5"
              >
                <p className="text-sm text-muted-fg">
                  {formatDateShort(entry.date)} — {entry.ws} — {entry.source}
                </p>
                <p className="mt-1 text-[15px] text-ink">{entry.text}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  const ws = data[view];
  const sorted = [...ws.log].sort((a, b) => b.date.localeCompare(a.date));

  const removeEntry = (id: string) => {
    if (!window.confirm("¿Borrar esta entrada de la bitácora?")) return;
    update((d) => ({
      ...d,
      [view]: { ...d[view], log: d[view].log.filter((l) => l.id !== id) },
    }));
  };

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Bitácora"
        description="Registro de cada captura de métricas con fecha y fuente."
        action={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Agregar nota
          </Button>
        }
      />

      {sorted.length === 0 ? (
        <EmptyState
          title="Bitácora vacía"
          description="Aquí queda registrado cada captura de métricas con su fecha y su fuente. Las capturas que registres en Métricas se anotan solas."
          action={
            <Button onClick={() => setDialogOpen(true)}>
              Agregar primera nota
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {sorted.map((entry) => (
            <li
              key={entry.id}
              className="surface flex items-start justify-between gap-3 p-5"
            >
              <div className="min-w-0">
                <p className="text-sm text-muted-fg">
                  {formatDateShort(entry.date)} — {entry.source}
                </p>
                <p className="mt-1 text-[15px] leading-relaxed text-ink">
                  {entry.text}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeEntry(entry.id)}
                aria-label="Borrar entrada de la bitácora"
                className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-fg transition-colors duration-200 ease-apple hover:bg-danger-soft hover:text-danger"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Agregar nota"
      >
        <NoteForm workspaceId={view} onClose={() => setDialogOpen(false)} />
      </Dialog>
    </div>
  );
}
