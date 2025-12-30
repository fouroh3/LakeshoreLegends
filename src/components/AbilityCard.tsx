// src/components/AbilityCard.tsx
import { useMemo } from "react";
import Avatar from "./Avatar";
import StatBar from "./StatBar";
import { GuildBadge } from "./GuildBadge";

type Density = "comfortable" | "compact" | "ultra";

interface AbilityCardProps {
  person: any;
  density?: Density;
}

const densityConfig: Record<
  Density,
  { padding: string; gap: string; statGap: string; textSize: string }
> = {
  comfortable: {
    padding: "p-4",
    gap: "gap-3",
    statGap: "space-y-2",
    textSize: "text-sm",
  },
  compact: {
    padding: "p-3",
    gap: "gap-2.5",
    statGap: "space-y-1.5",
    textSize: "text-xs",
  },
  ultra: {
    padding: "p-2.5",
    gap: "gap-2",
    statGap: "space-y-1.5",
    textSize: "text-[11px]",
  },
};

export default function AbilityCard({
  person,
  density = "comfortable",
}: AbilityCardProps) {
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
    guild,
    baseHP,
    currentHP,
  } = person;

  const cfg = densityConfig[density];

  // Full name without truncation
  const fullName = `${first ?? ""} ${last ?? ""}`.trim() || "Unnamed Legend";

  // Stat badge over avatar
  const { badgeIcon } = useMemo(() => {
    const stats = [
      ["Strength", Number(str) || 0, "💪"],
      ["Dexterity", Number(dex) || 0, "🏹"],
      ["Constitution", Number(con) || 0, "🛡️"],
      ["Intelligence", Number(int) || 0, "🧠"],
      ["Wisdom", Number(wis) || 0, "🦉"],
      ["Charisma", Number(cha) || 0, "💬"],
    ] as const;

    const top = stats.reduce(
      (best, current) => (current[1] > best[1] ? current : best),
      stats[0]
    );

    return { badgeIcon: top[2] };
  }, [str, dex, con, int, wis, cha]);

  // Normalize skills
  const skillList: string[] = useMemo(() => {
    if (Array.isArray(skills)) return skills.filter(Boolean);
    if (typeof skills === "string") {
      return skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return [];
  }, [skills]);

  // ✅ HP
  const hpBase = Math.max(1, Number(baseHP ?? 20));
  const hpCur = Math.max(0, Math.min(hpBase, Number(currentHP ?? hpBase)));
  const hpPct = Math.max(0, Math.min(1, hpCur / hpBase));

  return (
    <div
      className={`flex flex-col ${cfg.gap} ${cfg.padding} rounded-2xl bg-zinc-900/70 border border-zinc-800/60 shadow-lg shadow-black/40`}
    >
      {/* HEADER */}
      <div className="flex items-start justify-between gap-2">
        {/* Avatar + Name */}
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar name={fullName} src={portraitUrl} badge={badgeIcon} />

          <div className="min-w-0">
            <div
              className={`font-semibold text-zinc-50 leading-tight ${cfg.textSize}`}
            >
              <span className="break-words">{fullName}</span>
            </div>
          </div>
        </div>

        {/* Homeroom + Guild Badge */}
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          {/* Class pill outlined */}
          <div className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-zinc-900/80 border border-zinc-700/80 text-[10px] font-semibold text-zinc-200 whitespace-nowrap flex-shrink-0">
            {homeroom || "—"}
          </div>

          {/* Guild badge */}
          <GuildBadge guild={guild} />
        </div>
      </div>

      {/* ✅ HP (compact, matches style) */}
      <div className="mt-1">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.16em] text-zinc-500 mb-1">
          <span>Health</span>
          <span className="font-semibold text-zinc-200 tracking-normal">
            {hpCur}/{hpBase}
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-zinc-950/60 border border-zinc-800/70 overflow-hidden">
          <div
            className="h-full bg-emerald-400/80"
            style={{ width: `${Math.round(hpPct * 100)}%` }}
          />
        </div>
      </div>

      {/* STATS */}
      <div className={`mt-1 ${cfg.statGap}`}>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
          <StatBar label="Strength" value={Number(str) || 0} />
          <StatBar label="Dexterity" value={Number(dex) || 0} />
          <StatBar label="Constitution" value={Number(con) || 0} />
          <StatBar label="Intelligence" value={Number(int) || 0} />
          <StatBar label="Wisdom" value={Number(wis) || 0} />
          <StatBar label="Charisma" value={Number(cha) || 0} />
        </div>
      </div>

      {/* SKILLS */}
      <div className="mt-1">
        <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 mb-1">
          Skills
        </div>

        {skillList.length === 0 ? (
          <div className="text-xs text-zinc-500 italic">No skills yet</div>
        ) : (
          <div className="flex flex-wrap gap-1">
            {skillList.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center rounded-full bg-zinc-900/80 border border-zinc-700/80 px-2 py-0.5 text-[10px] text-zinc-200"
              >
                {skill}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
