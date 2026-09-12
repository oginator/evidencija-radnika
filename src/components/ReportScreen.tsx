"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  isoDate,
  isLastDayOfMonth,
  lastDayOfMonthNum,
  MONTH_NAMES,
  shiftDate,
  todayISO,
  type PeriodKey,
} from "@/lib/period";
import {
  formatHours,
  formatPercent,
  formatPoints,
  formatRsd,
} from "@/lib/format";
import { PageHeader } from "./PageHeader";

type AssemblyDetail = { name: string; quantity: number; points?: number };

type Row = {
  workerId: string;
  workerName: string;
  active: boolean;
  hours: number;
  monthHours: number;
  expectedHours: number;
  hoursPercent: number;
  monthHoursPercent: number;
  equalShareRsd?: number;
  stimulationRsd?: number;
};

type Collective = {
  assemblies: AssemblyDetail[];
  furnitureQuantity: number;
  furniturePoints?: number;
  stimulationRsd?: number;
  workerCount: number;
  equalShareRsd?: number;
  paidStimulationRsd?: number;
};

type Report = {
  year: number;
  month: number;
  period: PeriodKey;
  date: string;
  label: string;
  lastDay: number;
  rsdPerPoint?: number;
  workdayHours: number;
  expectedHours: number;
  weekdayCount: number;
  daysWithData: string[];
  rows: Row[];
  collective: Collective;
};

