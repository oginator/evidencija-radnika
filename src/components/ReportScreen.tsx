"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  isoDate,
  isLastDayOfMonth,
  lastDayOfMonthNum,
  MONTH_NAMES,
  normalizePeriod,
  parseYearMonth,
  periodRange,
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
  from: string;
  to: string;
  lastDay: number;
  rsdPerPoint?: number;
  workdayHours: number;
  expectedHours: number;
  weekdayCount: number;
  daysWithData: string[];
  rows: Row[];
  collective: Collective;
};

function defaultRangeFor(year: number, month: number, today: string) {
  const last = lastDayOfMonthNum(year, month);
  const isCurrentMonth =
    year === Number(today.slice(0, 4)) && month === Number(today.slice(5, 7));
  return {
    from: isoDate(year, month, 1),
    to: isCurrentMonth ? today : isoDate(year, month, last),
  };
}

function initialRange(searchParams: URLSearchParams, today: string) {
  const rawPeriod = searchParams.get("period");
  const year = Number(searchParams.get("year") || today.slice(0, 4));
  const month = Number(searchParams.get("month") || today.slice(5, 7));
  if (rawPeriod === "day" || rawPeriod === "first" || rawPeriod === "second") {
    return periodRange(year, month, rawPeriod, {
      date: searchParams.get("date") || undefined,
    });
  }
  const fallback = defaultRangeFor(year, month, today);
  return periodRange(year, month, "range", {
    from: searchParams.get("from") || fallback.from,
    to: searchParams.get("to") || fallback.to,
  });
}

export function ReportScreen({ owner }: { owner: boolean }) {
  const searchParams = useSearchParams();
  const today = todayISO();
  const start = initialRange(searchParams, today);
  const [period, setPeriod] = useState<PeriodKey>(
    normalizePeriod(searchParams.get("period")),
  );
  const [fromDate, setFromDate] = useState(start.from);
  const [toDate, setToDate] = useState(start.to);
  const [year, setYear] = useState(
    Number(searchParams.get("year") || toDate.slice(0, 4)),
  );
  const [month, setMonth] = useState(
    Number(searchParams.get("month") || toDate.slice(5, 7)),
  );
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const [showFurniture, setShowFurniture] = useState(false);

  function applyMonthYear(nextYear: number, nextMonth: number) {
    setYear(nextYear);
    setMonth(nextMonth);
    const next = defaultRangeFor(nextYear, nextMonth, today);
    setFromDate(next.from);
    setToDate(next.to);
  }

  function applyFrom(value: string) {
    setFromDate(value);
    if (value > toDate) setToDate(value);
  }

  function applyTo(value: string) {
    setToDate(value);
    if (value < fromDate) setFromDate(value);
    const next = parseYearMonth(value);
    setYear(next.year);
    setMonth(next.month);
  }

  useEffect(() => {
    const params = new URLSearchParams({
      year: String(year),
      month: String(month),
      period,
    });
    if (period === "range") {
      params.set("from", fromDate);
      params.set("to", toDate);
    }
    fetch(`/api/reports?${params}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Greška");
        setReport(data);
        setShowFurniture(false);
        setError("");
      })
      .catch((err: Error) => setError(err.message));
  }, [year, month, period, fromDate, toDate]);

  const sums = report?.rows.reduce(
    (acc, row) => ({
      hours: acc.hours + row.hours,
      monthHours: acc.monthHours + row.monthHours,
      stimulationRsd: acc.stimulationRsd + (row.stimulationRsd ?? 0),
    }),
    { hours: 0, monthHours: 0, stimulationRsd: 0 },
  );

  const monthEndHighlight =
    period === "month" || (period === "range" && isLastDayOfMonth(toDate));

  return (
    <div className="min-w-0 space-y-4">
      <PageHeader
        title="Izveštaj"
        description="Pregled od datuma do datuma ili ceo mesec."
      />

      <div className="grid grid-cols-2 gap-2">
        <select
          value={month}
          onChange={(e) => applyMonthYear(year, Number(e.target.value))}
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
          onChange={(e) => applyMonthYear(Number(e.target.value), month)}
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
          onClick={() => setPeriod("range")}
          className={`rounded-2xl px-3 py-2.5 text-sm transition ${
            period === "range"
              ? "bg-brand text-white shadow-sm shadow-brand/30"
              : "border border-line bg-card hover:border-brand/40"
          }`}
        >
          Period
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

      {period === "range" ? (
        <div className="grid grid-cols-2 gap-2 rounded-3xl border border-line bg-card p-4 shadow-sm shadow-slate-900/5">
          <label className="min-w-0 space-y-1 text-sm">
            <span className="text-muted">Od</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => applyFrom(e.target.value)}
              className="w-full min-w-0 rounded-lg border border-line bg-white px-2 py-2 text-base"
            />
          </label>
          <label className="min-w-0 space-y-1 text-sm">
            <span className="text-muted">Do</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => applyTo(e.target.value)}
              className="w-full min-w-0 rounded-lg border border-line bg-white px-2 py-2 text-base"
            />
          </label>
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
              Norma: {formatHours(report.workdayHours)}h × {report.weekdayCount}{" "}
              radnih dana = {formatHours(report.expectedHours)}h
            </p>
          </div>
          <div className="table-scroll rounded-3xl border border-line bg-card shadow-sm shadow-slate-900/5">
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
                  <th className="px-3 py-2 font-medium">% norme</th>
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
                    {owner ? (
                      <td className="px-3 py-2 text-brand">
                        {formatRsd(sums.stimulationRsd)}
                      </td>
                    ) : null}
                  </tr>
                  <tr className="border-t border-line bg-background">
                    <td className="px-3 py-2 font-medium">Nameštaj</td>
                    <td className="px-3 py-2 font-medium" colSpan={owner ? 2 : 1}>
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
                            <td className="px-3 py-2 text-muted" colSpan={3}>
                              {formatPoints(item.points ?? 0)} bod
                            </td>
                          ) : (
                            <td className="px-3 py-2" colSpan={2} />
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
