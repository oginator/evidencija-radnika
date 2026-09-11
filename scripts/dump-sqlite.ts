import { writeFileSync } from "fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const data = {
    users: await prisma.user.findMany(),
    workers: await prisma.worker.findMany(),
    furnitureTypes: await prisma.furnitureType.findMany(),
    dailyEntries: await prisma.dailyEntry.findMany(),
    assemblyLines: await prisma.assemblyLine.findMany(),
    collectiveAssemblies: await prisma.collectiveAssembly.findMany(),
    settings: await prisma.settings.findMany(),
  };
  writeFileSync("prisma/sqlite-backup.json", JSON.stringify(data, null, 2));
  console.log(
    [
      `users ${data.users.length}`,
      `workers ${data.workers.length}`,
      `furniture ${data.furnitureTypes.length}`,
      `entries ${data.dailyEntries.length}`,
      `lines ${data.assemblyLines.length}`,
      `collective ${data.collectiveAssemblies.length}`,
      `settings ${data.settings.length}`,
    ].join(", "),
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
