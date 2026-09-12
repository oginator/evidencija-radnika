import { prisma } from "./prisma";
import { expectedHours, periodRange, type PeriodKey } from "./period";
import { migrateCollectiveFromWorkers, summarizeCollective } from "./collective";

export type AssemblyDetail = {
  name: string;
  quantity: number;
  points: number;
};

export type ReportRow = {
  workerId: string;
  workerName: string;
  active: boolean;
  hours: number;
  monthHours: number;
  expectedHours: number;
  hoursPercent: number;
  monthHoursPercent: number;
  equalShareRsd: number;
  stimulationRsd: number;
};

export type CollectiveSummary = {
  assemblies: AssemblyDetail[];
  furnitureQuantity: number;
  furniturePoints: number;
  stimulationRsd: number;
  workerCount: number;
  equalShareRsd: number;
  paidStimulationRsd: number;
};

export function workerCollectiveBonus(
  totalRsd: number,
  workerCount: number,
  monthHours: number,
  monthExpectedHours: number,
) {
  const equalShareRsd = workerCount > 0 ? totalRsd / workerCount : 0;
  const monthHoursPercent =
    monthExpectedHours > 0 ? (monthHours / monthExpectedHours) * 100 : 0;
  return {
    equalShareRsd,
    monthHoursPercent,
    stimulationRsd: equalShareRsd * (monthHoursPercent / 100),
  };
}

export async function getSettings() {
  const existing = await prisma.settings.findUnique({ where: { id: "default" } });
  if (existing) return existing;
  return prisma.settings.create({
    data: { id: "default", rsdPerPoint: 100, workdayHours: 8 },
  });
}

export async function buildReport(
  year: number,
  month: number,
  period: PeriodKey,
  date?: string,
): Promise<{
  rows: ReportRow[];
  collective: CollectiveSummary;
  rsdPerPoint: number;
  workdayHours: number;
  expectedHours: number;
  weekdayCount: number;
  daysWithData: string[];
}> {
  await migrateCollectiveFromWorkers();
  const settings = await getSettings();
  const { from, to } = periodRange(year, month, period, date);
  const monthFrom = `${year}-${String(month).padStart(2, "0")}-01`;
  const monthTo = periodRange(year, month, "second").to;
  const monthExpected = expectedHours(year, month, settings.workdayHours);
  const expected = monthExpected;
  const isDay = period === "day";

  const [entries, collectiveLines] = await Promise.all([
    prisma.dailyEntry.findMany({
      where: { date: { gte: monthFrom, lte: monthTo } },
      include: { worker: true },
    }),
    prisma.collectiveAssembly.findMany({
      where: { date: { gte: from, lte: to } },
      include: { furnitureType: true },
    }),
  ]);

  const byWorker = new Map<
    string,
    {
      workerId: string;
      workerName: string;
      active: boolean;
      hours: number;
      monthHours: number;
    }
  >();

  for (const entry of entries) {
    let row = byWorker.get(entry.workerId);
    if (!row) {
      row = {
        workerId: entry.workerId,
        workerName: entry.worker.name,
        active: entry.worker.active,
        hours: 0,
        monthHours: 0,
      };
      byWorker.set(entry.workerId, row);
    }
    row.monthHours += entry.hoursWorked;
    if (entry.date >= from && entry.date <= to) {
      row.hours += entry.hoursWorked;
    }
  }

  const activeWorkers = await prisma.worker.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });
  for (const worker of activeWorkers) {
    if (!byWorker.has(worker.id)) {
      byWorker.set(worker.id, {
        workerId: worker.id,
        workerName: worker.name,
        active: true,
        hours: 0,
        monthHours: 0,
      });
    }
  }

  const workerCount = [...byWorker.values()].filter((row) => row.active).length;
  const collective = summarizeCollective(collectiveLines, settings.rsdPerPoint);
  const equalShareRsd =
    workerCount > 0 ? collective.stimulationRsd / workerCount : 0;

  const rows: ReportRow[] = [...byWorker.values()]
    .map((row) => {
      const percentBase = isDay ? settings.workdayHours : expected;
      const percentHours = isDay ? row.hours : row.monthHours;
      const bonus = workerCollectiveBonus(
        collective.stimulationRsd,
        workerCount,
        row.monthHours,
        monthExpected,
      );
      return {
        ...row,
        expectedHours: isDay ? settings.workdayHours : expected,
        hoursPercent: percentBase > 0 ? (percentHours / percentBase) * 100 : 0,
        monthHoursPercent: bonus.monthHoursPercent,
        equalShareRsd: bonus.equalShareRsd,
        stimulationRsd: row.active ? bonus.stimulationRsd : 0,
      };
    })
    .sort((a, b) => a.workerName.localeCompare(b.workerName, "sr"));
  const allCollectiveDates = await prisma.collectiveAssembly.findMany({
    where: { date: { gte: monthFrom, lte: monthTo } },
    select: { date: true },
  });

  return {
    rows,
    collective: {
      assemblies: collective.assemblies,
      furnitureQuantity: collective.furnitureQuantity,
      furniturePoints: collective.furniturePoints,
      stimulationRsd: collective.stimulationRsd,
      workerCount,
      equalShareRsd,
      paidStimulationRsd: rows.reduce((sum, row) => sum + row.stimulationRsd, 0),
    },
    rsdPerPoint: settings.rsdPerPoint,
    workdayHours: settings.workdayHours,
    expectedHours: isDay ? settings.workdayHours : expected,
    weekdayCount: expected / settings.workdayHours,
    daysWithData: [
      ...new Set([
        ...entries.map((entry) => entry.date),
        ...allCollectiveDates.map((line) => line.date),
      ]),
    ].sort(),
  };
}

