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
    <div className="mx-auto flex min-h-full max-w-5xl flex-col">
      <header className="sticky top-0 z-20 border-b border-line/70 bg-white/90 px-4 py-3 shadow-sm shadow-slate-900/5 backdrop-blur-md relative">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <BrandLogo size="sm" />
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
            className="rounded-full border border-line px-3 py-1.5 text-sm text-muted transition hover:border-brand hover:text-brand"
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
      <main className="flex-1 px-4 py-5 pb-24 sm:pb-8">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white/95 backdrop-blur-md sm:hidden">
        <div
          className={`mx-auto grid max-w-5xl gap-1 px-2 py-2 ${
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
                className={`rounded-xl px-2 py-2 text-center text-xs font-medium transition ${
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
