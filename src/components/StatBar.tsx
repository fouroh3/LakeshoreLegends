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
    <div className="w-full">
      <div className="mb-1 flex items-center justify-between">
        <span className="flex items-center gap-1 text-[11px] text-zinc-400">
          {icon}
          {label}
        </span>
        <span className="text-[11px] font-medium text-zinc-300">
          {Number.isFinite(num) ? Math.round(clamped) : 0}
        </span>
      </div>

      {/* outer shell */}
      <div className="rounded-full border border-zinc-800 bg-zinc-950/80 p-[2px] shadow-[inset_0_0_8px_rgba(0,0,0,0.55)]">
        {/* track */}
        <div
          className={`w-full overflow-hidden rounded-full bg-zinc-900/70 ${trackHeight}`}
        >
          {/* fill */}
          <div
            className={`rounded-full transition-[width] duration-300 ${trackHeight}`}
            style={{
              width: `${Math.round(pct * 100)}%`,
              background: statFillColor(pct),
              boxShadow:
                pct > 0
                  ? "0 0 10px rgba(34,211,238,0.18), 0 0 6px rgba(132,204,22,0.10)"
                  : "none",
            }}
          />
        </div>
      </div>
    </div>
  );
}
