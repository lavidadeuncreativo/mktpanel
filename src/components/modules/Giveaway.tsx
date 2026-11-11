"use client";

import { useState } from "react";
import { Crown, Plus, Star, Trash2, Trophy } from "lucide-react";
import { usePanel } from "../panel-context";
import type { Anecdote } from "@/lib/types";
import { formatDateShort, todayIso, uid } from "@/lib/store";
import {
  Button,
  Dialog,
  EmptyState,
  Field,
  Input,
  Pill,
  SectionHeading,
  Select,
  Textarea,
} from "../ui";

const CATEGORIES = ["Paranormal", "Leyenda urbana", "Sueño", "Encuentro", "Otro"];

function AnecdoteForm({ onClose }: { onClose: () => void }) {
  const { update } = usePanel();
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [city, setCity] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [adult, setAdult] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !text.trim() || !adult) return;
    const item: Anecdote = {
      id: uid(),
      name: name.trim() || "Anónimo",
      contact: contact.trim(),
      city: city.trim(),
      category,
      title: title.trim(),
      text: text.trim(),
      source: "landing",
      adult: true,
      finalist: false,
      winner: false,
      createdAt: todayIso(),
    };
    update((d) => ({
      ...d,
      evym: { ...d.evym, anecdotes: [...d.evym.anecdotes, item] },
    }));
    onClose();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Nombre">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Quien cuenta la historia"
          />
        </Field>
        <Field label="Contacto">
          <Input
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="Instagram, correo o teléfono"
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Ciudad">
          <Input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Ciudad de México"
          />
        </Field>
        <Field label="Categoría">
          <Select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Título de la anécdota">
        <Input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Lo que pasó en mi casa"
        />
      </Field>
      <Field label="Anécdota">
        <Textarea
          required
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Cuéntala como pasó…"
        />
      </Field>
      <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border border-line bg-white px-3 py-2.5">
        <input
          type="checkbox"
          checked={adult}
          onChange={(e) => setAdult(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-[#2563eb]"
        />
        <span className="text-sm text-ink">
          Confirmo que quien participa tiene 18 años o más. El premio es una
          botella de mezcal Los Muertos y no se puede cambiar por dinero.
        </span>
      </label>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!adult}>
          Registrar anécdota
        </Button>
      </div>
    </form>
  );
}

