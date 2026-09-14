import { eachDayOfInterval, getDay, lastDayOfMonth } from "date-fns";

export type PeriodKey = "range" | "month";

export const PERIOD_KEYS: PeriodKey[] = ["range", "month"];

export const BELGRADE_TZ = "Europe/Belgrade";
export const MONTH_NAMES = [
  "januar",
  "februar",
  "mart",
  "april",
  "maj",
  "jun",
  "jul",
  "avgust",
  "septembar",
  "oktobar",
  "novembar",
  "decembar",
];

export function todayISO(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: BELGRADE_TZ }).format(
    now,
  );
}

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function isoDate(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

export function parseYearMonth(date: string): { year: number; month: number } {
  const [year, month] = date.split("-").map(Number);
  return { year, month };
}

export function lastDayOfMonthNum(year: number, month: number): number {
  return lastDayOfMonth(new Date(year, month - 1, 1)).getDate();
}

export function isIsoDate(value?: string | null): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function normalizePeriod(period?: string | null): PeriodKey {
  return period === "month" ? "month" : "range";
}

export function periodRange(
  year: number,
  month: number,
  period: PeriodKey | "day" | "first" | "second",
  bounds?: { from?: string; to?: string; date?: string },
): { from: string; to: string } {
  const last = lastDayOfMonthNum(year, month);
  if (period === "month") {
    return { from: isoDate(year, month, 1), to: isoDate(year, month, last) };
  }
  if (period === "first") {
    return { from: isoDate(year, month, 1), to: isoDate(year, month, 15) };
  }
  if (period === "second") {
    return { from: isoDate(year, month, 16), to: isoDate(year, month, last) };
  }
  if (period === "day" && isIsoDate(bounds?.date)) {
    return { from: bounds.date, to: bounds.date };
  }
  let from = isIsoDate(bounds?.from)
    ? bounds.from
    : isIsoDate(bounds?.date)
      ? bounds.date
      : isoDate(year, month, 1);
  let to = isIsoDate(bounds?.to)
    ? bounds.to
    : isIsoDate(bounds?.date)
      ? bounds.date
      : isoDate(year, month, last);
  if (from > to) {
    const swap = from;
    from = to;
    to = swap;
  }
  return { from, to };
}

export function periodLabel(
  year: number,
  month: number,
  period: PeriodKey,
  bounds?: { from?: string; to?: string; date?: string },
): string {
  const { from, to } = periodRange(year, month, period, bounds);
  const monthName = MONTH_NAMES[month - 1];
  if (period === "month") {
    return `${monthName} ${year}.`;
  }
  if (from === to) {
    return formatDisplayDate(from);
  }
  return `${formatDisplayDate(from)} – ${formatDisplayDate(to)}`;
}

export function currentPeriod(date = todayISO()): {
  year: number;
  month: number;
  period: PeriodKey;
} {
  const { year, month } = parseYearMonth(date);
  return { year, month, period: "range" };
}

export function weekdayCount(year: number, month: number): number {
  const start = new Date(year, month - 1, 1);
  const end = lastDayOfMonth(start);
  return eachDayOfInterval({ start, end }).filter((d) => {
    const day = getDay(d);
    return day !== 0 && day !== 6;
  }).length;
}

export function expectedHours(
  year: number,
  month: number,
  workdayHours: number,
): number {
  return weekdayCount(year, month) * workdayHours;
}

export function weekdayCountInRange(from: string, to: string): number {
  const start = new Date(
    Number(from.slice(0, 4)),
    Number(from.slice(5, 7)) - 1,
    Number(from.slice(8)),
  );
  const end = new Date(
    Number(to.slice(0, 4)),
    Number(to.slice(5, 7)) - 1,
    Number(to.slice(8)),
  );
  if (end < start) return 0;
  return eachDayOfInterval({ start, end }).filter((d) => {
    const day = getDay(d);
    return day !== 0 && day !== 6;
  }).length;
}

export function shiftDate(date: string, days: number): string {
  const { year, month } = parseYearMonth(date);
  const day = Number(date.slice(8));
  const next = new Date(year, month - 1, day + days);
  return isoDate(next.getFullYear(), next.getMonth() + 1, next.getDate());
}

export function formatDisplayDate(date: string): string {
  const { year, month } = parseYearMonth(date);
  const day = Number(date.slice(8));
  return `${day}. ${MONTH_NAMES[month - 1]} ${year}.`;
}

export function isLastDayOfMonth(date: string): boolean {
  const { year, month } = parseYearMonth(date);
  return Number(date.slice(8)) === lastDayOfMonthNum(year, month);
}

export function monthBounds(date: string): { from: string; to: string } {
  const { year, month } = parseYearMonth(date);
  return {
    from: isoDate(year, month, 1),
    to: isoDate(year, month, lastDayOfMonthNum(year, month)),
  };
}

export function parseMonthKey(value: string): { year: number; month: number } {
  const [year, month] = value.split("-").map(Number);
  return { year, month };
}
