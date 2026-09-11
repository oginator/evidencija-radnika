import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { buildHistory } from "@/lib/reports";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "owner") {
    return NextResponse.json(
      { error: "Samo vlasnik vidi istoriju." },
      { status: 403 },
    );
  }

  const months = await buildHistory();
  return NextResponse.json({ months });
}
