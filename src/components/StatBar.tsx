import React from "react";

export type Density = "comfortable" | "compact" | "ultra";

type Props = {
  label: string;
  value?: number | null;
  icon?: React.ReactNode;
  maxValue?: number;     // defaults to 100
  density?: Density;     // optional height control
  className?: string;    // optional override for bar height/classes
};

export default function StatBar({
  label,
  value,
  icon,
  maxValue = 100,
  density = "comfortable",
  className,
}: Props) {
  const raw = Number.isFinite(value as number) ? (value as number) : 0;
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
        <span className="text-[11px] text-zinc-300">{Math.round(clamped)}</span>
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
