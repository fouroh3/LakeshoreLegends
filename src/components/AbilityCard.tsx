import { useMemo } from "react";
import Avatar from "./Avatar";
import StatBar from "./StatBar";
import { GuildBadge } from "./GuildBadge";
import { hpBarColorFromPct } from "../utils/hpColor";

type Density = "comfortable" | "compact" | "ultra";

interface AbilityCardProps {
  person: any;
  density?: Density;
  onClick?: () => void;
}

const densityConfig: Record<
  Density,
  {
    padding: string;
    gap: string;
    statGap: string;
    avatarSize: number;
    nameSize: string;
    metaSize: string;
  }
> = {
  comfortable: {
    padding: "p-4",
    gap: "gap-3",
    statGap: "space-y-2",
    avatarSize: 58,
    nameSize: "text-[17px]",
    metaSize: "text-xs",
  },
  compact: {
    padding: "p-3",
    gap: "gap-2.5",
    statGap: "space-y-1.5",
    avatarSize: 54,
    nameSize: "text-[16px]",
    metaSize: "text-[11px]",
  },
  ultra: {
    padding: "p-2.5",
    gap: "gap-2",
    statGap: "space-y-1",
    avatarSize: 50,
    nameSize: "text-[15px]",
    metaSize: "text-[10px]",
  },
};

