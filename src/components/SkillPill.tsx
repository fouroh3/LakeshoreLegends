import React from "react";

export default function SkillPill({
  text,
  density = "comfortable",
}: {
  text: string;
  density?: "comfortable" | "compact" | "ultra";
}) {
  const sizes = {
    comfortable: "px-2.5 py-1 text-xs",
    compact: "px-2 py-[4px] text-[11px]",
    ultra: "px-1.5 py-[3px] text-[10px]",
  } as const;

  return (
    <span
      className={`inline-flex items-center rounded-full border border-zinc-800 bg-zinc-900/70 text-zinc-200 ${sizes[density]} leading-none`}
    >
      {text}
    </span>
  );
}
