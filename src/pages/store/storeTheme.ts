import type { AttrKey } from "../../xpApi";

export type GuildTheme = {
  shellGlow: string;
  tintBg: string;
  border: string;
  pill: string;
  text: string;
  accent: string;
  softPanel: string;
  cardGlow: string;
  avatarGlow: string;
  gradient: string;
};

export function getGuildTheme(guild?: string): GuildTheme {
  switch (String(guild ?? "").trim()) {
    case "Blades":
      return {
        shellGlow:
          "shadow-[0_0_0_1px_rgba(244,63,94,0.06),0_18px_50px_rgba(0,0,0,0.42),0_0_36px_rgba(244,63,94,0.06)]",
        tintBg:
          "bg-[radial-gradient(circle_at_top,rgba(244,63,94,0.10),transparent_40%),linear-gradient(180deg,rgba(13,17,27,0.90),rgba(7,10,16,0.88))]",
        border: "border-rose-400/[0.14]",
        pill: "border-rose-400/[0.16] bg-rose-500/[0.08] text-rose-100",
        text: "text-rose-200",
        accent: "from-rose-400/18 via-rose-300/7 to-transparent",
        softPanel: "bg-rose-500/[0.035]",
        cardGlow: "shadow-[0_0_22px_rgba(244,63,94,0.08)]",
        avatarGlow: "shadow-[0_0_32px_rgba(244,63,94,0.10)]",
        gradient: "from-rose-500/22 via-fuchsia-500/10 to-cyan-400/6",
      };
    case "Guardians":
      return {
        shellGlow:
          "shadow-[0_0_0_1px_rgba(56,189,248,0.06),0_18px_50px_rgba(0,0,0,0.42),0_0_36px_rgba(56,189,248,0.06)]",
        tintBg:
          "bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.10),transparent_40%),linear-gradient(180deg,rgba(13,17,27,0.90),rgba(7,10,16,0.88))]",
        border: "border-sky-400/[0.14]",
        pill: "border-sky-400/[0.16] bg-sky-500/[0.08] text-sky-100",
        text: "text-sky-200",
        accent: "from-sky-400/18 via-sky-300/7 to-transparent",
        softPanel: "bg-sky-500/[0.035]",
        cardGlow: "shadow-[0_0_22px_rgba(56,189,248,0.08)]",
        avatarGlow: "shadow-[0_0_32px_rgba(56,189,248,0.10)]",
        gradient: "from-sky-500/22 via-cyan-500/10 to-violet-400/6",
      };
    case "Shadows":
      return {
        shellGlow:
          "shadow-[0_0_0_1px_rgba(168,85,247,0.06),0_18px_50px_rgba(0,0,0,0.42),0_0_36px_rgba(168,85,247,0.06)]",
        tintBg:
          "bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.10),transparent_40%),linear-gradient(180deg,rgba(13,17,27,0.90),rgba(7,10,16,0.88))]",
        border: "border-violet-400/[0.14]",
        pill: "border-violet-400/[0.16] bg-violet-500/[0.08] text-violet-100",
        text: "text-violet-200",
        accent: "from-violet-400/18 via-violet-300/7 to-transparent",
        softPanel: "bg-violet-500/[0.035]",
        cardGlow: "shadow-[0_0_22px_rgba(168,85,247,0.08)]",
        avatarGlow: "shadow-[0_0_32px_rgba(168,85,247,0.10)]",
        gradient: "from-violet-500/22 via-fuchsia-500/10 to-cyan-400/6",
      };
    case "Scouts":
      return {
        shellGlow:
          "shadow-[0_0_0_1px_rgba(16,185,129,0.06),0_18px_50px_rgba(0,0,0,0.42),0_0_36px_rgba(16,185,129,0.06)]",
        tintBg:
          "bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.10),transparent_40%),linear-gradient(180deg,rgba(13,17,27,0.90),rgba(7,10,16,0.88))]",
        border: "border-emerald-400/[0.14]",
        pill: "border-emerald-400/[0.16] bg-emerald-500/[0.08] text-emerald-100",
        text: "text-emerald-200",
        accent: "from-emerald-400/18 via-emerald-300/7 to-transparent",
        softPanel: "bg-emerald-500/[0.035]",
        cardGlow: "shadow-[0_0_22px_rgba(16,185,129,0.08)]",
        avatarGlow: "shadow-[0_0_32px_rgba(16,185,129,0.10)]",
        gradient: "from-emerald-500/22 via-lime-500/10 to-cyan-400/6",
      };
    case "Scholars":
      return {
        shellGlow:
          "shadow-[0_0_0_1px_rgba(245,158,11,0.06),0_18px_50px_rgba(0,0,0,0.42),0_0_36px_rgba(245,158,11,0.06)]",
        tintBg:
          "bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.10),transparent_40%),linear-gradient(180deg,rgba(13,17,27,0.90),rgba(7,10,16,0.88))]",
        border: "border-amber-400/[0.14]",
        pill: "border-amber-400/[0.16] bg-amber-500/[0.08] text-amber-100",
        text: "text-amber-200",
        accent: "from-amber-400/18 via-amber-300/7 to-transparent",
        softPanel: "bg-amber-500/[0.035]",
        cardGlow: "shadow-[0_0_22px_rgba(245,158,11,0.08)]",
        avatarGlow: "shadow-[0_0_32px_rgba(245,158,11,0.10)]",
        gradient: "from-amber-500/22 via-orange-500/10 to-cyan-400/6",
      };
    case "Diplomats":
      return {
        shellGlow:
          "shadow-[0_0_0_1px_rgba(34,211,238,0.06),0_18px_50px_rgba(0,0,0,0.42),0_0_36px_rgba(34,211,238,0.06)]",
        tintBg:
          "bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.10),transparent_40%),linear-gradient(180deg,rgba(13,17,27,0.90),rgba(7,10,16,0.88))]",
        border: "border-cyan-400/[0.14]",
        pill: "border-cyan-400/[0.16] bg-cyan-500/[0.08] text-cyan-100",
        text: "text-cyan-200",
        accent: "from-cyan-400/18 via-cyan-300/7 to-transparent",
        softPanel: "bg-cyan-500/[0.035]",
        cardGlow: "shadow-[0_0_22px_rgba(34,211,238,0.08)]",
        avatarGlow: "shadow-[0_0_32px_rgba(34,211,238,0.10)]",
        gradient: "from-cyan-500/22 via-sky-500/10 to-violet-400/6",
      };
    default:
      return {
        shellGlow:
          "shadow-[0_18px_50px_rgba(0,0,0,0.42),0_0_36px_rgba(34,211,238,0.04)]",
        tintBg:
          "bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.07),transparent_40%),linear-gradient(180deg,rgba(13,17,27,0.90),rgba(7,10,16,0.88))]",
        border: "border-white/[0.05]",
        pill: "border-white/[0.06] bg-white/[0.035] text-white/80",
        text: "text-cyan-200",
        accent: "from-cyan-400/14 via-violet-300/6 to-transparent",
        softPanel: "bg-white/[0.02]",
        cardGlow: "",
        avatarGlow: "",
        gradient: "from-cyan-500/16 via-violet-500/7 to-transparent",
      };
  }
}

