import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { buildReport } from "@/lib/reports";
import {
  currentPeriod,
  isoDate,
  isIsoDate,
  lastDayOfMonthNum,
  normalizePeriod,
  periodLabel,
  periodRange,
  todayISO,
} from "@/lib/period";

function defaultRangeTo(year: number, month: number, today: string): string {
  const lastDay = lastDayOfMonthNum(year, month);
  const isCurrentMonth =
    year === Number(today.slice(0, 4)) && month === Number(today.slice(5, 7));
  return isCurrentMonth ? today : isoDate(year, month, lastDay);
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 });
  }

  const url = new URL(request.url);
  const today = todayISO();
  const now = currentPeriod(today);
  const rawPeriod = url.searchParams.get("period");
  const period = normalizePeriod(rawPeriod);
  const dateParam = url.searchParams.get("date") || today;
  const year = Number(url.searchParams.get("year") || now.year);
  const month = Number(url.searchParams.get("month") || now.month);

  if (!Number.isInteger(year) || month < 1 || month > 12) {
    return NextResponse.json({ error: "Neispravan mesec." }, { status: 400 });
  }

  const lastDay = lastDayOfMonthNum(year, month);
  const bounds = {
    from: url.searchParams.get("from") || undefined,
    to: url.searchParams.get("to") || undefined,
    date: isIsoDate(dateParam) ? dateParam : undefined,
  };

  if (period === "range" && !bounds.from && !bounds.to && !bounds.date) {
    bounds.from = isoDate(year, month, 1);
    bounds.to = defaultRangeTo(year, month, today);
  }
  if (period === "day" && !bounds.date) {
    bounds.date = defaultRangeTo(year, month, today);
  }

  const rangePeriod =
    rawPeriod === "first" || rawPeriod === "second"
      ? rawPeriod
      : period;
  const range = periodRange(year, month, rangePeriod, bounds);
  const report = await buildReport(year, month, period, range);

  return NextResponse.json({
    year,
    month,
    period,
    date: range.to,
    label: periodLabel(year, month, period, range),
    from: range.from,
    to: range.to,
    lastDay,
    workdayHours: report.workdayHours,
    expectedHours: report.expectedHours,
    weekdayCount: report.weekdayCount,
    daysWithData: report.daysWithData,
    ...(session.role === "owner"
      ? {
          rsdPerPoint: report.rsdPerPoint,
          rows: report.rows,
          collective: report.collective,
        }
      : {
          rows: report.rows.map(
            ({ stimulationRsd: _s, equalShareRsd: _e, ...row }) => row,
          ),
          collective: {
            furnitureQuantity: report.collective.furnitureQuantity,
            workerCount: report.collective.workerCount,
            assemblies: report.collective.assemblies.map(({ name, quantity }) => ({
              name,
              quantity,
            })),
          },
        }),
  });
}
