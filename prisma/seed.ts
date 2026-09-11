import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

async function main() {
  await prisma.settings.upsert({
    where: { id: "default" },
    create: { id: "default", rsdPerPoint: 100, workdayHours: 8 },
    update: {},
  });

  const existing = await prisma.user.count();
  if (existing > 0) return;

  await prisma.user.createMany({
    data: [
      {
        username: "vlasnik",
        passwordHash: hashPassword("vlasnik123"),
        role: "owner",
      },
      {
        username: "operater",
        passwordHash: hashPassword("operater123"),
        role: "operator",
      },
    ],
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
