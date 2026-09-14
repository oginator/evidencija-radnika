"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import {
  formatDisplayDate,
  isLastDayOfMonth,
  isoDate,
  lastDayOfMonthNum,
  parseYearMonth,
  shiftDate,
  todayISO,
} from "@/lib/period";
import { formatHours, formatPoints, formatRsd, pointsTextClass } from "@/lib/format";

type Furniture = { id: string; name: string; pointsPerPiece?: number };
type Worker = { id: string; name: string };
type Line = { furnitureTypeId: string; quantity: number };
type WorkerDraft = {
  hoursWorked: string;
  saved: boolean;
  saving: boolean;
  hoursConfirmed: boolean;
  didNotWork: boolean;
  confirming: boolean;
  markingAbsent: boolean;
  unlocking: boolean;
};
type ConfirmAction = "absent" | "unlock";

function ConfirmedMark() {
  return (
    <span
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white"
      aria-label="Potvrđeno"
    >
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden>
        <path
          d="M5 10.5 8.2 14 15 6.5"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function AbsentMark() {
  return (
    <span
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-600 text-white"
      aria-label="Nije radio"
    >
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden>
        <path
          d="M6 6 14 14 M14 6 6 14"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

function isLocked(draft: WorkerDraft) {
  return draft.hoursConfirmed || draft.didNotWork;
}

export function DailyEntryScreen({ owner }: { owner: boolean }) {
  const [date, setDate] = useState(todayISO);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [furniture, setFurniture] = useState<Furniture[]>([]);
  const [rsdPerPoint, setRsdPerPoint] = useState(100);
  const [monthFurnitureQuantity, setMonthFurnitureQuantity] = useState(0);
  const [monthHoursOther, setMonthHoursOther] = useState<Record<string, number>>({});
  const [drafts, setDrafts] = useState<Record<string, WorkerDraft>>({});
  const [collective, setCollective] = useState<Line[]>([]);
  const [collectiveSaved, setCollectiveSaved] = useState(true);
  const [collectiveSaving, setCollectiveSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [addPick, setAddPick] = useState({ typeId: "", qty: "1" });
  const [confirmPrompt, setConfirmPrompt] = useState<{
    workerId: string;
    action: ConfirmAction;
  } | null>(null);
  const [confirmWait, setConfirmWait] = useState(3);
  const [confirmOverlayReady, setConfirmOverlayReady] = useState(false);
  const confirmArmedRef = useRef(false);

  const collectiveSavedRef = useRef(true);
  const requestId = useRef(0);
  collectiveSavedRef.current = collectiveSaved;

  const load = useCallback(async (selected: string, silent = false) => {
    const id = silent ? requestId.current : ++requestId.current;
    if (!silent) {
      setLoading(true);
      setError("");
    }
    const response = await fetch(`/api/entries?date=${selected}`, {
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({}));
    if (id !== requestId.current) return;
    if (!response.ok) {
      if (!silent) {
        setError(data.error || "Učitavanje nije uspelo.");
        setLoading(false);
      }
      return;
    }
    setWorkers(data.workers);
    setFurniture(data.furniture);
    setRsdPerPoint(data.rsdPerPoint ?? 0);
    setMonthFurnitureQuantity(data.monthFurnitureQuantity ?? 0);
    setMonthHoursOther(data.monthHoursOther ?? {});
    const entries = (data.entries ?? []) as {
      workerId: string;
      hoursWorked: number;
      hoursConfirmed?: boolean;
      didNotWork?: boolean;
    }[];
    setDrafts((current) => {
      const next: Record<string, WorkerDraft> = {};
      for (const worker of data.workers as Worker[]) {
        const existing = current[worker.id];
        const entry = entries.find((item) => item.workerId === worker.id);
        const confirmed = !!entry?.hoursConfirmed;
        const didNotWork = !!entry?.didNotWork;
        const locked = confirmed || didNotWork;
        if (existing?.confirming || existing?.markingAbsent || existing?.unlocking) {
          next[worker.id] = existing;
        } else if (locked) {
          next[worker.id] = {
            hoursWorked: didNotWork ? "0" : entry ? String(entry.hoursWorked) : "",
            saved: true,
            saving: false,
            hoursConfirmed: confirmed,
            didNotWork,
            confirming: false,
            markingAbsent: false,
            unlocking: false,
          };
        } else if (existing && (!existing.saved || existing.saving)) {
          next[worker.id] = {
            ...existing,
            hoursConfirmed: false,
            didNotWork: false,
          };
        } else {
          next[worker.id] = {
            hoursWorked: entry ? String(entry.hoursWorked) : "",
            saved: true,
            saving: false,
            hoursConfirmed: false,
            didNotWork: false,
            confirming: false,
            markingAbsent: false,
            unlocking: false,
          };
        }
      }
      return next;
    });
    if (!silent || collectiveSavedRef.current) {
      setCollective(
        (data.collective?.assemblies ?? []).map(
          (line: { furnitureTypeId: string; quantity: number }) => ({
            furnitureTypeId: line.furnitureTypeId,
            quantity: line.quantity,
          }),
        ),
      );
      setCollectiveSaved(true);
    }
    if (silent) {
      setAddPick((current) => {
        const stillThere = (data.furniture as Furniture[]).some(
          (item) => item.id === current.typeId,
        );
        if (stillThere) return current;
        return { typeId: data.furniture[0]?.id ?? "", qty: current.qty || "1" };
      });
    } else {
      setAddPick({
        typeId: data.furniture[0]?.id ?? "",
        qty: "1",
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load(date);
  }, [date, load]);

  useAutoRefresh(() => load(date, true));

  useEffect(() => {
    if (!confirmPrompt) {
      confirmArmedRef.current = false;
      setConfirmWait(3);
      setConfirmOverlayReady(false);
      return;
    }
    confirmArmedRef.current = false;
    setConfirmWait(3);
    setConfirmOverlayReady(false);
    const started = Date.now();
    const overlayTimer = window.setTimeout(() => setConfirmOverlayReady(true), 450);
    const tick = window.setInterval(() => {
      const left = Math.max(0, 3 - Math.floor((Date.now() - started) / 1000));
      setConfirmWait(left);
      if (left === 0) {
        confirmArmedRef.current = true;
        window.clearInterval(tick);
      }
    }, 100);
    return () => {
      window.clearTimeout(overlayTimer);
      window.clearInterval(tick);
    };
  }, [confirmPrompt]);

  function openConfirmPrompt(workerId: string, action: ConfirmAction) {
    window.setTimeout(() => {
      confirmArmedRef.current = false;
      setConfirmWait(3);
      setConfirmOverlayReady(false);
      setConfirmPrompt({ workerId, action });
    }, 0);
  }

  function closeConfirmPrompt() {
    confirmArmedRef.current = false;
    setConfirmPrompt(null);
  }

  async function saveWorker(workerId: string, draft = drafts[workerId]) {
    if (!draft || owner || isLocked(draft)) return;
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
      [workerId]: {
        ...current[workerId],
        saved: true,
        saving: false,
        hoursConfirmed: data.hoursConfirmed === true,
        didNotWork: data.didNotWork === true,
      },
    }));
  }

  async function confirmWorker(workerId: string) {
    const draft = drafts[workerId];
    if (!draft || owner || isLocked(draft)) return;
    const hoursWorked = draft.hoursWorked === "" ? 0 : Number(draft.hoursWorked);
    if (!Number.isFinite(hoursWorked) || hoursWorked <= 0) {
      setError("Unesite sate pa potvrdite.");
      return;
    }
    setError("");
    setDrafts((current) => ({
      ...current,
      [workerId]: { ...current[workerId], confirming: true },
    }));
    const response = await fetch("/api/entries", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, workerId, hoursWorked, hoursConfirmed: true }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || "Potvrda nije uspela.");
      setDrafts((current) => ({
        ...current,
        [workerId]: { ...current[workerId], confirming: false },
      }));
      return;
    }
    setDrafts((current) => ({
      ...current,
      [workerId]: {
        ...current[workerId],
        hoursWorked: String(hoursWorked),
        saved: true,
        saving: false,
        hoursConfirmed: true,
        didNotWork: false,
        confirming: false,
        markingAbsent: false,
        unlocking: false,
      },
    }));
  }

  async function markAbsent(workerId: string) {
    if (!confirmArmedRef.current) return false;
    const draft = drafts[workerId];
    if (!draft || owner || isLocked(draft)) return false;
    setError("");
    setDrafts((current) => ({
      ...current,
      [workerId]: { ...current[workerId], markingAbsent: true },
    }));
    const response = await fetch("/api/entries", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, workerId, didNotWork: true }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || "Označavanje nije uspelo.");
      setDrafts((current) => ({
        ...current,
        [workerId]: { ...current[workerId], markingAbsent: false },
      }));
      return false;
    }
    setDrafts((current) => ({
      ...current,
      [workerId]: {
        ...current[workerId],
        hoursWorked: "0",
        saved: true,
        saving: false,
        hoursConfirmed: false,
        didNotWork: true,
        confirming: false,
        markingAbsent: false,
        unlocking: false,
      },
    }));
    return true;
  }

  async function unlockWorker(workerId: string) {
    if (!confirmArmedRef.current || !owner) return false;
    setError("");
    setDrafts((current) => ({
      ...current,
      [workerId]: { ...current[workerId], unlocking: true },
    }));
    const response = await fetch("/api/entries", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, workerId, hoursConfirmed: false, didNotWork: false }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || "Otključavanje nije uspelo.");
      setDrafts((current) => ({
        ...current,
        [workerId]: { ...current[workerId], unlocking: false },
      }));
      return false;
    }
    setDrafts((current) => ({
      ...current,
      [workerId]: {
        ...current[workerId],
        hoursConfirmed: false,
        didNotWork: false,
        unlocking: false,
      },
    }));
    return true;
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
    await load(date, true);
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
    <div className="min-w-0 space-y-4">
      <div className="space-y-3 rounded-3xl border border-line bg-card p-3 shadow-sm shadow-slate-900/5 sm:p-4">
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
              className={`mt-1 max-w-full rounded-lg border bg-white px-2 py-1 text-base ${
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
                {owner
                  ? "Bodovi iz proizvoda važe za sve radnike zajedno."
                  : "Ovde unosite koliko je komada izbačeno."}
              </p>
            </div>
            {collectiveSaved ? (
              <span className="text-xs text-brand">Sačuvano</span>
            ) : (
              <span className="text-xs text-accent">Nije sačuvano</span>
            )}
          </div>
          <p className="mt-3 rounded-xl bg-background px-3 py-2 text-sm font-semibold text-brand">
            {owner
              ? `${formatPoints(collectivePoints)} bod · ${formatRsd(collectivePoints * rsdPerPoint)}`
              : `${formatPoints(monthFurnitureQuantity)} kom ovog meseca`}
          </p>
          <p className="mt-4 text-sm font-medium">Izbaceni proizvodi</p>
          <ul className="mt-2 space-y-2">
            {collective.map((line, index) => (
              <li
                key={`${line.furnitureTypeId}-${index}`}
                className="flex min-w-0 items-center justify-between gap-2 rounded-xl bg-background px-3 py-2 text-sm"
              >
                <span className="min-w-0 break-words">
                  {furnitureName(line.furnitureTypeId)} × {line.quantity}
                  {owner ? (
                    <span
                      className={pointsTextClass(
                        line.quantity * furniturePoints(line.furnitureTypeId),
                      )}
                    >
                      {" "}
                      ({formatPoints(line.quantity * furniturePoints(line.furnitureTypeId))} bod)
                    </span>
                  ) : null}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setCollective((current) => current.filter((_, i) => i !== index));
                    setCollectiveSaved(false);
                  }}
                  className="shrink-0 text-accent"
                >
                  Ukloni
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex min-w-0 flex-col gap-2 sm:flex-row">
            <select
              value={addPick.typeId}
              onChange={(e) =>
                setAddPick((current) => ({ ...current, typeId: e.target.value }))
              }
              className="min-w-0 w-full flex-1 rounded-xl border border-line bg-white px-3 py-2"
            >
              {furniture.map((item) => (
                <option key={item.id} value={item.id}>
                  {owner
                    ? `${item.name} (${formatPoints(item.pointsPerPiece ?? 0)} bod)`
                    : item.name}
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
              className="w-full rounded-xl border border-line bg-white px-2 py-2 sm:w-20"
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
              className="rounded-xl bg-brand px-3 py-2 text-sm font-medium text-white sm:shrink-0"
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
        const confirmed = draft.hoursConfirmed;
        const absent = draft.didNotWork;
        const locked = confirmed || absent;
        const hoursReadOnly = owner || locked;
        const busy = draft.saving || draft.confirming || draft.markingAbsent || draft.unlocking;
        return (
          <section
            key={worker.id}
            className={`rounded-3xl border p-4 shadow-sm shadow-slate-900/5 ${
              absent
                ? "border-red-500 bg-red-50"
                : confirmed
                  ? "border-emerald-500 bg-emerald-50"
                  : monthEnd
                    ? "border-red-400 bg-red-50"
                    : "border-line bg-card"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold">{worker.name}</h2>
                {absent ? (
                  <AbsentMark />
                ) : confirmed ? (
                  <ConfirmedMark />
                ) : owner ? null : (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      openConfirmPrompt(worker.id, "absent");
                    }}
                    className="rounded-full border border-red-500 bg-transparent px-2 py-0.5 text-[10px] font-medium leading-none text-red-600 disabled:opacity-60"
                  >
                    {draft.markingAbsent ? "..." : "Nije radio"}
                  </button>
                )}
              </div>
              {absent ? (
                <span className="text-xs font-semibold text-red-700">Nije radio</span>
              ) : confirmed ? (
                <span className="text-xs font-semibold text-emerald-700">Potvrđeno</span>
              ) : draft.saved ? (
                <span className={`text-xs ${monthEnd ? "text-red-700" : "text-brand"}`}>
                  Sačuvano
                </span>
              ) : (
                <span className="text-xs text-accent">Nije sačuvano</span>
              )}
            </div>
            <p
              className={`mt-2 rounded-xl px-3 py-2 text-sm font-semibold ${
                absent
                  ? "bg-red-100 text-red-800"
                  : confirmed
                    ? "bg-emerald-100 text-emerald-800"
                    : monthEnd
                      ? "bg-red-100 text-red-800"
                      : "bg-background text-brand"
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
                max={400}
                step={0.5}
                inputMode="decimal"
                value={draft.hoursWorked}
                disabled={hoursReadOnly}
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
                className={`mt-1 w-full rounded-xl border px-3 py-3 text-lg ${
                  absent
                    ? "cursor-not-allowed border-red-200 bg-red-50 text-red-900"
                    : confirmed
                      ? "cursor-not-allowed border-emerald-200 bg-emerald-50 text-emerald-900"
                      : hoursReadOnly
                        ? "cursor-not-allowed border-line bg-slate-50"
                        : "border-line bg-white"
                }`}
                placeholder="npr. 8"
              />
            </label>
            {owner ? (
              locked ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    openConfirmPrompt(worker.id, "unlock");
                  }}
                  className={`mt-4 w-full rounded-xl border bg-white py-2.5 text-sm font-medium ${
                    absent
                      ? "border-red-300 text-red-800"
                      : "border-emerald-300 text-emerald-800"
                  }`}
                >
                  Otključaj
                </button>
              ) : null
            ) : locked ? null : (
              <div className="mt-4 flex flex-col gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => saveWorker(worker.id)}
                  className="w-full rounded-xl bg-brand py-2.5 font-medium text-white disabled:opacity-60"
                >
                  {draft.saving ? "Čuvam..." : "Sačuvaj sate"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => confirmWorker(worker.id)}
                  className="w-full rounded-xl bg-emerald-600 py-2.5 font-medium text-white disabled:opacity-60"
                >
                  {draft.confirming ? "Potvrđujem..." : "Potvrdio"}
                </button>
              </div>
            )}
          </section>
        );
      })}
      {confirmPrompt
        ? createPortal(
            <div
              className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 ${
                confirmOverlayReady ? "" : "pointer-events-none"
              }`}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="confirm-prompt-title"
                className="w-full max-w-sm rounded-3xl border border-line bg-card p-5 shadow-lg"
                onClick={(event) => event.stopPropagation()}
              >
                <p id="confirm-prompt-title" className="text-lg font-semibold">
                  Da li si siguran?
                </p>
                <p className="mt-2 text-sm text-muted">
                  {confirmPrompt.action === "absent"
                    ? `${workers.find((item) => item.id === confirmPrompt.workerId)?.name ?? "Radnik"} nije radio ovog dana.`
                    : `Otključati ${workers.find((item) => item.id === confirmPrompt.workerId)?.name ?? "radnika"}?`}
                </p>
                <div className="mt-5 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={
                      !confirmOverlayReady ||
                      drafts[confirmPrompt.workerId]?.markingAbsent ||
                      drafts[confirmPrompt.workerId]?.unlocking
                    }
                    onClick={closeConfirmPrompt}
                    className="rounded-xl border border-line bg-white py-2.5 text-sm font-medium disabled:opacity-60"
                  >
                    Ne
                  </button>
                  <button
                    type="button"
                    disabled={
                      !confirmArmedRef.current ||
                      confirmWait > 0 ||
                      drafts[confirmPrompt.workerId]?.markingAbsent ||
                      drafts[confirmPrompt.workerId]?.unlocking
                    }
                    onClick={async (event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      if (!confirmArmedRef.current || confirmWait > 0) return;
                      const ok =
                        confirmPrompt.action === "absent"
                          ? await markAbsent(confirmPrompt.workerId)
                          : await unlockWorker(confirmPrompt.workerId);
                      if (ok) closeConfirmPrompt();
                    }}
                    className={`rounded-xl py-2.5 text-sm font-medium text-white ${
                      confirmWait > 0
                        ? "pointer-events-none bg-red-600/40"
                        : "bg-red-600 disabled:opacity-40"
                    }`}
                  >
                    {drafts[confirmPrompt.workerId]?.markingAbsent ||
                    drafts[confirmPrompt.workerId]?.unlocking
                      ? "Čuvam..."
                      : confirmWait > 0
                        ? `Da (${confirmWait})`
                        : "Da"}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
