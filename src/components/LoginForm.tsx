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
      className="w-full max-w-sm rounded-2xl border border-line bg-card p-6 shadow-sm"
    >
      <h1 className="text-2xl font-semibold tracking-tight text-brand">
        Evidencija radnika
      </h1>
      <p className="mt-1 text-sm text-muted">
        Unesite nalog vlasnika ili operatera.
      </p>
      <label className="mt-6 block text-sm font-medium">
        Korisničko ime
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2.5"
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
          className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2.5"
          autoComplete="current-password"
          required
        />
      </label>
      {error ? <p className="mt-3 text-sm text-accent">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="mt-6 w-full rounded-xl bg-brand py-3 font-medium text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {pending ? "Prijava..." : "Prijavi se"}
      </button>
      <p className="mt-4 text-xs leading-5 text-muted">
        Demo nalozi: <strong>vlasnik / vlasnik123</strong> i{" "}
        <strong>operater / operater123</strong>
      </p>
    </form>
  );
}
