// src/components/AbilityCard.tsx
import { useMemo } from "react";
import Avatar from "./Avatar";
import StatBar from "./StatBar";
import { GuildBadge } from "./GuildBadge";
import { hpBarColorFromPct } from "../utils/hpColor";

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

function hpStatus(current: number, base: number) {
  const b = Math.max(1, base || 1);
  const pct = Math.max(0, Math.min(1, current / b));

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

  const fullName = `${first ?? ""} ${last ?? ""}`.trim() || "Unnamed Legend";

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

  const hpBase = Math.max(1, Number(baseHP ?? 20));
  const hpCur = Math.max(0, Math.min(hpBase, Number(currentHP ?? hpBase)));
  const hpPct = Math.max(0, Math.min(1, hpCur / hpBase));
  const status = hpStatus(hpCur, hpBase);

  const isDead = hpCur <= 0;

  // ✅ Smooth gradient colour (red → amber → green)
  const hpColor = hpBarColorFromPct(hpPct);

  // Optional: pulse when low but not dead
  const lowHpPulse = !isDead && hpPct > 0 && hpPct <= 0.25;

  return (
    <div
      className={`flex flex-col ${cfg.gap} ${cfg.padding} rounded-2xl bg-zinc-900/70 border border-zinc-800/60 shadow-lg shadow-black/40`}
    >
      {/* HEADER (never greyed out) */}
      <div className="flex items-start justify-between gap-2">
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

        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <div className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-zinc-900/80 border border-zinc-700/80 text-[10px] font-semibold text-zinc-200 whitespace-nowrap flex-shrink-0">
            {homeroom || "—"}
          </div>
          <GuildBadge guild={guild} />
        </div>
      </div>

      {/* EVERYTHING FROM HEALTH DOWN */}
      <div className="relative">
        {/* Grey-out layer (only affects the lower section) */}
        <div
          className={["relative", isDead ? "opacity-45 grayscale" : ""].join(
            " "
          )}
        >
          {/* HEALTH */}
          <div className="mt-1">
            <div className="flex items-center justify-between mb-1">
              <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                Health
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] leading-[12px] ${status.pillClass}`}
                  title={status.label}
                >
                  {status.label}
                </span>
                <span className="text-[10px] font-semibold text-zinc-200 tabular-nums">
                  {hpCur}/{hpBase}
                </span>
              </div>
            </div>

            <div className="h-2 w-full rounded-full bg-zinc-950/60 border border-zinc-800/70 overflow-hidden">
              <div
                className={[
                  "h-full transition-[width] duration-300",
                  lowHpPulse ? "animate-pulse" : "",
                ].join(" ")}
                style={{
                  width: `${Math.round(hpPct * 100)}%`,
                  backgroundColor: isDead
                    ? "rgba(113,113,122,1)" // zinc-500-ish when dead
                    : hpColor,
                }}
              />
            </div>
          </div>

          {/* STATS */}
          <div className={`mt-3 ${cfg.statGap}`}>
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
          <div className="mt-3">
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

        {/* DEAD OVERLAY (on top of everything from health down) */}
        {isDead && (
          <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center">
            <div className="absolute inset-0 rounded-xl bg-zinc-950/35" />
            <div className="relative flex flex-col items-center">
              <div className="text-4xl leading-none drop-shadow">💀</div>
              <div className="mt-1 text-xl font-extrabold tracking-widest text-zinc-100 drop-shadow">
                DEAD
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
