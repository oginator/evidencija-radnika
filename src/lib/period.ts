import { eachDayOfInterval, getDay, lastDayOfMonth } from "date-fns";

export type PeriodKey = "first" | "second" | "day" | "month";

export const PERIOD_KEYS: PeriodKey[] = ["day", "first", "second", "month"];

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

export function periodRange(
  year: number,
  month: number,
  period: PeriodKey,
  date?: string,
): { from: string; to: string } {
  if (period === "day") {
    const day = date && date.startsWith(`${year}-${pad2(month)}`)
      ? date
      : isoDate(year, month, 1);
    return { from: day, to: day };
  }
  if (period === "first") {
    return { from: isoDate(year, month, 1), to: isoDate(year, month, 15) };
  }
  const last = lastDayOfMonthNum(year, month);
  if (period === "month") {
    return { from: isoDate(year, month, 1), to: isoDate(year, month, last) };
  }
  return { from: isoDate(year, month, 16), to: isoDate(year, month, last) };
}

export function periodLabel(
  year: number,
  month: number,
  period: PeriodKey,
  date?: string,
): string {
  const { from, to } = periodRange(year, month, period, date);
  const monthName = MONTH_NAMES[month - 1];
  const fromDay = Number(from.slice(8));
  const toDay = Number(to.slice(8));
  if (period === "day") {
    return formatDisplayDate(from);
  }
  if (period === "month") {
    return `${monthName} ${year}.`;
  }
  return `${fromDay}.–${toDay}. ${monthName} ${year}.`;
}

export function currentPeriod(date = todayISO()): {
  year: number;
  month: number;
  period: PeriodKey;
} {
  const { year, month } = parseYearMonth(date);
  const day = Number(date.slice(8));
  return { year, month, period: day <= 15 ? "first" : "second" };
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
