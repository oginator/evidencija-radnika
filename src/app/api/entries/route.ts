import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/reports";
import { monthBounds, todayISO } from "@/lib/period";
import {
  migrateCollectiveFromWorkers,
  summarizeCollective,
} from "@/lib/collective";

function validDate(value: string | null): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 });
  }

  const url = new URL(request.url);
  const date = url.searchParams.get("date") || todayISO();
  if (!validDate(date)) {
    return NextResponse.json({ error: "Neispravan datum." }, { status: 400 });
  }

  await migrateCollectiveFromWorkers();
  const { from: monthFrom, to: monthTo } = monthBounds(date);
  const [
    workers,
    furniture,
    entries,
    monthEntries,
    collectiveLines,
    monthCollective,
    settings,
  ] = await Promise.all([
    prisma.worker.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    }),
    prisma.furnitureType.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    }),
    prisma.dailyEntry.findMany({ where: { date } }),
    prisma.dailyEntry.findMany({
      where: { date: { gte: monthFrom, lte: monthTo } },
      select: { workerId: true, date: true, hoursWorked: true },
    }),
    prisma.collectiveAssembly.findMany({
      where: { date },
      include: { furnitureType: true },
    }),
    prisma.collectiveAssembly.findMany({
      where: { date: { gte: monthFrom, lte: monthTo } },
      select: { quantity: true },
    }),
    getSettings(),
  ]);

  const monthHoursOther: Record<string, number> = {};
  for (const entry of monthEntries) {
    if (entry.date === date) continue;
    monthHoursOther[entry.workerId] =
      (monthHoursOther[entry.workerId] ?? 0) + entry.hoursWorked;
  }

  const monthFurnitureQuantity = monthCollective.reduce(
    (sum, line) => sum + line.quantity,
    0,
  );
  const owner = session.role === "owner";
  const collective = summarizeCollective(collectiveLines, settings.rsdPerPoint);

  return NextResponse.json({
    date,
    workers,
    furniture: owner
      ? furniture
      : furniture.map(({ pointsPerPiece: _points, ...item }) => item),
    ...(owner ? { rsdPerPoint: settings.rsdPerPoint } : {}),
    monthHoursOther,
    monthFurnitureQuantity,
    collective: owner
      ? collective
      : {
          assemblies: collective.assemblies.map(({ name, quantity, furnitureTypeId }) => ({
            furnitureTypeId,
            name,
            quantity,
          })),
          furnitureQuantity: collective.furnitureQuantity,
        },
    entries: entries.map((entry) => ({
      workerId: entry.workerId,
      hoursWorked: entry.hoursWorked,
    })),
  });
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    date?: string;
    workerId?: string;
    hoursWorked?: number;
  } | null;

  const date = body?.date ?? "";
  const workerId = body?.workerId ?? "";
  const hoursWorked = Number(body?.hoursWorked);

  if (!validDate(date)) {
    return NextResponse.json({ error: "Neispravan datum." }, { status: 400 });
  }
  if (!workerId) {
    return NextResponse.json({ error: "Nedostaje radnik." }, { status: 400 });
  }
  if (!Number.isFinite(hoursWorked) || hoursWorked < 0 || hoursWorked > 400) {
    return NextResponse.json(
      { error: "Sati moraju biti između 0 i 400." },
      { status: 400 },
    );
  }

  const worker = await prisma.worker.findUnique({ where: { id: workerId } });
  if (!worker || !worker.active) {
    return NextResponse.json({ error: "Radnik nije aktivan." }, { status: 400 });
  }

  if (hoursWorked === 0) {
    await prisma.dailyEntry.deleteMany({ where: { workerId, date } });
    return NextResponse.json({ ok: true, deleted: true });
  }

  await prisma.dailyEntry.upsert({
    where: { workerId_date: { workerId, date } },
    create: { workerId, date, hoursWorked },
    update: { hoursWorked },
  });

  return NextResponse.json({ ok: true });
}