export function ReportScreen({ owner }: { owner: boolean }) {
  const searchParams = useSearchParams();
  const today = todayISO();
  const [period, setPeriod] = useState<PeriodKey>(
    (searchParams.get("period") as PeriodKey) || "day",
  );
  const [date, setDate] = useState(searchParams.get("date") || today);
  const [year, setYear] = useState(
    Number(searchParams.get("year") || date.slice(0, 4)),
  );
  const [month, setMonth] = useState(
    Number(searchParams.get("month") || date.slice(5, 7)),
  );
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const [showFurniture, setShowFurniture] = useState(false);

  useEffect(() => {
    if (period !== "day") return;
    const nextYear = Number(date.slice(0, 4));
    const nextMonth = Number(date.slice(5, 7));
    if (nextYear !== year) setYear(nextYear);
    if (nextMonth !== month) setMonth(nextMonth);
  }, [date, period, year, month]);

  useEffect(() => {
    if (period !== "day") return;
    const last = lastDayOfMonthNum(year, month);
    const day = Number(date.slice(8));
    const inMonth = date.slice(0, 7) === `${year}-${String(month).padStart(2, "0")}`;
    if (!inMonth) {
      setDate(isoDate(year, month, Math.min(day || 1, last)));
    }
  }, [year, month, period, date]);

  useEffect(() => {
    const params = new URLSearchParams({
      year: String(year),
      month: String(month),
      period,
    });
    if (period === "day") params.set("date", date);
    fetch(`/api/reports?${params}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Greška");
        setReport(data);
        setShowFurniture(false);
        setError("");
      })
      .catch((err: Error) => setError(err.message));
  }, [year, month, period, date]);

  const sums = report?.rows.reduce(
    (acc, row) => ({
      hours: acc.hours + row.hours,
      monthHours: acc.monthHours + row.monthHours,
      stimulationRsd: acc.stimulationRsd + row.stimulationRsd,
    }),
    { hours: 0, monthHours: 0, stimulationRsd: 0 },
  );

  const lastDay = lastDayOfMonthNum(year, month);
  const selectedDay = Number(date.slice(8));
  const daysWithData = new Set(report?.daysWithData ?? []);
  const percentLabel = period === "day" ? "% smene" : "% norme";
  const monthEndHighlight =
    period === "second" ||
    period === "month" ||
    (period === "day" && isLastDayOfMonth(date));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Izveštaj"
        description="Dnevni pregled, 1–15., 16.–kraj ili ceo mesec."
      />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <select
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          className="rounded-2xl border border-line bg-card px-3 py-2.5 shadow-sm shadow-slate-900/5"
        >
          {MONTH_NAMES.map((name, index) => (
            <option key={name} value={index + 1}>
              {name}
            </option>
          ))}
        </select>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="rounded-2xl border border-line bg-card px-3 py-2.5 shadow-sm shadow-slate-900/5"
        >
          {[year - 1, year, year + 1]
            .filter((value, index, all) => all.indexOf(value) === index)
            .map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
        </select>
        <button
          type="button"
          onClick={() => setPeriod("day")}
          className={`rounded-2xl px-3 py-2.5 text-sm transition ${
            period === "day"
              ? "bg-brand text-white shadow-sm shadow-brand/30"
              : "border border-line bg-card hover:border-brand/40"
          }`}
        >
          Dan
        </button>
        <button
          type="button"
          onClick={() => setPeriod("first")}
          className={`rounded-2xl px-3 py-2.5 text-sm transition ${
            period === "first"
              ? "bg-brand text-white shadow-sm shadow-brand/30"
              : "border border-line bg-card hover:border-brand/40"
          }`}
        >
          1–15.
        </button>
        <button
          type="button"
          onClick={() => setPeriod("second")}
          className={`rounded-2xl px-3 py-2.5 text-sm transition ${
            period === "second"
              ? "bg-brand text-white shadow-sm shadow-brand/30"
              : "border border-line bg-card hover:border-brand/40"
          }`}
        >
          16–kraj
        </button>
        <button
          type="button"
          onClick={() => setPeriod("month")}
          className={`rounded-2xl px-3 py-2.5 text-sm transition ${
            period === "month"
              ? "bg-brand text-white shadow-sm shadow-brand/30"
              : "border border-line bg-card hover:border-brand/40"
          }`}
        >
          Ceo mesec
        </button>
      </div>

      {period === "day" ? (
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
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-lg border border-line bg-white px-2 py-1 text-sm"
            />
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
              const active = period === "day" && selectedDay === day;
              const hasData = daysWithData.has(iso);
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => {
                    setPeriod("day");
                    setDate(iso);
                  }}
                  className={`rounded-lg py-1.5 text-xs ${
                    active
                      ? "bg-brand text-white"
                      : hasData
                        ? "bg-background font-medium text-brand"
                        : "text-muted hover:bg-background"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {error ? <p className="text-sm text-accent">{error}</p> : null}

      {report ? (
        <>
          <div className="rounded-3xl border border-brand/40 bg-card p-4 text-sm shadow-sm shadow-brand/10">
            <p className="font-semibold">Kolektiv</p>
            {owner ? (
              <>
                <p className="mt-1 text-muted">
                  {formatPoints(report.collective.furnitureQuantity)} kom ·{" "}
                  {formatPoints(report.collective.furniturePoints ?? 0)} bod ·{" "}
                  {formatRsd(report.collective.stimulationRsd ?? 0)}
                </p>
                <p className="mt-2 text-sm">
                  {formatRsd(report.collective.stimulationRsd ?? 0)} ÷{" "}
                  {report.collective.workerCount} radnika ={" "}
                  <strong>{formatRsd(report.collective.equalShareRsd ?? 0)}</strong>{" "}
                  po radniku
                </p>
                <p className="mt-1 text-xs text-muted">
                  Svako dobija taj iznos × % ostvarene mesečne norme sati. Npr.
                  70% norme = 70% od{" "}
                  {formatRsd(report.collective.equalShareRsd ?? 0)}.
                </p>
                <p className="mt-2 font-medium text-brand">
                  Za isplatu: {formatRsd(report.collective.paidStimulationRsd ?? 0)}
                </p>
              </>
            ) : (
              <p className="mt-1 text-muted">
                Izbaceno:{" "}
                <strong className="text-foreground">
                  {formatPoints(report.collective.furnitureQuantity)} kom
                </strong>
              </p>
            )}
          </div>
          <div className="rounded-3xl border border-line bg-card p-4 text-sm shadow-sm shadow-slate-900/5">
            <p className="font-medium capitalize">{report.label}</p>
            <p className="mt-1 text-muted">
              {period === "day"
                ? `Norma smene: ${formatHours(report.workdayHours)}h`
                : `Norma: ${formatHours(report.workdayHours)}h × ${report.weekdayCount} radnih dana = ${formatHours(report.expectedHours)}h`}
            </p>
          </div>
          <div className="overflow-x-auto rounded-3xl border border-line bg-card shadow-sm shadow-slate-900/5">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-background text-xs text-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">Radnik</th>
                  <th className="px-3 py-2 font-medium">Sati</th>
                  <th
                    className={`px-3 py-2 font-medium ${monthEndHighlight ? "text-red-700" : ""}`}
                  >
                    Sati meseca
                  </th>
                  <th className="px-3 py-2 font-medium">{percentLabel}</th>
                  {period === "day" ? (
                    <th className="px-3 py-2 font-medium">% meseca</th>
                  ) : null}
                  {owner ? (
                    <th className="px-3 py-2 font-medium">Stimulacija</th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {report.rows.map((row) => (
                  <tr key={row.workerId} className="border-t border-line">
                    <td className="px-3 py-2">
                      {row.workerName}
                      {row.active ? "" : " (neaktivan)"}
                    </td>
                    <td className="px-3 py-2">{formatHours(row.hours)}</td>
                    <td
                      className={`px-3 py-2 font-semibold ${
                        monthEndHighlight ? "text-red-700" : ""
                      }`}
                    >
                      {monthEndHighlight
                        ? `${formatHours(row.monthHours)}h ukupno`
                        : `${formatHours(row.monthHours)}h`}
                    </td>
                    <td className="px-3 py-2">{formatPercent(row.hoursPercent)}</td>
                    {period === "day" ? (
                      <td className="px-3 py-2">
                        {formatPercent(row.monthHoursPercent)}
                      </td>
                    ) : null}
                    {owner ? (
                      <td className="px-3 py-2 font-semibold text-brand">
                        {formatRsd(row.stimulationRsd ?? 0)}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
              {sums ? (
                <tfoot>
                  <tr className="border-t border-line bg-background font-medium">
                    <td className="px-3 py-2">Ukupno sati</td>
                    <td className="px-3 py-2">{formatHours(sums.hours)}</td>
                    <td className={monthEndHighlight ? "px-3 py-2 text-red-700" : "px-3 py-2"}>
                      {formatHours(sums.monthHours)}h
                    </td>
                    <td className="px-3 py-2" />
                    {period === "day" ? <td className="px-3 py-2" /> : null}
                    {owner ? (
                      <td className="px-3 py-2 text-brand">
                        {formatRsd(sums.stimulationRsd)}
                      </td>
                    ) : null}
                  </tr>
                  <tr className="border-t border-line bg-background">
                    <td className="px-3 py-2 font-medium">Nameštaj</td>
                    <td
                      className="px-3 py-2 font-medium"
                      colSpan={period === "day" ? (owner ? 3 : 2) : owner ? 2 : 1}
                    >
                      {formatPoints(report.collective.furnitureQuantity)} kom
                    </td>
                    <td className="px-3 py-2" colSpan={owner ? 2 : 1}>
                      <button
                        type="button"
                        onClick={() => setShowFurniture((open) => !open)}
                        disabled={report.collective.assemblies.length === 0}
                        className="rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
                      >
                        {showFurniture ? "Zatvori" : "Pregled"}
                      </button>
                    </td>
                  </tr>
                  {showFurniture
                    ? report.collective.assemblies.map((item) => (
                        <tr key={item.name} className="border-t border-line text-sm">
                          <td className="px-3 py-2">{item.name}</td>
                          <td className="px-3 py-2">
                            {formatPoints(item.quantity)} kom
                          </td>
                          {owner ? (
                            <td
                              className="px-3 py-2 text-muted"
                              colSpan={period === "day" ? 4 : 3}
                            >
                              {formatPoints(item.points ?? 0)} bod
                            </td>
                          ) : (
                            <td className="px-3 py-2" colSpan={period === "day" ? 3 : 2} />
                          )}
                        </tr>
                      ))
                    : null}
                </tfoot>
              ) : null}
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}
