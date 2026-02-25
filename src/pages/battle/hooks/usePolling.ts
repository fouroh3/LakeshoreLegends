// src/pages/battle/hooks/usePolling.ts
import { useEffect, useRef } from "react";

export function usePolling(
  enabled: boolean,
  intervalMs: number,
  fn: () => Promise<void>,
  jitterMs = 0
) {
  const running = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    let t: number | undefined;

    const tick = async () => {
      if (running.current) return;
      running.current = true;
      try {
        await fn();
      } catch {
        // ignore
      } finally {
        running.current = false;
        const jitter = jitterMs ? Math.floor(Math.random() * jitterMs) : 0;
        t = window.setTimeout(tick, intervalMs + jitter);
      }
    };

    tick();
    return () => {
      if (t) window.clearTimeout(t);
    };
  }, [enabled, intervalMs, jitterMs, fn]);
}
