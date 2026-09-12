"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  formatDisplayDate,
  isLastDayOfMonth,
  isoDate,
  lastDayOfMonthNum,
  parseYearMonth,
  shiftDate,
  todayISO,
} from "@/lib/period";
import { formatHours, formatPoints, formatRsd } from "@/lib/format";

type Furniture = { id: string; name: string; pointsPerPiece: number };
type Worker = { id: string; name: string };
type Line = { furnitureTypeId: string; quantity: number };
type WorkerDraft = { hoursWorked: string; saved: boolean; saving: boolean };

export function DailyEntryScreen() {
  const [date, setDate] = useState(todayISO);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [furniture, setFurniture] = useState<Furniture[]>([]);
  const [rsdPerPoint, setRsdPerPoint] = useState(100);
  const [monthHoursOther, setMonthHoursOther] = useState<Record<string, number>>({});
  const [drafts, setDrafts] = useState<Record<string, WorkerDraft>>({});
  const [collective, setCollective] = useState<Line[]>([]);
  const [collectiveSaved, setCollectiveSaved] = useState(true);
  const [collectiveSaving, setCollectiveSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [addPick, setAddPick] = useState({ typeId: "", qty: "1" });

  const load = useCallback(async (selected: string) => {
    setLoading(true);
    setError("");
    const response = await fetch(`/api/entries?date=${selected}`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || "Učitavanje nije uspelo.");
      setLoading(false);
      return;
    }
    setWorkers(data.workers);
    setFurniture(data.furniture);
    setRsdPerPoint(data.rsdPerPoint);
    setMonthHoursOther(data.monthHoursOther ?? {});
    const next: Record<string, WorkerDraft> = {};
    for (const worker of data.workers as Worker[]) {
      const entry = (
        data.entries as { workerId: string; hoursWorked: number }[]
      ).find((item) => item.workerId === worker.id);
      next[worker.id] = {
        hoursWorked: entry ? String(entry.hoursWorked) : "",
        saved: true,
        saving: false,
      };
    }
    setDrafts(next);
    setCollective(
      (data.collective?.assemblies ?? []).map(
        (line: { furnitureTypeId: string; quantity: number }) => ({
          furnitureTypeId: line.furnitureTypeId,
          quantity: line.quantity,
        }),
      ),
    );
    setCollectiveSaved(true);
    setAddPick({
      typeId: data.furniture[0]?.id ?? "",
      qty: "1",
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    load(date);
  }, [date, load]);

  async function saveWorker(workerId: string, draft = drafts[workerId]) {
    if (!draft) return;
    setDrafts((current) => ({
      ...current,
      [workerId]: { ...current[workerId], saving: true },
    }));
    const hoursWorked = draft.hoursWorked === "" ? 0 : Number(draft.hoursWorked);
    const response = await fetch("/api/entries", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, workerId, hoursWorked }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || "Čuvanje nije uspelo.");
      setDrafts((current) => ({
        ...current,
        [workerId]: { ...current[workerId], saving: false },
      }));
      return;
    }
    setDrafts((current) => ({
      ...current,
      [workerId]: { ...current[workerId], saved: true, saving: false },
    }));
  }

  async function saveCollective() {
    setCollectiveSaving(true);
    setError("");
    const response = await fetch("/api/collective", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, assemblies: collective }),
    });
    const data = await response.json().catch(() => ({}));
    setCollectiveSaving(false);
    if (!response.ok) {
      setError(data.error || "Čuvanje kolektiva nije uspelo.");
      return;
    }
    setCollectiveSaved(true);
  }

  function furnitureName(id: string) {
    return furniture.find((item) => item.id === id)?.name ?? "Nameštaj";
  }

  function furniturePoints(id: string) {
    return furniture.find((item) => item.id === id)?.pointsPerPiece ?? 0;
  }

  const monthHours = useMemo(() => {
    return Object.fromEntries(
      workers.map((worker) => [
        worker.id,
        (monthHoursOther[worker.id] ?? 0) + Number(drafts[worker.id]?.hoursWorked || 0),
      ]),
    );
  }, [workers, drafts, monthHoursOther]);

  const collectivePoints = collective.reduce(
    (sum, line) => sum + line.quantity * furniturePoints(line.furnitureTypeId),
    0,
  );
  const monthEnd = isLastDayOfMonth(date);
  const today = todayISO();
  const viewingToday = date === today;
  const { year, month } = parseYearMonth(date);
  const lastDay = lastDayOfMonthNum(year, month);

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-3xl border border-line bg-card p-4 shadow-sm shadow-slate-900/5">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setDate(shiftDate(date, -1))}
            className="rounded-xl px-3 py-2 text-lg hover:bg-background"
            aria-label="Prethodni dan"
          >
            ‹
          </button>
          <div className="text-center">
            <p
              className={`text-sm font-semibold capitalize ${
                viewingToday ? "text-brand" : ""
              }`}
            >
              {formatDisplayDate(date)}
              {viewingToday ? " · danas" : ""}
            </p>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={`mt-1 rounded-lg border bg-white px-2 py-1 text-sm ${
                viewingToday ? "border-brand" : "border-line"
              }`}
            />
            {!viewingToday ? (
              <button
                type="button"
                onClick={() => setDate(today)}
                className="mt-2 rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white"
              >
                Idi na danas
              </button>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => setDate(shiftDate(date, 1))}
            className="rounded-xl px-3 py-2 text-lg hover:bg-background"
            aria-label="Sledeći dan"
          >
            ›
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: lastDay }, (_, index) => index + 1).map((day) => {
            const iso = isoDate(year, month, day);
            const selected = date === iso;
            const isToday = iso === today;
            return (
              <button
                key={iso}
                type="button"
                onClick={() => setDate(iso)}
                className={`rounded-lg py-1.5 text-xs ${
                  isToday
                    ? selected
                      ? "bg-brand font-semibold text-white"
                      : "bg-sky-100 font-semibold text-brand-dark"
                    : selected
                      ? "bg-brand text-white"
                      : "text-muted hover:bg-background"
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      {error ? <p className="text-sm text-accent">{error}</p> : null}
      {loading ? <p className="text-sm text-muted">Učitavanje...</p> : null}

      {!loading ? (
        <section className="rounded-3xl border border-brand/40 bg-card p-4 shadow-sm shadow-brand/10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Kolektiv</h2>
              <p className="text-xs text-muted">
                Bodovi iz proizvoda važe za sve radnike zajedno.
              </p>
            </div>
            {collectiveSaved ? (
              <span className="text-xs text-brand">Sačuvano</span>
            ) : (
              <span className="text-xs text-accent">Nije sačuvano</span>
            )}
          </div>
          <p className="mt-3 rounded-xl bg-background px-3 py-2 text-sm font-semibold text-brand">
            {formatPoints(collectivePoints)} bod · {formatRsd(collectivePoints * rsdPerPoint)}
          </p>
          <p className="mt-4 text-sm font-medium">Izbaceni proizvodi</p>
          <ul className="mt-2 space-y-2">
            {collective.map((line, index) => (
              <li
                key={`${line.furnitureTypeId}-${index}`}
                className="flex items-center justify-between rounded-xl bg-background px-3 py-2 text-sm"
              >
                <span>
                  {furnitureName(line.furnitureTypeId)} × {line.quantity}{" "}
                  <span className="text-muted">
                    ({formatPoints(line.quantity * furniturePoints(line.furnitureTypeId))} bod)
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setCollective((current) => current.filter((_, i) => i !== index));
                    setCollectiveSaved(false);
                  }}
                  className="text-accent"
                >
                  Ukloni
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-2">
            <select
              value={addPick.typeId}
              onChange={(e) =>
                setAddPick((current) => ({ ...current, typeId: e.target.value }))
              }
              className="min-w-0 flex-1 rounded-xl border border-line bg-white px-3 py-2"
            >
              {furniture.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({formatPoints(item.pointsPerPiece)} bod)
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              step={1}
              value={addPick.qty}
              onChange={(e) =>
                setAddPick((current) => ({ ...current, qty: e.target.value }))
              }
              className="w-20 rounded-xl border border-line bg-white px-2 py-2"
            />
            <button
              type="button"
              onClick={() => {
                const typeId = addPick.typeId;
                const qty = Number(addPick.qty);
                if (!typeId || !Number.isFinite(qty) || qty <= 0) return;
                setCollective((current) => {
                  const found = current.find((line) => line.furnitureTypeId === typeId);
                  if (found) {
                    return current.map((line) =>
                      line.furnitureTypeId === typeId
                        ? { ...line, quantity: line.quantity + qty }
                        : line,
                    );
                  }
                  return [...current, { furnitureTypeId: typeId, quantity: qty }];
                });
                setCollectiveSaved(false);
              }}
              className="rounded-xl bg-brand px-3 py-2 text-sm font-medium text-white"
            >
              Dodaj
            </button>
          </div>
          <button
            type="button"
            disabled={collectiveSaving}
            onClick={saveCollective}
            className="mt-4 w-full rounded-xl bg-brand py-2.5 font-medium text-white disabled:opacity-60"
          >
            {collectiveSaving ? "Čuvam..." : "Sačuvaj kolektiv"}
          </button>
        </section>
      ) : null}

      {!loading && workers.length > 0 ? (
        <div
          className={`rounded-3xl border p-4 shadow-sm shadow-slate-900/5 ${
            monthEnd
              ? "border-red-400 bg-red-50 text-red-800"
              : "border-line bg-card"
          }`}
        >
          <p className="text-sm font-semibold">
            {monthEnd ? "Kraj meseca — ukupno sati" : "Sati ovog meseca"}
          </p>
          <ul className="mt-2 space-y-1">
            {workers.map((worker) => (
              <li
                key={worker.id}
                className="flex items-center justify-between text-sm"
              >
                <span>{worker.name}</span>
                <strong>
                  {formatHours(monthHours[worker.id] ?? 0)}h
                  {monthEnd ? " ukupno" : ""}
                </strong>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {workers.map((worker) => {
        const draft = drafts[worker.id];
        if (!draft) return null;
        return (
          <section
            key={worker.id}
            className={`rounded-3xl border p-4 shadow-sm shadow-slate-900/5 ${
              monthEnd ? "border-red-400 bg-red-50" : "border-line bg-card"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-semibold">{worker.name}</h2>
              {draft.saved ? (
                <span className={`text-xs ${monthEnd ? "text-red-700" : "text-brand"}`}>
                  Sačuvano
                </span>
              ) : (
                <span className="text-xs text-accent">Nije sačuvano</span>
              )}
            </div>
            <p
              className={`mt-2 rounded-xl px-3 py-2 text-sm font-semibold ${
                monthEnd ? "bg-red-100 text-red-800" : "bg-background text-brand"
              }`}
            >
              {monthEnd ? "Ukupno sati ovog meseca: " : "Ovaj mesec: "}
              {formatHours(monthHours[worker.id] ?? 0)}h
            </p>
            <label className="mt-3 block text-sm font-medium">
              Sati rada
              <input
                type="number"
                min={0}
                max={24}
                step={0.5}
                inputMode="decimal"
                value={draft.hoursWorked}
                onChange={(e) =>
                  setDrafts((current) => ({
                    ...current,
                    [worker.id]: {
                      ...current[worker.id],
                      hoursWorked: e.target.value,
                      saved: false,
                    },
                  }))
                }
                className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-3 text-lg"
                placeholder="npr. 8"
              />
            </label>
            <button
              type="button"
              disabled={draft.saving}
              onClick={() => saveWorker(worker.id)}
              className="mt-4 w-full rounded-xl bg-brand py-2.5 font-medium text-white disabled:opacity-60"
            >
              {draft.saving ? "Čuvam..." : "Sačuvaj sate"}
            </button>
          </section>
        );
      })}
    </div>
  );
}