export async function buildHistory() {
  await migrateCollectiveFromWorkers();
  const settings = await getSettings();
  const [entries, collectiveLines] = await Promise.all([
    prisma.dailyEntry.findMany({ orderBy: { date: "asc" } }),
    prisma.collectiveAssembly.findMany({
      include: { furnitureType: true },
    }),
  ]);

  const months = new Map<
    string,
    {
      year: number;
      month: number;
      hours: number;
      furniturePoints: number;
      workerIds: Set<string>;
    }
  >();

  for (const entry of entries) {
    const year = Number(entry.date.slice(0, 4));
    const month = Number(entry.date.slice(5, 7));
    const key = `${year}-${String(month).padStart(2, "0")}`;
    let bucket = months.get(key);
    if (!bucket) {
      bucket = { year, month, hours: 0, furniturePoints: 0, workerIds: new Set() };
      months.set(key, bucket);
    }
    bucket.hours += entry.hoursWorked;
    bucket.workerIds.add(entry.workerId);
  }

  for (const line of collectiveLines) {
    const year = Number(line.date.slice(0, 4));
    const month = Number(line.date.slice(5, 7));
    const key = `${year}-${String(month).padStart(2, "0")}`;
    let bucket = months.get(key);
    if (!bucket) {
      bucket = { year, month, hours: 0, furniturePoints: 0, workerIds: new Set() };
      months.set(key, bucket);
    }
    bucket.furniturePoints += line.quantity * line.furnitureType.pointsPerPiece;
  }

  return [...months.values()]
    .sort((a, b) => a.year - b.year || a.month - b.month)
    .map((m) => {
      const perPerson = expectedHours(m.year, m.month, settings.workdayHours);
      const expected = perPerson * Math.max(1, m.workerIds.size);
      return {
        year: m.year,
        month: m.month,
        hours: m.hours,
        furniturePoints: m.furniturePoints,
        totalPoints: m.furniturePoints,
        stimulationRsd: m.furniturePoints * settings.rsdPerPoint,
        expectedHours: expected,
        hoursPercent: expected > 0 ? (m.hours / expected) * 100 : 0,
      };
    });
}