export function Giveaway() {
  const { data, view, update } = usePanel();
  const [dialogOpen, setDialogOpen] = useState(false);

  if (view !== "evym") {
    return (
      <div className="space-y-4">
        <SectionHeading
          title="Giveaway"
          description="El sorteo de la botella de mezcal Los Muertos."
        />
        <EmptyState
          title="El giveaway vive solo en Entre Vivos y Muertos"
          description="Las anécdotas, los finalistas y la elección de ganadora se gestionan en el espacio EVYM."
        />
      </div>
    );
  }

  const ws = data.evym;
  const winner = ws.anecdotes.find((a) => a.winner);
  const finalists = ws.anecdotes.filter((a) => a.finalist && !a.winner);
  const sorted = [...ws.anecdotes].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );

  const toggleFinalist = (id: string) => {
    update((d) => ({
      ...d,
      evym: {
        ...d.evym,
        anecdotes: d.evym.anecdotes.map((a) =>
          a.id === id ? { ...a, finalist: !a.finalist } : a,
        ),
      },
    }));
  };

  const removeAnecdote = (id: string, title: string) => {
    if (!window.confirm(`¿Borrar la anécdota “${title}”?`)) return;
    update((d) => ({
      ...d,
      evym: {
        ...d.evym,
        anecdotes: d.evym.anecdotes.filter((a) => a.id !== id),
      },
    }));
  };

  const chooseWinner = () => {
    if (finalists.length === 0) return;
    const pick = finalists[Math.floor(Math.random() * finalists.length)];
    update((d) => ({
      ...d,
      evym: {
        ...d.evym,
        anecdotes: d.evym.anecdotes.map((a) => ({
          ...a,
          winner: a.id === pick.id,
          finalist: a.id === pick.id ? true : a.finalist,
        })),
      },
    }));
  };

  const clearWinner = () => {
    update((d) => ({
      ...d,
      evym: {
        ...d.evym,
        anecdotes: d.evym.anecdotes.map((a) => ({ ...a, winner: false })),
      },
    }));
  };

  return (
    <div className="space-y-4">
      <SectionHeading
        title="Giveaway"
        description="Una botella de mezcal Los Muertos para la mejor anécdota. Solo mayores de 18 años."
        action={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Registrar anécdota
          </Button>
        }
      />

      {/* Winner banner */}
      {winner ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-ink p-5 text-white">
          <div className="flex items-center gap-3">
            <Trophy className="h-6 w-6 shrink-0 text-teal-accent" aria-hidden="true" />
            <div>
              <p className="font-display text-lg font-semibold">
                Ganadora: {winner.name}
              </p>
              <p className="text-sm text-white/70">
                “{winner.title}” — se lleva la botella de mezcal Los Muertos.
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={clearWinner} className="border-white/20 bg-transparent text-white hover:bg-white/10">
            Elegir de nuevo
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white p-5">
          <div>
            <p className="font-display text-base font-semibold text-ink">
              {ws.anecdotes.length} anécdotas, {finalists.length} finalistas
            </p>
            <p className="mt-0.5 text-sm text-muted-fg">
              {finalists.length === 0
                ? "Marca las mejores anécdotas como finalistas y luego elige a la ganadora entre ellas."
                : "Ya hay finalistas. Puedes elegir a la ganadora cuando quieras."}
            </p>
          </div>
          <Button onClick={chooseWinner} disabled={finalists.length === 0}>
            <Crown className="h-4 w-4" aria-hidden="true" />
            Elegir ganadora
          </Button>
        </div>
      )}

      {/* Anecdote list */}
      {sorted.length === 0 ? (
        <EmptyState
          title="Sin anécdotas todavía"
          description="Las anécdotas llegan por el formulario de la landing o por comentarios. Regístralas aquí, marca finalistas y elige a la ganadora de la botella."
          action={
            <Button onClick={() => setDialogOpen(true)}>
              Registrar primera anécdota
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {sorted.map((a) => (
            <article
              key={a.id}
              className="rounded-xl border border-line bg-white p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-display text-base font-semibold text-ink">
                    {a.title}
                  </h3>
                  <p className="mt-0.5 text-sm text-muted-fg">
                    {a.name}
                    {a.city ? `, ${a.city}` : ""} — {a.category} —{" "}
                    {formatDateShort(a.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {a.winner ? <Pill tone="green">Ganadora</Pill> : null}
                  {a.finalist && !a.winner ? (
                    <Pill tone="amber">Finalista</Pill>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => toggleFinalist(a.id)}
                    aria-pressed={a.finalist}
                    aria-label={
                      a.finalist
                        ? `Quitar a ${a.title} de finalistas`
                        : `Marcar ${a.title} como finalista`
                    }
                    className="inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-sm font-medium text-ink transition-colors duration-150 hover:bg-muted"
                  >
                    <Star
                      className="h-4 w-4"
                      fill={a.finalist ? "currentColor" : "none"}
                      aria-hidden="true"
                    />
                    {a.finalist ? "Finalista" : "Marcar finalista"}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeAnecdote(a.id, a.title)}
                    aria-label={`Borrar la anécdota ${a.title}`}
                    className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-muted-fg transition-colors duration-150 hover:bg-danger-soft hover:text-danger"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
              <p className="mt-3 text-[15px] leading-relaxed text-ink">
                {a.text}
              </p>
              {a.contact ? (
                <p className="mt-2 text-xs text-muted-fg">
                  Contacto: {a.contact}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      )}

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Registrar anécdota"
      >
        <AnecdoteForm onClose={() => setDialogOpen(false)} />
      </Dialog>
    </div>
  );
}
