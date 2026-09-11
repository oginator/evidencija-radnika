import { NextResponse } from "next/server";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeUsername, verifyPassword } from "@/lib/password";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    username?: string;
    password?: string;
  } | null;

  const username = normalizeUsername(body?.username ?? "");
  const password = body?.password ?? "";
  if (!username || !password) {
    return NextResponse.json(
      { error: "Unesite korisničko ime i lozinku." },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json(
      { error: "Pogrešno korisničko ime ili lozinka." },
      { status: 401 },
    );
  }

  const token = createSessionToken(
    user.id,
    user.role === "owner" ? "owner" : "operator",
  );
  const response = NextResponse.json({
    ok: true,
    role: user.role,
    username: user.username,
  });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return response;
}