function hpStatus(current: number, base: number) {
  const safeBase = Math.max(1, base || 1);
  const pct = Math.max(0, Math.min(1, current / safeBase));

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

function getGuildTintClasses(guild?: string) {
  switch (String(guild || "").trim()) {
    case "Blades":
      return {
        glow: "shadow-[0_0_0_1px_rgba(244,63,94,0.10),0_14px_30px_rgba(0,0,0,0.34)]",
        accent: "from-rose-400/18 via-rose-300/6 to-transparent",
        ring: "hover:border-rose-500/35",
      };
    case "Guardians":
      return {
        glow: "shadow-[0_0_0_1px_rgba(56,189,248,0.10),0_14px_30px_rgba(0,0,0,0.34)]",
        accent: "from-sky-400/18 via-sky-300/6 to-transparent",
        ring: "hover:border-sky-500/35",
      };
    case "Shadows":
      return {
        glow: "shadow-[0_0_0_1px_rgba(168,85,247,0.10),0_14px_30px_rgba(0,0,0,0.34)]",
        accent: "from-violet-400/18 via-violet-300/6 to-transparent",
        ring: "hover:border-violet-500/35",
      };
    case "Scouts":
      return {
        glow: "shadow-[0_0_0_1px_rgba(16,185,129,0.10),0_14px_30px_rgba(0,0,0,0.34)]",
        accent: "from-emerald-400/18 via-emerald-300/6 to-transparent",
        ring: "hover:border-emerald-500/35",
      };
    case "Scholars":
      return {
        glow: "shadow-[0_0_0_1px_rgba(245,158,11,0.10),0_14px_30px_rgba(0,0,0,0.34)]",
        accent: "from-amber-400/18 via-amber-300/6 to-transparent",
        ring: "hover:border-amber-500/35",
      };
    case "Diplomats":
      return {
        glow: "shadow-[0_0_0_1px_rgba(34,211,238,0.10),0_14px_30px_rgba(0,0,0,0.34)]",
        accent: "from-cyan-400/18 via-cyan-300/6 to-transparent",
        ring: "hover:border-cyan-500/35",
      };
    default:
      return {
        glow: "shadow-[0_14px_30px_rgba(0,0,0,0.34)]",
        accent: "from-white/8 via-white/[0.03] to-transparent",
        ring: "hover:border-zinc-600/80",
      };
  }
}

export default function AbilityCard({
  person,
  density = "compact",
  onClick,
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
  const guildTint = getGuildTintClasses(guild);

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
  const hpColor = hpBarColorFromPct(hpPct);
  const lowHpPulse = !isDead && hpPct > 0 && hpPct <= 0.25;

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        `group relative w-full min-w-0 text-left flex flex-col ${cfg.gap} ${cfg.padding} rounded-[24px] overflow-hidden`,
        "border border-zinc-800/70 bg-[linear-gradient(180deg,rgba(24,24,27,0.92),rgba(10,10,12,0.96))]",
        guildTint.glow,
        guildTint.ring,
        "transition duration-200 hover:-translate-y-[2px] hover:bg-[linear-gradient(180deg,rgba(30,30,34,0.96),rgba(12,12,14,0.98))]",
        "focus:outline-none focus:ring-2 focus:ring-cyan-500/45",
      ].join(" ")}
    >
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${guildTint.accent}`}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.05),transparent_36%)] opacity-80" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <Avatar
            name={fullName}
            src={portraitUrl}
            badge={badgeIcon}
            size={cfg.avatarSize}
          />

          <div className="min-w-0 pt-0.5">
            <div
              className={[
                cfg.nameSize,
                "font-semibold tracking-tight leading-tight text-zinc-100",
                "drop-shadow-[0_0_6px_rgba(255,255,255,0.08)]",
              ].join(" ")}
            >
              <span className="line-clamp-2 break-words">{fullName}</span>
            </div>

            <div
              className={`mt-1 ${cfg.metaSize} text-zinc-500 font-medium tracking-[0.02em]`}
            >
              {homeroom || "—"}
            </div>
          </div>
        </div>

        <div className="shrink-0 pt-0.5">
          <div className="rounded-full border border-zinc-800/80 bg-zinc-950/70 p-1 shadow-[0_4px_14px_rgba(0,0,0,0.25)]">
            <GuildBadge guild={guild} size={30} />
          </div>
        </div>
      </div>

      <div className="relative">
        <div
          className={["relative", isDead ? "opacity-45 grayscale" : ""].join(
            " "
          )}
        >
          <div className="mt-1 rounded-2xl border border-zinc-800/70 bg-zinc-950/25 p-2.5">
            <div className="mb-1 flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
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

            <div className="h-2.5 w-full overflow-hidden rounded-full border border-zinc-800/70 bg-zinc-950/70">
              <div
                className={[
                  "h-full transition-[width] duration-300",
                  lowHpPulse ? "animate-pulse" : "",
                ].join(" ")}
                style={{
                  width: `${Math.round(hpPct * 100)}%`,
                  backgroundColor: isDead ? "rgba(113,113,122,1)" : hpColor,
                  boxShadow: isDead ? "none" : `0 0 10px ${hpColor}55`,
                }}
              />
            </div>
          </div>

          <div className={`mt-3 ${cfg.statGap}`}>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
              <StatBar
                label="Strength"
                value={Number(str) || 0}
                density="ultra"
              />
              <StatBar
                label="Dexterity"
                value={Number(dex) || 0}
                density="ultra"
              />
              <StatBar
                label="Constitution"
                value={Number(con) || 0}
                density="ultra"
              />
              <StatBar
                label="Intelligence"
                value={Number(int) || 0}
                density="ultra"
              />
              <StatBar
                label="Wisdom"
                value={Number(wis) || 0}
                density="ultra"
              />
              <StatBar
                label="Charisma"
                value={Number(cha) || 0}
                density="ultra"
              />
            </div>
          </div>

          <div className="mt-3">
            <div className="mb-1 text-[10px] uppercase tracking-[0.18em] text-zinc-500">
              Skills
            </div>

            {skillList.length === 0 ? (
              <div className="text-[11px] italic text-zinc-500">
                No skills yet
              </div>
            ) : (
              <div className="flex flex-wrap gap-1">
                {skillList.slice(0, 4).map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center rounded-full border border-zinc-700/80 bg-zinc-900/80 px-2 py-0.5 text-[10px] text-zinc-200 transition group-hover:border-zinc-600"
                  >
                    {skill}
                  </span>
                ))}
                {skillList.length > 4 ? (
                  <span className="inline-flex items-center rounded-full border border-zinc-800 bg-zinc-950/85 px-2 py-0.5 text-[10px] text-zinc-400">
                    +{skillList.length - 4}
                  </span>
                ) : null}
              </div>
            )}
          </div>
        </div>

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
    </button>
  );
}
