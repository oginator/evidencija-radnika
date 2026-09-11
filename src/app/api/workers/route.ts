import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 });
  }

  const workers = await prisma.worker.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ workers });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { name?: string } | null;
  const name = body?.name?.trim() ?? "";
  if (!name) {
    return NextResponse.json({ error: "Unesite ime radnika." }, { status: 400 });
  }

  const worker = await prisma.worker.create({ data: { name, active: true } });
  return NextResponse.json({ worker });
}
