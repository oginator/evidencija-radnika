import { prisma } from "./prisma";

export type CollectiveLine = {
  furnitureTypeId: string;
  quantity: number;
};

export type CollectiveDetail = {
  furnitureTypeId: string;
  name: string;
  quantity: number;
  points: number;
};

let migrated = false;

export function resetCollectiveMigration() {
  migrated = false;
}

export async function migrateCollectiveFromWorkers() {
  if (migrated) return;
  const existing = await prisma.collectiveAssembly.count();
  if (existing > 0) {
    migrated = true;
    return;
  }
  const lines = await prisma.assemblyLine.findMany({
    include: { dailyEntry: { select: { date: true } } },
  });
  if (lines.length === 0) {
    migrated = true;
    return;
  }
  const grouped = new Map<string, CollectiveLine & { date: string }>();
  for (const line of lines) {
    const key = `${line.dailyEntry.date}:${line.furnitureTypeId}`;
    const prev = grouped.get(key);
    if (prev) prev.quantity += line.quantity;
    else {
      grouped.set(key, {
        date: line.dailyEntry.date,
        furnitureTypeId: line.furnitureTypeId,
        quantity: line.quantity,
      });
    }
  }
  await prisma.collectiveAssembly.createMany({
    data: [...grouped.values()],
  });
  migrated = true;
}

export function cleanAssemblies(raw: CollectiveLine[]): CollectiveLine[] {
  const merged = new Map<string, number>();
  for (const line of raw) {
    const quantity = Number(line.quantity);
    if (!line.furnitureTypeId || !Number.isFinite(quantity) || quantity <= 0) continue;
    merged.set(
      line.furnitureTypeId,
      (merged.get(line.furnitureTypeId) ?? 0) + quantity,
    );
  }
  return [...merged.entries()].map(([furnitureTypeId, quantity]) => ({
    furnitureTypeId,
    quantity,
  }));
}

export async function saveCollective(date: string, assemblies: CollectiveLine[]) {
  const lines = cleanAssemblies(assemblies);
  await prisma.collectiveAssembly.deleteMany({ where: { date } });
  if (lines.length > 0) {
    await prisma.collectiveAssembly.createMany({
      data: lines.map((line) => ({
        date,
        furnitureTypeId: line.furnitureTypeId,
        quantity: line.quantity,
      })),
    });
  }
}

export function summarizeCollective(
  lines: {
    furnitureTypeId: string;
    quantity: number;
    furnitureType: { name: string; pointsPerPiece: number };
  }[],
  rsdPerPoint: number,
) {
  const merged = new Map<string, CollectiveDetail>();
  for (const line of lines) {
    const points = line.quantity * line.furnitureType.pointsPerPiece;
    const prev = merged.get(line.furnitureTypeId);
    if (prev) {
      prev.quantity += line.quantity;
      prev.points += points;
    } else {
      merged.set(line.furnitureTypeId, {
        furnitureTypeId: line.furnitureTypeId,
        name: line.furnitureType.name,
        quantity: line.quantity,
        points,
      });
    }
  }
  const assemblies = [...merged.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "sr"),
  );
  const furniturePoints = assemblies.reduce((sum, line) => sum + line.points, 0);
  const furnitureQuantity = assemblies.reduce((sum, line) => sum + line.quantity, 0);
  return {
    assemblies,
    furnitureQuantity,
    furniturePoints,
    stimulationRsd: furniturePoints * rsdPerPoint,
  };
}
