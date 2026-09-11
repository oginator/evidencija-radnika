import { readFileSync, existsSync } from "fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const backupPath = "prisma/sqlite-backup.json";

type Backup = {
  users: { id: string; username: string; passwordHash: string; role: string; createdAt: string }[];
  workers: { id: string; name: string; active: boolean; createdAt: string }[];
  furnitureTypes: {
    id: string;
    name: string;
    pointsPerPiece: number;
    active: boolean;
    createdAt: string;
  }[];
  dailyEntries: {
    id: string;
    workerId: string;
    date: string;
    hoursWorked: number;
    createdAt: string;
    updatedAt: string;
  }[];
  assemblyLines: {
    id: string;
    dailyEntryId: string;
    furnitureTypeId: string;
    quantity: number;
  }[];
  collectiveAssemblies: {
    id: string;
    date: string;
    furnitureTypeId: string;
    quantity: number;
  }[];
  settings: { id: string; rsdPerPoint: number; workdayHours: number }[];
};

async function main() {
  if (!existsSync(backupPath)) {
    console.log("Nema prisma/sqlite-backup.json — nema šta da se vrati.");
    return;
  }
  const data = JSON.parse(readFileSync(backupPath, "utf8")) as Backup;

  if (data.settings.length) {
    await prisma.settings.createMany({ data: data.settings, skipDuplicates: true });
  }
  if (data.users.length) {
    await prisma.user.createMany({
      data: data.users.map((item) => ({
        id: item.id,
        username: item.username,
        passwordHash: item.passwordHash,
        role: item.role,
        createdAt: item.createdAt,
      })),
      skipDuplicates: true,
    });
  }
  if (data.workers.length) {
    await prisma.worker.createMany({
      data: data.workers.map((item) => ({
        id: item.id,
        name: item.name,
        active: item.active,
        createdAt: item.createdAt,
      })),
      skipDuplicates: true,
    });
  }
  if (data.furnitureTypes.length) {
    await prisma.furnitureType.createMany({
      data: data.furnitureTypes.map((item) => ({
        id: item.id,
        name: item.name,
        pointsPerPiece: item.pointsPerPiece,
        active: item.active,
        createdAt: item.createdAt,
      })),
      skipDuplicates: true,
    });
  }
  if (data.dailyEntries.length) {
    await prisma.dailyEntry.createMany({
      data: data.dailyEntries.map((item) => ({
        id: item.id,
        workerId: item.workerId,
        date: item.date,
        hoursWorked: item.hoursWorked,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
      skipDuplicates: true,
    });
  }
  if (data.assemblyLines.length) {
    await prisma.assemblyLine.createMany({
      data: data.assemblyLines,
      skipDuplicates: true,
    });
  }
  if (data.collectiveAssemblies.length) {
    await prisma.collectiveAssembly.createMany({
      data: data.collectiveAssemblies,
      skipDuplicates: true,
    });
  }

  console.log(
    `Vraćeno: ${data.users.length} naloga, ${data.workers.length} radnika, ${data.furnitureTypes.length} nameštaja, ${data.dailyEntries.length} unosa, ${data.collectiveAssemblies.length} kolektiv.`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
