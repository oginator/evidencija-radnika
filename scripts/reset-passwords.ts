import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, username: true, role: true },
  });
  console.log("before", users);

  const ownerHash = hashPassword("vlasnik123");
  const operatorHash = hashPassword("operater123");

  await prisma.user.upsert({
    where: { username: "vlasnik" },
    create: {
      username: "vlasnik",
      passwordHash: ownerHash,
      role: "owner",
    },
    update: { passwordHash: ownerHash, role: "owner" },
  });
  await prisma.user.upsert({
    where: { username: "operater" },
    create: {
      username: "operater",
      passwordHash: operatorHash,
      role: "operator",
    },
    update: { passwordHash: operatorHash, role: "operator" },
  });

  const after = await prisma.user.findMany({
    select: { username: true, role: true },
  });
  console.log("after", after);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
