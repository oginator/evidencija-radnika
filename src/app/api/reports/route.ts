import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { buildReport } from "@/lib/reports";
import {
  currentPeriod,
  isoDate,
  lastDayOfMonthNum,
  periodLabel,
  periodRange,
  PERIOD_KEYS,
  todayISO,
  type PeriodKey,
} from "@/lib/period";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 });
  }

  const url = new URL(request.url);
  const today = todayISO();
  const now = currentPeriod(today);
  const period = (url.searchParams.get("period") || "day") as PeriodKey;
  const dateParam = url.searchParams.get("date") || today;
  const year = Number(
    url.searchParams.get("year") || (period === "day" ? dateParam.slice(0, 4) : now.year),
  );
  const month = Number(
    url.searchParams.get("month") ||
      (period === "day" ? dateParam.slice(5, 7) : now.month),
  );

  if (!Number.isInteger(year) || month < 1 || month > 12) {
    return NextResponse.json({ error: "Neispravan mesec." }, { status: 400 });
  }
  if (!PERIOD_KEYS.includes(period)) {
    return NextResponse.json({ error: "Neispravan period." }, { status: 400 });
  }

  const lastDay = lastDayOfMonthNum(year, month);
  let date = dateParam;
  if (period === "day") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      date = isoDate(year, month, Math.min(Number(today.slice(8)), lastDay));
    }
    const dayNum = Number(date.slice(8));
    if (date.slice(0, 7) !== `${year}-${String(month).padStart(2, "0")}`) {
      date = isoDate(year, month, Math.min(dayNum, lastDay) || 1);
    }
    if (dayNum < 1 || dayNum > lastDay) {
      date = isoDate(year, month, Math.min(dayNum, lastDay));
    }
  }

  const report = await buildReport(year, month, period, date);
  const range = periodRange(year, month, period, date);
  const owner = session.role === "owner";

  return NextResponse.json({
    year,
    month,
    period,
    date,
    label: periodLabel(year, month, period, date),
    from: range.from,
    to: range.to,
    lastDay,
    workdayHours: report.workdayHours,
    expectedHours: report.expectedHours,
    weekdayCount: report.weekdayCount,
    daysWithData: report.daysWithData,
    ...(owner
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
