"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { usePanel } from "../panel-context";
import type { Idea, WorkspaceId } from "@/lib/types";
import { WORKSPACES } from "@/lib/types";
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
  showWorkspaceSelect,
  onClose,
}: {
  workspaceId: WorkspaceId;
  showWorkspaceSelect?: boolean;
  onClose: () => void;
}) {
  const { update } = usePanel();
  const [title, setTitle] = useState("");
  const [score, setScore] = useState(7);
  const [notes, setNotes] = useState("");
  const [targetWs, setTargetWs] = useState<WorkspaceId>(workspaceId);

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
      [targetWs]: {
        ...d[targetWs],
        ideas: [...d[targetWs].ideas, idea],
      },
    }));
    onClose();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {showWorkspaceSelect ? (
        <Field label="Espacio">
          <Select
            value={targetWs}
            onChange={(e) => setTargetWs(e.target.value as WorkspaceId)}
          >
            {WORKSPACES.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}
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
  const { data, view, update, setModule, setView } = usePanel();
  const [dialogOpen, setDialogOpen] = useState(false);

  // Mover una idea a guion en su propio espacio (o en el espacio
  // activo, cuando se llama desde la vista por espacio).
  const moveToScript = (idea: Idea, wsId: WorkspaceId) => {
    update((d) => ({
      ...d,
      [wsId]: {
        ...d[wsId],
        ideas: d[wsId].ideas.filter((i) => i.id !== idea.id),
        content: [
          ...d[wsId].content,
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
    setView(wsId);
    setModule("contenido");
  };

  const removeIdea = (id: string, title: string, wsId: WorkspaceId) => {
    if (!window.confirm(`¿Borrar la idea “${title}”?`)) return;
    update((d) => ({
      ...d,
      [wsId]: { ...d[wsId], ideas: d[wsId].ideas.filter((i) => i.id !== id) },
    }));
  };

  if (view === "general") {
    // El banco agregado: todas las ideas de los tres espacios, con su
    // puntuación y su espacio, ordenadas de más a menos fuerte.
    const all: { idea: Idea; wsId: WorkspaceId }[] = (
      ["evym", "antojo", "personal"] as WorkspaceId[]
    ).flatMap((wsId) =>
      data[wsId].ideas.map((idea) => ({ idea, wsId })),
    );
    const sorted = [...all].sort((a, b) => b.idea.score - a.idea.score);
    return (
      <div className="space-y-6">
        <SectionHeading
          title="Ideas"
          description="Banco de temas con puntuación, de tus tres espacios. Los mejores pasan directo a guion."
          action={
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Agregar idea
            </Button>
          }
        />
        {sorted.length === 0 ? (
          <EmptyState
            title="Sin ideas guardadas"
            description="Guarda aquí los temas que siguen, con su puntuación del 1 al 10. Cuando uno esté listo, pásalo a guion con un clic."
            action={
              <Button onClick={() => setDialogOpen(true)}>
                Agregar primera idea
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {sorted.map(({ idea, wsId }) => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                wsId={wsId}
                onMoveToScript={() => moveToScript(idea, wsId)}
                onRemove={() => removeIdea(idea.id, idea.title, wsId)}
              />
            ))}
          </div>
        )}

        <Dialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          title="Agregar idea"
        >
          <IdeaForm
            workspaceId="evym"
            showWorkspaceSelect
            onClose={() => setDialogOpen(false)}
          />
        </Dialog>
      </div>
    );
  }

  const ws = data[view];
  const sorted = [...ws.ideas].sort((a, b) => b.score - a.score);

  return (
    <div className="space-y-6">
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
            <IdeaCard
              key={idea.id}
              idea={idea}
              wsId={view}
              onMoveToScript={() => moveToScript(idea, view)}
              onRemove={() => removeIdea(idea.id, idea.title, view)}
            />
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

/** Una tarjeta de idea: puntuación grande, tema, notas y su espacio. */
function IdeaCard({
  idea,
  wsId,
  onMoveToScript,
  onRemove,
}: {
  idea: Idea;
  wsId: WorkspaceId;
  onMoveToScript: () => void;
  onRemove: () => void;
}) {
  const meta = WORKSPACES.find((w) => w.id === wsId);
  return (
    <article className="surface flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-3xl leading-none font-semibold tracking-[-0.02em] text-ink">
          {idea.score}
          <span className="text-base font-medium text-muted-fg">/10</span>
        </p>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Borrar la idea ${idea.title}`}
          className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-muted-fg transition-colors duration-200 ease-apple hover:bg-danger-soft hover:text-danger"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <h3 className="mt-3 text-base font-semibold tracking-[-0.01em] text-ink">
        {idea.title}
      </h3>
      {idea.notes ? (
        <p className="mt-1 flex-1 text-sm text-muted-fg">{idea.notes}</p>
      ) : (
        <p className="mt-1 flex-1 text-sm text-muted-fg">Sin notas.</p>
      )}
      <p className="mt-3 text-xs text-muted-fg">
        {meta?.short ?? wsId} · Guardada el {formatDateShort(idea.createdAt)}
      </p>
      <Button variant="outline" className="mt-3 w-full" onClick={onMoveToScript}>
        Pasar a guion
      </Button>
    </article>
  );
}
