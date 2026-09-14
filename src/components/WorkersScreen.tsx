"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "./PageHeader";

type Worker = { id: string; name: string; active: boolean };

export function WorkersScreen() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [savingId, setSavingId] = useState("");

  async function load() {
    const response = await fetch("/api/workers");
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "Učitavanje nije uspelo.");
      return;
    }
    setWorkers(data.workers);
    const next: Record<string, string> = {};
    for (const worker of data.workers as Worker[]) {
      next[worker.id] = worker.name;
    }
    setDrafts(next);
  }

  useEffect(() => {
    load();
  }, []);

  async function addWorker(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    setMessage("");
    const response = await fetch("/api/workers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setError(data.error || "Dodavanje nije uspelo.");
      return;
    }
    setName("");
    setMessage("Radnik je dodat.");
    await load();
  }

  async function saveName(worker: Worker) {
    const nextName = (drafts[worker.id] ?? "").trim();
    if (!nextName) {
      setError("Ime ne može biti prazno.");
      return;
    }
    setSavingId(worker.id);
    setError("");
    setMessage("");
    const response = await fetch(`/api/workers/${worker.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nextName }),
    });
    const data = await response.json().catch(() => ({}));
    setSavingId("");
    if (!response.ok) {
      setError(data.error || "Izmena nije uspela.");
      return;
    }
    setMessage("Ime je sačuvano.");
    await load();
  }

  async function deleteWorker(worker: Worker) {
    if (!window.confirm(`Izbrisati radnika „${worker.name}“?`)) return;
    setError("");
    setMessage("");
    const response = await fetch(`/api/workers/${worker.id}`, { method: "DELETE" });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error || "Brisanje nije uspelo.");
      return;
    }
    setMessage("Radnik je izbrisan.");
    await load();
  }

  return (
    <div className="min-w-0 space-y-4">
      <PageHeader
        title="Radnici"
        description="Dodajte radnika, promenite ime ili ga izbrišite iz evidencije."
      />
      <form
        onSubmit={addWorker}
        className="flex flex-col gap-2 rounded-3xl border border-line bg-card p-4 shadow-sm shadow-slate-900/5 sm:flex-row"
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ime i prezime"
          className="flex-1 rounded-xl border border-line bg-white px-3 py-3"
          required
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-brand px-4 py-3 font-medium text-white disabled:opacity-60"
        >
          Dodaj radnika
        </button>
      </form>
      {error ? <p className="text-sm text-accent">{error}</p> : null}
      {message ? <p className="text-sm text-brand">{message}</p> : null}
      <ul className="space-y-3">
        {workers.map((worker) => {
          const draft = drafts[worker.id] ?? worker.name;
          const dirty = draft.trim() !== worker.name;
          return (
            <li
              key={worker.id}
              className="space-y-3 rounded-3xl border border-line bg-card p-4 shadow-sm shadow-slate-900/5"
            >
              <input
                value={draft}
                onChange={(e) =>
                  setDrafts((current) => ({
                    ...current,
                    [worker.id]: e.target.value,
                  }))
                }
                className="w-full rounded-xl border border-line bg-white px-3 py-2.5"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!dirty || savingId === worker.id}
                  onClick={() => saveName(worker)}
                  className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
                >
                  {savingId === worker.id ? "Čuvam..." : "Sačuvaj ime"}
                </button>
                <button
                  type="button"
                  onClick={() => deleteWorker(worker)}
                  className="rounded-xl bg-background px-3 py-2 text-sm text-accent"
                >
                  Izbriši
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
