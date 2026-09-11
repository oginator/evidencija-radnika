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
    pointsPerPiece?: number;
    active?: boolean;
  } | null;

  const data: { name?: string; pointsPerPiece?: number; active?: boolean } = {};
  if (typeof body?.name === "string") {
    const name = body.name.trim();
    if (!name) {
      return NextResponse.json({ error: "Naziv ne može biti prazan." }, { status: 400 });
    }
    data.name = name;
  }
  if (body?.pointsPerPiece !== undefined) {
    const points = Number(body.pointsPerPiece);
    if (!Number.isFinite(points) || points < 0) {
      return NextResponse.json({ error: "Unesite ispravne bodove." }, { status: 400 });
    }
    data.pointsPerPiece = points;
  }
  if (typeof body?.active === "boolean") data.active = body.active;

  const item = await prisma.furnitureType.update({ where: { id }, data });
  return NextResponse.json({ furniture: item });
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 });
  }

  const { id } = await params;
  const used =
    (await prisma.assemblyLine.count({ where: { furnitureTypeId: id } })) +
    (await prisma.collectiveAssembly.count({ where: { furnitureTypeId: id } }));
  if (used > 0) {
    await prisma.furnitureType.update({
      where: { id },
      data: { active: false },
    });
  } else {
    await prisma.furnitureType.delete({ where: { id } });
  }
  return NextResponse.json({ ok: true });
}
