export function hpStatus(current: number, base: number) {
  const safeBase = Math.max(1, base || 1);
  const pct = Math.max(0, Math.min(1, current / safeBase));

  if (current <= 0) {
    return {
      label: "Dead",
      pillClass: "bg-zinc-800 text-zinc-200 border border-zinc-700",
    };
  }

  if (pct < 0.4) {
    return {
      label: "Critical",
      pillClass: "bg-red-950/50 text-red-200 border border-red-900/50",
    };
  }

  if (pct < 0.7) {
    return {
      label: "Wounded",
      pillClass: "bg-amber-950/40 text-amber-200 border border-amber-900/50",
    };
  }

  return {
    label: "Healthy",
    pillClass:
      "bg-emerald-950/40 text-emerald-200 border border-emerald-900/50",
  };
}
