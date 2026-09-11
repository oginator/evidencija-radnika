import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { getSettings } from "@/lib/reports";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 });
  }
  const settings = await getSettings();
  return NextResponse.json({
    rsdPerPoint: settings.rsdPerPoint,
    workdayHours: settings.workdayHours,
  });
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "owner") {
    return NextResponse.json(
      { error: "Samo vlasnik menja podešavanja." },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    rsdPerPoint?: number;
    ownerPassword?: string;
    operatorPassword?: string;
  } | null;

  if (body?.rsdPerPoint !== undefined) {
    const rsdPerPoint = Number(body.rsdPerPoint);
    if (!Number.isFinite(rsdPerPoint) || rsdPerPoint < 0) {
      return NextResponse.json(
        { error: "Unesite ispravnu vrednost boda." },
        { status: 400 },
      );
    }
    await prisma.settings.upsert({
      where: { id: "default" },
      create: { id: "default", rsdPerPoint, workdayHours: 8 },
      update: { rsdPerPoint },
    });
  }

  if (body?.ownerPassword?.trim()) {
    if (body.ownerPassword.trim().length < 6) {
      return NextResponse.json(
        { error: "Lozinka vlasnika mora imati bar 6 karaktera." },
        { status: 400 },
      );
    }
    await prisma.user.update({
      where: { username: "vlasnik" },
      data: { passwordHash: hashPassword(body.ownerPassword.trim()) },
    });
  }

  if (body?.operatorPassword?.trim()) {
    if (body.operatorPassword.trim().length < 6) {
      return NextResponse.json(
        { error: "Lozinka operatera mora imati bar 6 karaktera." },
        { status: 400 },
      );
    }
    await prisma.user.update({
      where: { username: "operater" },
      data: { passwordHash: hashPassword(body.operatorPassword.trim()) },
    });
  }

  const settings = await getSettings();
  return NextResponse.json({
    ok: true,
    rsdPerPoint: settings.rsdPerPoint,
    workdayHours: settings.workdayHours,
  });
}
