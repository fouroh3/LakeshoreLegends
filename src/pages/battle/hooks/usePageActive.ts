// src/pages/battle/hooks/usePageActive.ts
import { useEffect, useState } from "react";

export function usePageActive() {
  const [active, setActive] = useState(() => {
    const visible = document.visibilityState === "visible";
    const focused =
      typeof document.hasFocus === "function" ? document.hasFocus() : true;
    return visible && focused;
  });

  useEffect(() => {
    const recompute = () => {
      const visible = document.visibilityState === "visible";
      const focused =
        typeof document.hasFocus === "function" ? document.hasFocus() : true;
      setActive(visible && focused);
    };

    recompute();
    window.addEventListener("focus", recompute);
    window.addEventListener("blur", recompute);
    document.addEventListener("visibilitychange", recompute);

    return () => {
      window.removeEventListener("focus", recompute);
      window.removeEventListener("blur", recompute);
      document.removeEventListener("visibilitychange", recompute);
    };
  }, []);

  return active;
}
