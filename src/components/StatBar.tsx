import React from "react";

export type Density = "comfortable" | "compact" | "ultra";

type Props = {
  label: string;
  value?: number | string | null; // accept strings from CSV
  icon?: React.ReactNode;
  maxValue?: number; // default to 10 for RPG stats
  density?: Density;
  className?: string;
};

export default function StatBar({
  label,
  value,
  icon,
  maxValue = 10, // <-- 0–10 scale by default
  density = "comfortable",
  className,
}: Props) {
  // robust numeric coercion for numbers OR numeric strings
  const num = typeof value === "string" ? parseFloat(value) : (value as number);

  const raw = Number.isFinite(num) ? num : 0;
  const clamped = Math.max(0, Math.min(maxValue, raw));
  const pct = (clamped / maxValue) * 100;

  const defaultH =
    density === "ultra" ? "h-2" : density === "compact" ? "h-2.5" : "h-3";
  const barH = className ?? defaultH;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] text-zinc-400 flex items-center gap-1">
          {icon}
          {label}
        </span>
        <span className="text-[11px] text-zinc-300">
          {Number.isFinite(num) ? Math.round(clamped) : 0}
        </span>
      </div>

      <div className={`w-full bg-zinc-800/80 rounded-full ${barH}`}>
        <div
          className={`bg-cyan-500 rounded-full ${barH}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
