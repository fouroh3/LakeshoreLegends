import React, { useMemo } from "react";

export default function StatBar({
  label,
  value,
  icon,
  maxValue = 10, // matches your sheet (x/10)
  density = "comfortable",
}: {
  label: string;
  value: number | undefined | null;
  icon?: React.ReactNode;
  maxValue?: number;
  density?: "comfortable" | "compact" | "ultra";
}) {
  const clamped = Math.max(0, Math.min(maxValue, Number(value ?? 0)));
  const pct = (clamped / maxValue) * 100;

  const heights = {
    comfortable: "h-2.5",
    compact: "h-2",
    ultra: "h-1.5",
  } as const;
  const labelSize = {
    comfortable: "text-sm",
    compact: "text-[11.5px]",
    ultra: "text-[10.5px]",
  } as const;
  const numberSize = {
    comfortable: "text-sm",
    compact: "text-[11.5px]",
    ultra: "text-[10.5px]",
  } as const;

  const bar = useMemo(
    () => (
      <div
        className={`w-full rounded-full bg-zinc-800/90 ${heights[density]} overflow-hidden`}
      >
        <div className="h-full bg-cyan-500/80" style={{ width: `${pct}%` }} />
      </div>
    ),
    [pct, density]
  );

  return (
    <div className="flex items-center gap-2">
      {icon ? <div className="shrink-0 text-zinc-300">{icon}</div> : null}
      <div className="w-full">
        {/* label row with breathing room */}
        <div
          className={`flex items-baseline justify-between ${labelSize[density]} text-zinc-300/95`}
        >
          <span className="pr-2">{label}</span>
          <span className={`tabular-nums text-zinc-400 ${numberSize[density]}`}>
            {clamped}/{maxValue}
          </span>
        </div>
        {/* slight spacing before bar */}
        <div className="mt-1">{bar}</div>
      </div>
    </div>
  );
}
