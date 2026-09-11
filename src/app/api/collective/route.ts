import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { saveCollective } from "@/lib/collective";

function validDate(value: string | null): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    date?: string;
    assemblies?: { furnitureTypeId: string; quantity: number }[];
  } | null;

  const date = body?.date ?? "";
  if (!validDate(date)) {
    return NextResponse.json({ error: "Neispravan datum." }, { status: 400 });
  }

  await saveCollective(date, Array.isArray(body?.assemblies) ? body.assemblies : []);
  return NextResponse.json({ ok: true });
}
