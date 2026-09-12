import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 });
  }

  const furniture = await prisma.furnitureType.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });
  if (session.role !== "owner") {
    return NextResponse.json({
      furniture: furniture.map(({ pointsPerPiece: _points, ...item }) => item),
    });
  }
  return NextResponse.json({ furniture });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    name?: string;
    pointsPerPiece?: number;
  } | null;
  const name = body?.name?.trim() ?? "";
  const pointsPerPiece = Number(body?.pointsPerPiece);
  if (!name) {
    return NextResponse.json({ error: "Unesite naziv nameštaja." }, { status: 400 });
  }
  if (!Number.isFinite(pointsPerPiece) || pointsPerPiece < 0) {
    return NextResponse.json({ error: "Unesite ispravne bodove." }, { status: 400 });
  }

  const item = await prisma.furnitureType.create({
    data: { name, pointsPerPiece, active: true },
  });
  return NextResponse.json({ furniture: item });
}
