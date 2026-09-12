"use client";

import { useEffect, useState } from "react";
import { formatRsd } from "@/lib/format";
import { PageHeader } from "./PageHeader";

export function SettingsScreen() {
  const [rsdPerPoint, setRsdPerPoint] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [operatorPassword, setOperatorPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [resetPassword, setResetPassword] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetPending, setResetPending] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then(async (response) => {
        const data = await response.json();
        if (response.ok) setRsdPerPoint(String(data.rsdPerPoint));
      })
      .catch(() => setError("Podešavanja nisu učitana."));
  }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    setMessage("");
    const response = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rsdPerPoint: Number(rsdPerPoint),
        ownerPassword,
        operatorPassword,
      }),
    });
    const data = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setError(data.error || "Čuvanje nije uspelo.");
      return;
    }
    setOwnerPassword("");
    setOperatorPassword("");
    setMessage("Sačuvano.");
  }

  async function resetData() {
    if (
      !window.confirm(
        "Ovo briše sve sate, proizvode i istoriju. Da li ste sigurni?",
      )
    ) {
      return;
    }
    setResetPending(true);
    setResetError("");
    setResetMessage("");
    const response = await fetch("/api/settings/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: resetPassword }),
    });
    const data = await response.json().catch(() => ({}));
    setResetPending(false);
    if (!response.ok) {
      setResetError(data.error || "Reset nije uspeo.");
      return;
    }
    setResetPassword("");
    setResetMessage("Svi unosi su obrisani.");
  }

  return (
    <div className="space-y-4">
      <form onSubmit={save} className="space-y-4">
        <PageHeader title="Podešavanja" />
        <label className="block rounded-3xl border border-line bg-card p-4 text-sm font-medium shadow-sm shadow-slate-900/5">
          Vrednost jednog boda
          <input
            type="number"
            min={0}
            step={1}
            value={rsdPerPoint}
            onChange={(e) => setRsdPerPoint(e.target.value)}
            className="mt-2 w-full rounded-xl border border-line bg-white px-3 py-3 text-base font-normal"
            required
          />
          <span className="mt-1 block text-xs font-normal text-muted">
            Ukupan iznos = bodovi × {formatRsd(Number(rsdPerPoint) || 0)}.
            Na izveštaju se deli na radnike, pa svako dobije taj deo × %
            mesečne norme sati.
          </span>
        </label>
        <label className="block rounded-3xl border border-line bg-card p-4 text-sm font-medium shadow-sm shadow-slate-900/5">
          Nova lozinka vlasnika
          <input
            type="password"
            value={ownerPassword}
            onChange={(e) => setOwnerPassword(e.target.value)}
            className="mt-2 w-full rounded-xl border border-line bg-white px-3 py-3 text-base font-normal"
            placeholder="Ostavi prazno ako ne menjate"
          />
        </label>
        <label className="block rounded-3xl border border-line bg-card p-4 text-sm font-medium shadow-sm shadow-slate-900/5">
          Nova lozinka operatera
          <input
            type="password"
            value={operatorPassword}
            onChange={(e) => setOperatorPassword(e.target.value)}
            className="mt-2 w-full rounded-xl border border-line bg-white px-3 py-3 text-base font-normal"
            placeholder="Ostavi prazno ako ne menjate"
          />
        </label>
        {error ? <p className="text-sm text-accent">{error}</p> : null}
        {message ? <p className="text-sm text-brand">{message}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-brand py-3 font-medium text-white disabled:opacity-60"
        >
          {pending ? "Čuvam..." : "Sačuvaj"}
        </button>
      </form>

      <section className="rounded-3xl border border-red-200 bg-red-50 p-4">
        <h2 className="text-lg font-semibold text-red-800">Reset podataka</h2>
        <p className="mt-1 text-sm text-red-800/80">
          Briše sve sate, izbačene proizvode i istoriju. Radnici, nameštaj i
          nalozi ostaju.
        </p>
        <label className="mt-3 block text-sm font-medium text-red-900">
          Šifra za reset
          <input
            type="password"
            value={resetPassword}
            onChange={(e) => setResetPassword(e.target.value)}
            className="mt-1 w-full rounded-xl border border-red-200 bg-white px-3 py-3 text-base font-normal"
            placeholder="Unesite šifru"
            autoComplete="off"
          />
        </label>
        {resetError ? <p className="mt-2 text-sm text-accent">{resetError}</p> : null}
        {resetMessage ? (
          <p className="mt-2 text-sm text-brand">{resetMessage}</p>
        ) : null}
        <button
          type="button"
          disabled={resetPending || !resetPassword.trim()}
          onClick={resetData}
          className="mt-3 w-full rounded-xl bg-red-700 py-3 font-medium text-white disabled:opacity-60"
        >
          {resetPending ? "Resetujem..." : "Resetuj sve podatke"}
        </button>
      </section>
    </div>
  );
}
