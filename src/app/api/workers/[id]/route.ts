import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as {
    name?: string;
    active?: boolean;
  } | null;

  const data: { name?: string; active?: boolean } = {};
  if (typeof body?.name === "string") {
    const name = body.name.trim();
    if (!name) {
      return NextResponse.json({ error: "Ime ne može biti prazno." }, { status: 400 });
    }
    data.name = name;
  }
  if (typeof body?.active === "boolean") data.active = body.active;

  const worker = await prisma.worker.update({ where: { id }, data });
  return NextResponse.json({ worker });
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 });
  }

  const { id } = await params;
  const used = await prisma.dailyEntry.count({ where: { workerId: id } });
  if (used > 0) {
    await prisma.worker.update({
      where: { id },
      data: { active: false },
    });
  } else {
    await prisma.worker.delete({ where: { id } });
  }
  return NextResponse.json({ ok: true });
}
