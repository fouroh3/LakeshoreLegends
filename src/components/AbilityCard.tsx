import { useMemo } from "react";
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
  } = person ?? {};

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
    for (const s of stats) if ((s[1] ?? -1) > (best[1] ?? -1)) best = s;
    return best[2];
  }, [str, dex, con, int, wis, cha]);

  const nameSize =
    density === "ultra"
      ? "text-[13px]"
      : density === "compact"
      ? "text-sm"
      : "text-base";

  const statBarClass =
    density === "ultra" ? "h-2" : density === "compact" ? "h-2.5" : "h-3";

  // normalize skills
  const skillList: string[] = Array.isArray(skills)
    ? skills.filter(Boolean).map((s: any) => String(s).trim())
    : typeof skills === "string"
    ? skills
        .split(/[;,]/g)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  return (
    <div
      className="relative rounded-2xl bg-zinc-900/70 border border-zinc-800 p-4 flex flex-col shadow-lg hover:shadow-cyan-500/10 transition-shadow duration-300"
      style={{ minWidth: 200 }}
    >
      {/* Homeroom tag */}
      <div
        className="pointer-events-none absolute top-2.5 right-2.5 h-6 px-2.5 rounded-full text-[11px] leading-6 font-medium bg-zinc-900/85 backdrop-blur-sm border border-zinc-700/60 text-zinc-300 shadow-[0_1px_0_rgba(255,255,255,0.03)_inset,0_2px_8px_rgba(0,0,0,0.45)]"
      >
        {homeroom || "—"}
      </div>

      {/* Header */}
      <div className="flex items-start gap-3 pr-10">
        <Avatar
          name={fullName || "Unnamed Legend"}
          src={portraitUrl || undefined}
          badge={badgeIcon}
          size={56}
        />
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
        </div>
      </div>

      {/* Stats */}
      <div className="mt-4 grid gap-2">
        <StatBar label="Strength" value={str} className={statBarClass} />
        <StatBar label="Dexterity" value={dex} className={statBarClass} />
        <StatBar label="Constitution" value={con} className={statBarClass} />
        <StatBar label="Intelligence" value={int} className={statBarClass} />
        <StatBar label="Wisdom" value={wis} className={statBarClass} />
        <StatBar label="Charisma" value={cha} className={statBarClass} />
      </div>

      {/* Skills */}
      {skillList.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {skillList.slice(0, 12).map((s, i) => (
            <span
              key={`${s}-${i}`}
              className="rounded-full bg-zinc-800/80 border border-zinc-700 px-3 py-1 text-sm text-zinc-300 hover:bg-zinc-700/80 transition"
              title={s}
            >
              {s}
            </span>
          ))}
        </div>
      ) : (
        <div className="mt-3 text-[11px] text-zinc-400">No skills listed</div>
      )}
    </div>
  );
}
