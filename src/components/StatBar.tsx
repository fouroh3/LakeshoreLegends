// src/components/StatBar.tsx

import React from "react";

export type Density = "comfortable" | "compact" | "ultra";

type Props = {
  label: string;
  value?: number | string | null;
  icon?: React.ReactNode;
  maxValue?: number;
  density?: Density;
  className?: string;
};

function statFillColor(pct: number) {
  if (pct <= 0.2) return "linear-gradient(90deg, #0ea5e9 0%, #06b6d4 100%)";
  if (pct <= 0.5) return "linear-gradient(90deg, #06b6d4 0%, #22d3ee 100%)";
  if (pct <= 0.8) return "linear-gradient(90deg, #22c55e 0%, #84cc16 100%)";
  return "linear-gradient(90deg, #84cc16 0%, #eab308 100%)";
}

export default function StatBar({
  label,
  value,
  icon,
  maxValue = 10,
  density = "comfortable",
  className,
}: Props) {
  const num = typeof value === "string" ? parseFloat(value) : (value as number);
  const raw = Number.isFinite(num) ? num : 0;
  const clamped = Math.max(0, Math.min(maxValue, raw));
  const pct = clamped / maxValue;

  const trackHeight =
    className ??
    (density === "ultra" ? "h-2" : density === "compact" ? "h-2.5" : "h-3");

  return (
    <div className="ll-stat-bar w-full">
      <div className="mb-1 flex items-center justify-between">
        <span className="flex items-center gap-1 text-[11px] text-zinc-400">
          {icon}
          {label}
        </span>
        <span className="text-[11px] font-medium text-zinc-300">
          {Number.isFinite(num) ? Math.round(clamped) : 0}
        </span>
      </div>

      <div className="ll-stat-bar-shell rounded-full border border-zinc-800 bg-zinc-950/80 p-[2px] shadow-[inset_0_0_8px_rgba(0,0,0,0.55)]">
        <div
          className={`ll-stat-bar-track w-full overflow-hidden rounded-full bg-zinc-900/70 ${trackHeight}`}
        >
          <div
            className={`ll-stat-bar-fill rounded-full transition-[width] duration-300 ${trackHeight}`}
            style={{
              width: `${Math.round(pct * 100)}%`,
              background: statFillColor(pct),
            }}
          />
        </div>
      </div>
    </div>
  );
}