export const shellCardBase =
  "rounded-[26px] border border-white/[0.05] bg-[linear-gradient(180deg,rgba(13,17,27,0.86),rgba(7,10,16,0.82))] backdrop-blur-xl shadow-[0_18px_45px_rgba(0,0,0,0.34)]";

export const innerCard =
  "rounded-[22px] border border-white/[0.04] bg-[linear-gradient(180deg,rgba(18,22,32,0.58),rgba(9,11,17,0.70))] shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_10px_24px_rgba(0,0,0,0.22)]";

export const softPanel =
  "rounded-[18px] border border-white/[0.035] bg-white/[0.02] shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]";

export const label = "text-[10px] uppercase tracking-[0.24em] text-white/42";

export const input =
  "w-full rounded-2xl border border-white/[0.05] bg-white/[0.04] px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-white/28 focus:border-cyan-300/18 focus:bg-white/[0.055]";

export const select =
  "w-full appearance-none rounded-2xl border border-white/[0.05] bg-white/[0.04] px-4 py-2.5 pr-10 text-sm text-white outline-none transition focus:border-cyan-300/18 focus:bg-white/[0.055]";

export const btn =
  "rounded-full border border-white/[0.06] bg-white/[0.04] px-4 py-2 text-sm text-white/82 transition hover:border-white/[0.08] hover:bg-white/[0.06] hover:text-white active:scale-[0.99] disabled:opacity-50";

export const btnPrimary =
  "rounded-full border border-cyan-400/[0.18] bg-cyan-400/[0.10] px-4 py-2 text-sm text-cyan-100 transition hover:border-cyan-300/[0.24] hover:bg-cyan-400/[0.14] active:scale-[0.99] disabled:opacity-50";

export const pill =
  "inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.04] px-3 py-1.5 text-xs text-white/78";

export const statusPillBase =
  "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]";

export function getStatusPill(storeLocked: boolean) {
  return storeLocked
    ? `${statusPillBase} border-white/[0.06] bg-white/[0.035] text-white/62`
    : `${statusPillBase} border-cyan-400/[0.18] bg-cyan-400/[0.10] text-cyan-100 shadow-[0_0_14px_rgba(34,211,238,0.07)]`;
}

export const ATTRS: {
  key: AttrKey;
  title: string;
  icon: string;
  tint: string;
}[] = [
  {
    key: "STR",
    title: "Strength",
    icon: "💪",
    tint: "from-rose-400/14 via-rose-300/4 to-transparent",
  },
  {
    key: "DEX",
    title: "Dexterity",
    icon: "🏹",
    tint: "from-emerald-400/14 via-emerald-300/4 to-transparent",
  },
  {
    key: "CON",
    title: "Constitution",
    icon: "🛡️",
    tint: "from-sky-400/14 via-sky-300/4 to-transparent",
  },
  {
    key: "INT",
    title: "Intelligence",
    icon: "🧠",
    tint: "from-violet-400/14 via-violet-300/4 to-transparent",
  },
  {
    key: "WIS",
    title: "Wisdom",
    icon: "🦉",
    tint: "from-amber-400/14 via-amber-300/4 to-transparent",
  },
  {
    key: "CHA",
    title: "Charisma",
    icon: "💬",
    tint: "from-cyan-400/14 via-cyan-300/4 to-transparent",
  },
];
