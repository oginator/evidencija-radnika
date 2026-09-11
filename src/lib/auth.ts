import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

export const SESSION_COOKIE = "evidencija_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 180;

export type Role = "owner" | "operator";

export type SessionUser = {
  id: string;
  username: string;
  role: Role;
};

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}

function authSecret() {
  const secret = process.env.AUTH_SECRET;
  if (process.env.NODE_ENV === "production" && (!secret || secret === "evidencija-dev-secret")) {
    throw new Error("AUTH_SECRET mora biti podešen u produkciji.");
  }
  return secret || "evidencija-dev-secret";
}

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

export function createSessionToken(userId: string, role: Role): string {
  const payload = `${userId}:${role}:${Date.now()}`;
  return `${payload}.${sign(payload, authSecret())}`;
}

export function readSessionToken(
  token: string | undefined,
): { userId: string; role: Role } | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  const expected = sign(payload, authSecret());
  if (!safeEqual(signature, expected)) return null;
  const [userId, role] = payload.split(":");
  if (!userId || (role !== "owner" && role !== "operator")) return null;
  return { userId, role };
}

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const parsed = readSessionToken(jar.get(SESSION_COOKIE)?.value);
  if (!parsed) return null;
  const user = await prisma.user.findUnique({ where: { id: parsed.userId } });
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    role: user.role as Role,
  };
}

export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    throw new Response(JSON.stringify({ error: "Niste prijavljeni." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return session;
}

export async function requireOwner(): Promise<SessionUser> {
  const session = await requireSession();
  if (session.role !== "owner") {
    throw new Response(JSON.stringify({ error: "Samo vlasnik ima pristup." }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  return session;
}

export function isOwnerOnlyPath(pathname: string, method = "GET"): boolean {
  const ownerPages = ["/istorija", "/podesavanja"];
  if (ownerPages.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return true;
  }
  if (pathname.startsWith("/api/reports/history")) return true;
  if (pathname.startsWith("/api/settings") && method !== "GET") return true;
  return false;
}
