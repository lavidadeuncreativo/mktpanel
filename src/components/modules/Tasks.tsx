"use client";

import { useState } from "react";
import { CheckSquare, Plus, Square, Trash2, Upload } from "lucide-react";
import { usePanel } from "../panel-context";
import { CHECKLIST_TASKS } from "@/lib/types";
import { uid } from "@/lib/store";
import {
  Button,
  EmptyState,
  Input,
  Progress,
  SectionHeading,
} from "../ui";
import { cn } from "../cn";

export function Tasks() {
  const { data, view, update } = usePanel();
  const [newLabel, setNewLabel] = useState("");

  if (view === "general") {
    const total = ["evym", "antojo", "personal"] as const;
    const done = total.reduce(
      (s, id) => s + data[id].tasks.filter((t) => t.done).length,
      0,
    );
    const all = total.reduce((s, id) => s + data[id].tasks.length, 0);
    return (
      <div className="space-y-4">
        <SectionHeading
          title="Pendientes"
          description="Checklist de publicación y tareas por espacio."
        />
        <div className="rounded-xl border border-line bg-white p-5">
          <p className="font-display text-2xl font-semibold text-ink">
            {done} de {all} completadas
          </p>
          <p className="mt-1 text-sm text-muted-fg">
            En total, entre tus tres espacios. Entra a un espacio con el
            selector de arriba para gestionar sus pendientes.
          </p>
        </div>
      </div>
    );
  }

  const ws = data[view];
  const doneCount = ws.tasks.filter((t) => t.done).length;
  const total = ws.tasks.length;
  const pct = total === 0 ? 0 : Math.round((doneCount / total) * 100);

  const toggle = (id: string) => {
    update((d) => ({
      ...d,
      [view]: {
        ...d[view],
        tasks: d[view].tasks.map((t) =>
          t.id === id ? { ...t, done: !t.done } : t,
        ),
      },
    }));
  };

  const removeTask = (id: string) => {
    update((d) => ({
      ...d,
      [view]: { ...d[view], tasks: d[view].tasks.filter((t) => t.id !== id) },
    }));
  };

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) return;
    update((d) => ({
      ...d,
      [view]: {
        ...d[view],
        tasks: [...d[view].tasks, { id: uid(), label: newLabel.trim(), done: false }],
      },
    }));
    setNewLabel("");
  };

  const loadChecklist = () => {
    update((d) => ({
      ...d,
      [view]: {
        ...d[view],
        tasks: [
          ...d[view].tasks,
          ...CHECKLIST_TASKS.filter(
            (label) => !d[view].tasks.some((t) => t.label === label),
          ).map((label) => ({ id: uid(), label, done: false })),
        ],
      },
    }));
  };

  return (
    <div className="space-y-4">
      <SectionHeading
        title="Pendientes"
        description="Checklist de publicación y tareas del espacio."
        action={
          <Button variant="outline" onClick={loadChecklist}>
            <Upload className="h-4 w-4" aria-hidden="true" />
            Cargar checklist de publicación
          </Button>
        }
      />

      <div className="rounded-xl border border-line bg-white p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-base font-semibold text-ink">
            Avance
          </h2>
          <p className="text-sm font-semibold text-ink">
            {doneCount} de {total} completadas ({pct}%)
          </p>
        </div>
        <Progress value={pct} className="mt-3" barClassName="bg-accent" />
      </div>

      <form
        onSubmit={addTask}
        className="flex gap-2 rounded-xl border border-line bg-white p-3"
      >
        <Input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="Agregar un pendiente…"
          aria-label="Nuevo pendiente"
        />
        <Button type="submit" disabled={!newLabel.trim()}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Agregar
        </Button>
      </form>

      {ws.tasks.length === 0 ? (
        <EmptyState
          title="Sin pendientes"
          description="Carga el checklist de publicación o agrega tu primera tarea. El checklist incluye verificar el destino de publicaciones cruzadas a Facebook y fijar el comentario."
          action={
            <Button variant="outline" onClick={loadChecklist}>
              Cargar checklist de publicación
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line bg-white px-5">
          {ws.tasks.map((t) => (
            <li key={t.id} className="flex items-center gap-3 py-2">
              <button
                type="button"
                onClick={() => toggle(t.id)}
                aria-pressed={t.done}
                aria-label={
                  t.done
                    ? `Marcar como pendiente: ${t.label}`
                    : `Marcar como hecho: ${t.label}`
                }
                className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg text-ink transition-colors duration-150 hover:bg-muted"
              >
                {t.done ? (
                  <CheckSquare className="h-5 w-5 text-accent" aria-hidden="true" />
                ) : (
                  <Square className="h-5 w-5 text-muted-fg" aria-hidden="true" />
                )}
              </button>
              <span
                className={cn(
                  "flex-1 text-[15px]",
                  t.done ? "text-muted-fg line-through" : "text-ink",
                )}
              >
                {t.label}
              </span>
              <button
                type="button"
                onClick={() => removeTask(t.id)}
                aria-label={`Borrar pendiente: ${t.label}`}
                className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-fg transition-colors duration-150 hover:bg-danger-soft hover:text-danger"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
