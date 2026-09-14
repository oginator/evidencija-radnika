"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { PageHeader } from "./PageHeader";
import { pointsTextClass } from "@/lib/format";

type Item = {
  id: string;
  name: string;
  pointsPerPiece?: number;
  active: boolean;
};

type Draft = { name: string; points: string };

export function FurnitureScreen({ owner }: { owner: boolean }) {
  const [items, setItems] = useState<Item[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [name, setName] = useState("");
  const [points, setPoints] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [savingId, setSavingId] = useState("");

  const itemsRef = useRef<Item[]>([]);
  itemsRef.current = items;

  const load = useCallback(async (silent = false) => {
    const response = await fetch("/api/furniture", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) {
      if (!silent) setError(data.error || "Učitavanje nije uspelo.");
      return;
    }
    const nextItems = data.furniture as Item[];
    setItems(nextItems);
    setDrafts((current) => {
      const next: Record<string, Draft> = {};
      for (const item of nextItems) {
        const previous = itemsRef.current.find((row) => row.id === item.id);
        const prevDraft = current[item.id];
        const dirty = owner
          ? prevDraft !== undefined &&
            previous !== undefined &&
            (prevDraft.name !== previous.name ||
              prevDraft.points !==
                (previous.pointsPerPiece === undefined
                  ? ""
                  : String(previous.pointsPerPiece)))
          : prevDraft !== undefined &&
            previous !== undefined &&
            prevDraft.name !== previous.name;
        next[item.id] = dirty
          ? prevDraft
          : {
              name: item.name,
              points:
                item.pointsPerPiece === undefined ? "" : String(item.pointsPerPiece),
            };
      }
      return next;
    });
  }, [owner]);

  useEffect(() => {
    void load();
  }, [load]);

  useAutoRefresh(() => load(true));

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
    if (owner && !Number.isFinite(pointsPerPiece)) {
      setError("Unesite ispravne bodove.");
      return;
    }
    setSavingId(item.id);
    setError("");
    setMessage("");
    const response = await fetch(`/api/furniture/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        owner
          ? { name: draft.name.trim(), pointsPerPiece }
          : { name: draft.name.trim() },
      ),
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
    <div className="min-w-0 space-y-4">
      <PageHeader
        title={owner ? "Nameštaj i bodovi" : "Nameštaj"}
        description={
          owner
            ? "Dodajte komade i bodove. Negativni bodovi su za reklamaciju."
            : "Šifarnik komada koje kolektiv izbacuje."
        }
      />
      {owner ? (
      <form
        onSubmit={addItem}
        className="grid gap-2 rounded-3xl border border-line bg-card p-4 shadow-sm shadow-slate-900/5 sm:grid-cols-[1fr_8rem_auto]"
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Naziv (npr. Krevet ili Reklamacija)"
          className="rounded-xl border border-line bg-white px-3 py-3"
          required
        />
        <input
          type="number"
          step={0.5}
          value={points}
          onChange={(e) => setPoints(e.target.value)}
          placeholder="Bodovi"
          className={`rounded-xl border border-line bg-white px-3 py-3 ${pointsTextClass(points)}`}
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
      ) : null}
      {error ? <p className="text-sm text-accent">{error}</p> : null}
      {message ? <p className="text-sm text-brand">{message}</p> : null}
      <ul className="space-y-3">
        {items.map((item) => {
          const draft = drafts[item.id] ?? {
            name: item.name,
            points: String(item.pointsPerPiece),
          };
          const dirty = owner
            ? draft.name.trim() !== item.name ||
              Number(draft.points) !== item.pointsPerPiece
            : draft.name.trim() !== item.name;
          return (
            <li
              key={item.id}
              className="space-y-3 rounded-3xl border border-line bg-card p-4 shadow-sm shadow-slate-900/5"
            >
              <div className={`grid gap-2 ${owner ? "sm:grid-cols-[1fr_7rem]" : ""}`}>
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
                {owner ? (
                <label className="text-xs font-medium text-muted">
                  Bodovi
                  <input
                    type="number"
                    step={0.5}
                    value={draft.points}
                    onChange={(e) =>
                      setDrafts((current) => ({
                        ...current,
                        [item.id]: { ...draft, points: e.target.value },
                      }))
                    }
                    className={`mt-1 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-base ${pointsTextClass(draft.points)}`}
                  />
                </label>
                ) : null}
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
