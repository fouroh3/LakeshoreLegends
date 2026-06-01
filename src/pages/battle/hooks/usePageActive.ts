// src/pages/battle/hooks/usePageActive.ts
import { useEffect, useState } from "react";

export function usePageActive() {
  const [active, setActive] = useState(true);

  useEffect(() => {
    const recompute = () => {
      const visible = document.visibilityState === "visible";

      // Ignore window focus entirely.
      // Only pause polling if the tab itself is hidden.
      setActive(visible);
    };

    recompute();

    document.addEventListener("visibilitychange", recompute);

    return () => {
      document.removeEventListener("visibilitychange", recompute);
    };
  }, []);

  return active;
}