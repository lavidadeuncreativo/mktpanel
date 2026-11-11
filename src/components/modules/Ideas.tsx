"use client";

import { useState } from "react";
import { ArrowRight, Plus, Trash2 } from "lucide-react";
import { usePanel } from "../panel-context";
import type { Idea, WorkspaceId } from "@/lib/types";
import { formatDateShort, todayIso, uid } from "@/lib/store";
import {
  Button,
  Dialog,
  EmptyState,
  Field,
  Input,
  SectionHeading,
  Select,
  Textarea,
} from "../ui";

function IdeaForm({
  workspaceId,
  onClose,
}: {
  workspaceId: WorkspaceId;
  onClose: () => void;
}) {
  const { update } = usePanel();
  const [title, setTitle] = useState("");
  const [score, setScore] = useState(7);
  const [notes, setNotes] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const idea: Idea = {
      id: uid(),
      title: title.trim(),
      score,
      notes: notes.trim(),
      createdAt: todayIso(),
    };
    update((d) => ({
      ...d,
      [workspaceId]: { ...d[workspaceId], ideas: [...d[workspaceId].ideas, idea] },
    }));
    onClose();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Tema">
        <Input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="La casa de Aramberri, Monterrey"
        />
      </Field>
      <Field
        label="Puntuación"
        hint="Del 1 al 10. Puntúa qué tan fuerte es el tema para tu audiencia."
      >
        <Select
          value={score}
          onChange={(e) => setScore(Number(e.target.value))}
        >
          {Array.from({ length: 10 }, (_, i) => 10 - i).map((n) => (
            <option key={n} value={n}>
              {n} de 10
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Notas" hint="Opcional: el detalle que hace fuerte al tema.">
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="El loro que repetía la frase…"
        />
      </Field>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit">Guardar idea</Button>
      </div>
    </form>
  );
}

export function Ideas() {
  const { data, view, update, setModule } = usePanel();
  const [dialogOpen, setDialogOpen] = useState(false);

  if (view === "general") {
    const all = [
      ...data.evym.ideas,
      ...data.antojo.ideas,
      ...data.personal.ideas,
    ];
    return (
      <div className="space-y-4">
        <SectionHeading
          title="Ideas"
          description="Banco de temas con puntuación, por espacio."
        />
        {all.length === 0 ? (
          <EmptyState
            title="Sin ideas guardadas"
            description="Entra a un espacio con el selector de arriba y agrega tu primer tema con su puntuación."
          />
        ) : (
          <p className="text-sm text-muted-fg">
            Hay {all.length} ideas en total entre tus espacios.
          </p>
        )}
      </div>
    );
  }

  const ws = data[view];
  const sorted = [...ws.ideas].sort((a, b) => b.score - a.score);

  const moveToScript = (idea: Idea) => {
    update((d) => ({
      ...d,
      [view]: {
        ...d[view],
        ideas: d[view].ideas.filter((i) => i.id !== idea.id),
        content: [
          ...d[view].content,
          {
            id: uid(),
            title: idea.title,
            status: "guion",
            views: null,
            publishDate: null,
            dayIndex: null,
          },
        ],
      },
    }));
    setModule("contenido");
  };

  const removeIdea = (id: string, title: string) => {
    if (!window.confirm(`¿Borrar la idea “${title}”?`)) return;
    update((d) => ({
      ...d,
      [view]: { ...d[view], ideas: d[view].ideas.filter((i) => i.id !== id) },
    }));
  };

  return (
    <div className="space-y-4">
      <SectionHeading
        title="Ideas"
        description="Banco de temas con puntuación. Los mejores pasan directo a guion."
        action={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Agregar idea
          </Button>
        }
      />

      {sorted.length === 0 ? (
        <EmptyState
          title="Banco vacío"
          description="Guarda aquí los temas que siguen, con su puntuación del 1 al 10. Cuando uno esté listo, pásalo a guion con un clic."
          action={
            <Button onClick={() => setDialogOpen(true)}>
              Agregar primera idea
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sorted.map((idea) => (
            <article
              key={idea.id}
              className="flex flex-col rounded-xl border border-line bg-white p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="font-display text-3xl leading-none font-semibold text-ink">
                  {idea.score}
                  <span className="text-base font-medium text-muted-fg">
                    /10
                  </span>
                </p>
                <button
                  type="button"
                  onClick={() => removeIdea(idea.id, idea.title)}
                  aria-label={`Borrar la idea ${idea.title}`}
                  className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-muted-fg transition-colors duration-150 hover:bg-danger-soft hover:text-danger"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <h3 className="mt-3 font-display text-base font-semibold text-ink">
                {idea.title}
              </h3>
              {idea.notes ? (
                <p className="mt-1 flex-1 text-sm text-muted-fg">
                  {idea.notes}
                </p>
              ) : (
                <p className="mt-1 flex-1 text-sm text-muted-fg">
                  Sin notas.
                </p>
              )}
              <p className="mt-3 text-xs text-muted-fg">
                Guardada el {formatDateShort(idea.createdAt)}
              </p>
              <Button
                variant="outline"
                className="mt-3 w-full"
                onClick={() => moveToScript(idea)}
              >
                Pasar a guion
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </article>
          ))}
        </div>
      )}

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Agregar idea"
      >
        <IdeaForm workspaceId={view} onClose={() => setDialogOpen(false)} />
      </Dialog>
    </div>
  );
}
