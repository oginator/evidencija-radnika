"use client";

import { useEffect, useRef } from "react";

const DEFAULT_INTERVAL_MS = 5000;

export function useAutoRefresh(
  refresh: () => void | Promise<void>,
  options?: { intervalMs?: number; enabled?: boolean },
) {
  const intervalMs = options?.intervalMs ?? DEFAULT_INTERVAL_MS;
  const enabled = options?.enabled ?? true;
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let inFlight = false;

    async function run() {
      if (cancelled || inFlight) return;
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }
      inFlight = true;
      try {
        await refreshRef.current();
      } finally {
        inFlight = false;
      }
    }

    function onVisible() {
      if (document.visibilityState === "visible") void run();
    }

    const id = window.setInterval(() => void run(), intervalMs);
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(id);
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, intervalMs]);
}
