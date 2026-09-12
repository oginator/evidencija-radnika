"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MONTH_NAMES } from "@/lib/period";
import {
  formatHours,
  formatPercent,
  formatPoints,
  formatRsd,
} from "@/lib/format";
import { PageHeader } from "./PageHeader";

type MonthRow = {
  year: number;
  month: number;
  hours: number;
  furniturePoints: number;
  totalPoints: number;
  stimulationRsd: number;
  expectedHours: number;
  hoursPercent: number;
};

export function HistoryScreen() {
  const [months, setMonths] = useState<MonthRow[]>([]);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/reports/history")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Greška");
        setMonths(data.months);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoaded(true));
  }, []);

  const maxPoints = Math.max(1, ...months.map((m) => m.totalPoints));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Istorija po mesecima"
        description="Klik na mesec otvara oba perioda (1–15. i 16.–kraj)."
      />
      {error ? <p className="text-sm text-accent">{error}</p> : null}
      {!loaded ? (
        <p className="text-sm text-muted">Učitavanje...</p>
      ) : months.length === 0 && !error ? (
        <p className="text-sm text-muted">Još nema sačuvanih meseci.</p>
      ) : null}

      <div className="space-y-2 rounded-3xl border border-line bg-card p-4 shadow-sm shadow-slate-900/5">
        {months.map((row) => (
          <div key={`${row.year}-${row.month}`} className="space-y-1">
            <div className="flex justify-between text-xs text-muted">
              <span className="capitalize">
                {MONTH_NAMES[row.month - 1]} {row.year}
              </span>
              <span>{formatPoints(row.totalPoints)} bod</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-background">
              <div
                className="h-full rounded-full bg-brand"
                style={{ width: `${(row.totalPoints / maxPoints) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <ul className="space-y-2">
        {months.map((row) => (
          <li
            key={`${row.year}-${row.month}-card`}
            className="rounded-3xl border border-line bg-card p-4 shadow-sm shadow-slate-900/5"
          >
            <p className="font-medium capitalize">
              {MONTH_NAMES[row.month - 1]} {row.year}.
            </p>
            <p className="mt-1 text-sm text-muted">
              {formatHours(row.hours)}h · {formatPercent(row.hoursPercent)} norme ·{" "}
              kolektiv {formatPoints(row.totalPoints)} bod · {formatRsd(row.stimulationRsd)}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href={`/izvestaj?year=${row.year}&month=${row.month}&period=day&date=${row.year}-${String(row.month).padStart(2, "0")}-01`}
                className="rounded-full bg-background px-3 py-1.5 text-sm text-brand transition hover:bg-sky-50"
              >
                Dani
              </Link>
              <Link
                href={`/izvestaj?year=${row.year}&month=${row.month}&period=first`}
                className="rounded-full bg-background px-3 py-1.5 text-sm text-brand transition hover:bg-sky-50"
              >
                1–15.
              </Link>
              <Link
                href={`/izvestaj?year=${row.year}&month=${row.month}&period=second`}
                className="rounded-full bg-background px-3 py-1.5 text-sm text-brand transition hover:bg-sky-50"
              >
                16–kraj
              </Link>
              <Link
                href={`/izvestaj?year=${row.year}&month=${row.month}&period=month`}
                className="rounded-full bg-background px-3 py-1.5 text-sm text-brand transition hover:bg-sky-50"
              >
                Ceo mesec
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
