"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setError(data.error || "Prijava nije uspela.");
      return;
    }
    router.push(searchParams.get("next") || "/");
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-full rounded-3xl border border-line/80 bg-white p-5 shadow-xl shadow-slate-900/10 sm:p-7"
    >
      <h1 className="text-center text-2xl font-semibold tracking-tight text-foreground">
        Evidencija radnika
      </h1>
      <p className="mt-1 text-center text-sm text-muted">
        Prijava za vlasnika ili operatera.
      </p>
      <label className="mt-7 block text-sm font-medium">
        Korisničko ime
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="mt-1.5 w-full rounded-2xl border border-line bg-background px-3.5 py-3"
          autoComplete="username"
          required
        />
      </label>
      <label className="mt-4 block text-sm font-medium">
        Lozinka
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1.5 w-full rounded-2xl border border-line bg-background px-3.5 py-3"
          autoComplete="current-password"
          required
        />
      </label>
      {error ? <p className="mt-3 text-sm text-accent">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="mt-6 w-full rounded-2xl bg-brand py-3.5 font-medium text-white shadow-sm shadow-brand/30 transition hover:bg-brand-dark disabled:opacity-60"
      >
        {pending ? "Prijava..." : "Prijavi se"}
      </button>
    </form>
  );
}
