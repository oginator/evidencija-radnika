import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isOwnerOnlyPath, readSessionToken, SESSION_COOKIE } from "@/lib/auth";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);

  if (pathname === "/login" || pathname.startsWith("/api/auth/login")) {
    if (session && pathname === "/login") {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/auth/logout")) {
    return NextResponse.next();
  }

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 });
    }
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  if (session.role !== "owner" && isOwnerOnlyPath(pathname, request.method)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Samo vlasnik ima pristup." },
        { status: 403 },
      );
    }
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
