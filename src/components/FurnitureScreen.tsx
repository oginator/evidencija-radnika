"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "./PageHeader";

type Item = {
  id: string;
  name: string;
  pointsPerPiece: number;
  active: boolean;
};

type Draft = { name: string; points: string };

export function FurnitureScreen() {
  const [items, setItems] = useState<Item[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [name, setName] = useState("");
  const [points, setPoints] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [savingId, setSavingId] = useState("");

  async function load() {
    const response = await fetch("/api/furniture");
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "Učitavanje nije uspelo.");
      return;
    }
    setItems(data.furniture);
    const next: Record<string, Draft> = {};
    for (const item of data.furniture as Item[]) {
      next[item.id] = {
        name: item.name,
        points: String(item.pointsPerPiece),
      };
    }
    setDrafts(next);
  }

  useEffect(() => {
    load();
  }, []);

  async function addItem(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    setMessage("");
    const response = await fetch("/api/furniture", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, pointsPerPiece: Number(points) }),
    });
    const data = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setError(data.error || "Dodavanje nije uspelo.");
      return;
    }
    setName("");
    setPoints("");
    setMessage("Nameštaj je dodat.");
    await load();
  }

  async function saveItem(item: Item) {
    const draft = drafts[item.id];
    const pointsPerPiece = Number(draft?.points);
    if (!draft?.name.trim()) {
      setError("Naziv ne može biti prazan.");
      return;
    }
    if (!Number.isFinite(pointsPerPiece) || pointsPerPiece < 0) {
      setError("Unesite ispravne bodove.");
      return;
    }
    setSavingId(item.id);
    setError("");
    setMessage("");
    const response = await fetch(`/api/furniture/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: draft.name.trim(),
        pointsPerPiece,
      }),
    });
    const data = await response.json().catch(() => ({}));
    setSavingId("");
    if (!response.ok) {
      setError(data.error || "Izmena nije uspela.");
      return;
    }
    setMessage("Naziv i bodovi su sačuvani.");
    await load();
  }

  async function deleteItem(item: Item) {
    if (!window.confirm(`Izbrisati „${item.name}“ iz šifarnika?`)) return;
    setError("");
    setMessage("");
    const response = await fetch(`/api/furniture/${item.id}`, { method: "DELETE" });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error || "Brisanje nije uspelo.");
      return;
    }
    setMessage("Nameštaj je izbrisan.");
    await load();
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Nameštaj i bodovi"
        description="Ovde dodajete komade i menjate naziv ili koliko bodova donosi svaki."
      />
      <form
        onSubmit={addItem}
        className="grid gap-2 rounded-3xl border border-line bg-card p-4 shadow-sm shadow-slate-900/5 sm:grid-cols-[1fr_8rem_auto]"
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Naziv (npr. Krevet)"
          className="rounded-xl border border-line bg-white px-3 py-3"
          required
        />
        <input
          type="number"
          min={0}
          step={0.5}
          value={points}
          onChange={(e) => setPoints(e.target.value)}
          placeholder="Bodovi"
          className="rounded-xl border border-line bg-white px-3 py-3"
          required
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-brand px-4 py-3 font-medium text-white disabled:opacity-60"
        >
          Dodaj
        </button>
      </form>
      {error ? <p className="text-sm text-accent">{error}</p> : null}
      {message ? <p className="text-sm text-brand">{message}</p> : null}
      <ul className="space-y-3">
        {items.map((item) => {
          const draft = drafts[item.id] ?? {
            name: item.name,
            points: String(item.pointsPerPiece),
          };
          const dirty =
            draft.name.trim() !== item.name ||
            Number(draft.points) !== item.pointsPerPiece;
          return (
            <li
              key={item.id}
              className="space-y-3 rounded-3xl border border-line bg-card p-4 shadow-sm shadow-slate-900/5"
            >
              <div className="grid gap-2 sm:grid-cols-[1fr_7rem]">
                <label className="text-xs font-medium text-muted">
                  Naziv
                  <input
                    value={draft.name}
                    onChange={(e) =>
                      setDrafts((current) => ({
                        ...current,
                        [item.id]: { ...draft, name: e.target.value },
                      }))
                    }
                    className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-base font-normal text-foreground"
                  />
                </label>
                <label className="text-xs font-medium text-muted">
                  Bodovi
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={draft.points}
                    onChange={(e) =>
                      setDrafts((current) => ({
                        ...current,
                        [item.id]: { ...draft, points: e.target.value },
                      }))
                    }
                    className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-base font-normal text-foreground"
                  />
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={!dirty || savingId === item.id}
                  onClick={() => saveItem(item)}
                  className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
                >
                  {savingId === item.id ? "Čuvam..." : "Sačuvaj izmene"}
                </button>
                <button
                  type="button"
                  onClick={() => deleteItem(item)}
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
