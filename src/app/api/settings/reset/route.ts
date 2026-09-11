import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resetCollectiveMigration } from "@/lib/collective";

const RESET_PASSWORD = "admin123";

function passwordMatches(value: string) {
  const expected = Buffer.from(RESET_PASSWORD);
  const actual = Buffer.from(value);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "owner") {
    return NextResponse.json(
      { error: "Samo vlasnik može da resetuje podatke." },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    password?: string;
  } | null;

  if (!passwordMatches((body?.password ?? "").trim())) {
    return NextResponse.json({ error: "Pogrešna šifra." }, { status: 403 });
  }

  await prisma.$transaction([
    prisma.assemblyLine.deleteMany(),
    prisma.dailyEntry.deleteMany(),
    prisma.collectiveAssembly.deleteMany(),
  ]);
  resetCollectiveMigration();

  return NextResponse.json({ ok: true });
}
