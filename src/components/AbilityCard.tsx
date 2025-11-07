import React, { useMemo } from "react";
import Avatar from "./Avatar";
import StatBar from "./StatBar";

type Density = "comfortable" | "compact" | "ultra";

export default function AbilityCard({
  person,
  density = "comfortable",
}: {
  person: any;
  density?: Density;
}) {
  const {
    first,
    last,
    homeroom,
    str,
    dex,
    con,
    int,
    wis,
    cha,
    skills,
    portraitUrl,
  } = person;

  const fullName = `${first ?? ""} ${last ?? ""}`.trim();

  // strongest stat → badge emoji
  const badgeIcon = useMemo(() => {
    const stats = [
      ["STR", str, "💪"],
      ["DEX", dex, "🏹"],
      ["CON", con, "🛡️"],
      ["INT", int, "🧠"],
      ["WIS", wis, "🦉"],
      ["CHA", cha, "💬"],
    ] as const;
    let best: (typeof stats)[number] = stats[0];
    for (const s of stats) {
      if ((s[1] ?? -1) > (best[1] ?? -1)) best = s;
    }
    return best[2];
  }, [str, dex, con, int, wis, cha]);

  const nameSize =
    density === "ultra"
      ? "text-[13px]"
      : density === "compact"
      ? "text-sm"
      : "text-base";

  return (
    <div
      className="rounded-2xl bg-zinc-900/70 border border-zinc-800 p-4 flex flex-col shadow-lg hover:shadow-cyan-500/10 transition-shadow duration-300"
      style={{ minWidth: 200 }}
    >
      {/* Header: avatar + stacked name block */}
      <div className="flex items-start gap-3">
        <Avatar name={fullName} src={portraitUrl} badge={badgeIcon} size={56} />

        <div className="min-w-0 flex-1">
          <h2
            className={`${nameSize} font-semibold text-zinc-100 leading-snug break-words`}
            title={fullName}
          >
            {first || "—"}
          </h2>
          <h3
            className="text-sm text-zinc-300 leading-tight break-words"
            title={fullName}
          >
            {last || ""}
          </h3>
          <div className="text-xs text-zinc-400 mt-1">{homeroom || "—"}</div>
        </div>
      </div>

      {/* Stats */}
      <div
        className="mt-4 grid gap-2"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}
      >
        <StatBar label="Strength" value={str} density={density} />
        <StatBar label="Dexterity" value={dex} density={density} />
        <StatBar label="Constitution" value={con} density={density} />
        <StatBar label="Intelligence" value={int} density={density} />
        <StatBar label="Wisdom" value={wis} density={density} />
        <StatBar label="Charisma" value={cha} density={density} />
      </div>

      {/* Skills */}
      {skills &&
        (Array.isArray(skills) ? skills : String(skills).split(/[;,]/)).filter(
          Boolean
        ).length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {(Array.isArray(skills) ? skills : String(skills).split(/[;,]/))
              .map((s: string) => s.trim())
              .filter(Boolean)
              .slice(0, 12)
              .map((s: string, i: number) => (
                <span
                  key={`${s}-${i}`}
                  className="rounded-full bg-zinc-800/80 border border-zinc-700 px-3 py-1 text-sm text-zinc-300 hover:bg-zinc-700/80 transition"
                  title={s}
                >
                  {s}
                </span>
              ))}
          </div>
        )}
    </div>
  );
}
