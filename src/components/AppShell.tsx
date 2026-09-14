"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { SessionUser } from "@/lib/auth";
import { BrandLogo } from "./BrandLogo";

const NAV = [
  { href: "/", label: "Danas", ownerOnly: false },
  { href: "/izvestaj", label: "Izveštaj", ownerOnly: false },
  { href: "/radnici", label: "Radnici", ownerOnly: false },
  { href: "/namestaj", label: "Nameštaj", ownerOnly: false },
  { href: "/istorija", label: "Istorija", ownerOnly: true },
  { href: "/podesavanja", label: "Podešavanja", ownerOnly: true },
];

export function AppShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const items = NAV.filter((item) => !item.ownerOnly || user.role === "owner");

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="mx-auto flex h-dvh max-h-dvh w-full max-w-5xl flex-col overflow-hidden">
      <header className="relative shrink-0 border-b border-line/70 bg-white/95 px-3 py-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] shadow-sm shadow-slate-900/5 backdrop-blur-md sm:px-4 sm:py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <div className="shrink-0">
              <BrandLogo size="sm" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight text-foreground">
                Evidencija radnika
              </p>
              <p className="truncate text-xs text-muted">
                {user.role === "owner" ? "Vlasnik" : "Operater"} · {user.username}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="shrink-0 rounded-full border border-line px-3 py-1.5 text-sm text-muted transition hover:border-brand hover:text-brand"
          >
            Odjava
          </button>
        </div>
        <nav className="mt-3 hidden gap-1 overflow-x-auto sm:flex">
          {items.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-3.5 py-1.5 text-sm whitespace-nowrap transition ${
                  active
                    ? "bg-brand text-white shadow-sm shadow-brand/30"
                    : "text-muted hover:bg-background hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-linear-to-r from-[#066a96] via-[#0a8ec8] to-[#7dcef0]" />
      </header>
      <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain px-3 py-4 sm:px-4 sm:py-5">
        {children}
      </main>
      <nav className="shrink-0 border-t border-line bg-white/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:hidden">
        <div
          className={`mx-auto grid max-w-5xl gap-1 px-2 pt-2 ${
            user.role === "owner" ? "grid-cols-3" : "grid-cols-4"
          }`}
        >
          {items.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-xl px-1 py-2 text-center text-[11px] font-medium transition ${
                  active ? "bg-brand text-white" : "text-muted"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
