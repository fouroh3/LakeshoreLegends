// src/components/AbilityCard.tsx
import React from "react";
import type { Student } from "../types";

type Density = "compact" | "ultra";

export default function AbilityCard({
  person,
  density = "compact",
  sizeTier = 0, // injected by AbilitiesGrid
}: {
  person: Student;
  density?: Density;
  sizeTier?: 0 | 1 | 2 | 3 | 4;
}) {
  const clamp = (n: number, lo: number, hi: number) =>
    Math.max(lo, Math.min(hi, n));
  const tier = clamp(sizeTier, 0, 4);

  // Stable insets (box-border so padding counts in width)
  const sidePad = density === "ultra" ? "px-4" : "px-5";
  const baseTopPad = density === "ultra" ? "pt-5" : "pt-6";
  const pillClearTop = "pt-2";
  const bottomPad = density === "ultra" ? "pb-4" : "pb-5";

  // Type/size tokens scale via sizeTier + density
  const nameSizes = ["text-xl", "text-lg", "text-base", "text-sm", "text-xs"];
  const subSizes = [
    "text-sm",
    "text-xs",
    "text-[11px]",
    "text-[10px]",
    "text-[9px]",
  ];
  const barHeights = ["h-2.5", "h-2", "h-1.5", "h-1.5", "h-1"];
  const avatarSizes = [
    "w-16 h-16",
    "w-14 h-14",
    "w-12 h-12",
    "w-11 h-11",
    "w-10 h-10",
  ];

  const extraTrim = density === "ultra" ? 1 : 0;
  const idx = clamp(tier + extraTrim, 0, 4);

  const nameText = nameSizes[idx];
  const subText = subSizes[idx];
  const barH = barHeights[idx];
  const avatar = avatarSizes[idx];

  const labelClass = "text-zinc-200 " + (idx >= 3 ? "text-xs" : "text-sm");
  const pillPad = idx >= 3 ? "px-2 py-0.5" : "px-3 py-1";

  const first = person.first ?? "";
  const last = person.last ?? "";
  const fullName = `${first} ${last}`.trim();
  const initials = (first[0] ?? "") + (last[0] ?? "");

  const skills = Array.isArray(person.skills)
    ? person.skills
    : person.skills
    ? String(person.skills)
        .split(/[;,]/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const clamp10 = (v: any) =>
    typeof v === "number" ? Math.max(0, Math.min(10, v)) : 0;

  const Stat = ({
    label,
    value,
  }: {
    label: string;
    value: number | undefined;
  }) => {
    const v = clamp10(value);
    const pct = Math.round((v / 10) * 100);
    return (
      <div className="grid grid-cols-[1fr_auto] items-center gap-y-1.5">
        <div className={labelClass}>{label}</div>
        <div className={`text-zinc-300 ${subText}`}>{v}/10</div>
        <div className="col-span-2">
          <div className={`w-full ${barH} rounded bg-zinc-800 overflow-hidden`}>
            <div className="h-full bg-cyan-400" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
    );
  };

  // ---------- Unique placeholder avatar (no deps) ----------
  const primaryKey = getPrimaryKey(person); // "str" | "dex" | ...
  const hue = hashToHue(person.id ?? (fullName || person.homeroom || "seed"));
  const bgStyle = {
    background: `linear-gradient(135deg, hsl(${hue}, 70%, 22%) 0%, hsl(${
      (hue + 25) % 360
    }, 70%, 18%) 100%)`,
  };

  function PlaceholderAvatar() {
    return (
      <div
        className={`${avatar} relative rounded-xl border border-zinc-700 shrink-0 grid place-items-center`}
        style={bgStyle}
        aria-label="Generated avatar"
      >
        <span
          className="text-zinc-200 font-semibold"
          style={{ fontSize: idx >= 3 ? 10 : 12 }}
        >
          {initials || "?"}
        </span>
        {/* Emblem for top attribute */}
        <div className="absolute -bottom-1 -right-1 rounded-full bg-zinc-900/90 border border-zinc-700 p-1">
          <PrimaryIcon kind={primaryKey} size={idx >= 3 ? 10 : 12} />
        </div>
      </div>
    );
  }

  return (
    <article
      className={`box-border w-full relative rounded-2xl bg-zinc-900/70 border border-zinc-800 shadow-sm ${sidePad} ${baseTopPad} ${pillClearTop} ${bottomPad}`}
    >
      {/* Homeroom pill */}
      <div className="absolute right-3 top-3">
        <span
          className={`inline-flex items-center rounded-full bg-zinc-800/80 border border-zinc-700 text-zinc-200 ${pillPad} ${subText} font-medium`}
        >
          {person.homeroom}
        </span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 min-w-0 mb-3">
        {person.portraitUrl ? (
          <img
            src={person.portraitUrl}
            alt={fullName}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
            className={`${avatar} rounded-xl object-cover bg-zinc-800 border border-zinc-700 shrink-0`}
          />
        ) : null}
        {!person.portraitUrl && <PlaceholderAvatar />}

        <h2
          className={`font-semibold text-zinc-100 ${nameText} truncate`}
          title={fullName}
        >
          {fullName}
        </h2>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
        <Stat label="Strength" value={(person as any).str} />
        <Stat label="Dexterity" value={(person as any).dex} />
        <Stat label="Constitution" value={(person as any).con} />
        <Stat label="Intelligence" value={(person as any).int} />
        <Stat label="Wisdom" value={(person as any).wis} />
        <Stat label="Charisma" value={(person as any).cha} />
      </div>

      {/* Skills */}
      {skills.length > 0 && (
        <div className="flex flex-wrap items-start gap-2 mt-3">
          {skills.map((sk) => (
            <span
              key={sk}
              className={`rounded-full bg-zinc-800 border border-zinc-700 text-zinc-200 ${pillPad} ${subText} leading-none`}
              title={sk}
            >
              {sk}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}

/* ---------------- helpers ---------------- */

function getPrimaryKey(
  p: Partial<Student>
): "str" | "dex" | "con" | "int" | "wis" | "cha" {
  const entries: Array<
    ["str" | "dex" | "con" | "int" | "wis" | "cha", number]
  > = [
    ["str", Number(p.str) || 0],
    ["dex", Number(p.dex) || 0],
    ["con", Number(p.con) || 0],
    ["int", Number(p.int) || 0],
    ["wis", Number(p.wis) || 0],
    ["cha", Number(p.cha) || 0],
  ];
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}

function hashToHue(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return h % 360;
}

function PrimaryIcon({
  kind,
  size = 12,
}: {
  kind: ReturnType<typeof getPrimaryKey>;
  size?: number;
}) {
  // Tiny inline SVGs (no libraries), themed per attribute
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "currentColor",
  } as const;
  const cls = "text-cyan-400"; // matches your accent

  switch (kind) {
    case "str": // dumbbell
      return (
        <svg {...common} className={cls} aria-label="Strength">
          <path d="M3 10h2v4H3v-4zm16 0h2v4h-2v-4zM7 9h2v6H7V9zm8 0h2v6h-2V9zM10 11h4v2h-4v-2z" />
        </svg>
      );
    case "dex": // feather/leaf
      return (
        <svg {...common} className={cls} aria-label="Dexterity">
          <path d="M7 18c7 0 10-6 10-10 0-1-.2-2-.6-2.8C15.6 3.2 13.9 2 12 2 8 2 5 5 5 9c0 1.9 1.2 3.6 3.2 4.4L7 18z" />
        </svg>
      );
    case "con": // shield - improved solid, legible at small sizes
      return (
        <svg {...common} className={cls} aria-label="Constitution">
          <path d="M12 2C9.6 3 6 4 5 5v6c0 4.5 3.2 9 7 11 3.8-2 7-6.5 7-11V5c-1-1-4.6-2-7-3zM12 4.2l5 2v4.7c0 3.6-2.6 7.2-5 8.8-2.4-1.6-5-5.2-5-8.8V6.2l5-2z" />
        </svg>
      );
    case "int": // book
      return (
        <svg {...common} className={cls} aria-label="Intelligence">
          <path d="M4 5a2 2 0 012-2h10v16H6a2 2 0 01-2-2V5zm12 0H8a2 2 0 00-2 2v9a3 3 0 012-1h8V5z" />
        </svg>
      );
    case "wis": // eye
      return (
        <svg {...common} className={cls} aria-label="Wisdom">
          <path d="M12 5C7 5 3.3 8 2 12c1.3 4 5 7 10 7s8.7-3 10-7c-1.3-4-5-7-10-7zm0 11a4 4 0 110-8 4 4 0 010 8z" />
        </svg>
      );
    case "cha": // star
      return (
        <svg {...common} className={cls} aria-label="Charisma">
          <path d="M12 2l2.9 6 6.6.6-4.9 4.2 1.5 6.5L12 16l-6.1 3.3 1.5-6.5L2.5 8.6 9.1 8 12 2z" />
        </svg>
      );
    default:
      return null;
  }
}
