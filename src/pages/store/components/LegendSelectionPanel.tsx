// src/pages/store/components/LegendSelectionPanel.tsx

import type { Student } from "../../../types";
import { hpStatus } from "../../../utils/hpStatus";
import {
  innerCard,
  label,
  select,
  shellCardBase,
  softPanel,
} from "../storeTheme";
import {
  cleanText,
  fullName,
  initialsForStudent,
} from "../storeUtils";

type Props = {
  homerooms: string[];
  hr: string;
  setHr: (v: string) => void;
  guildsForHr: string[];
  guild: string;
  setGuild: (v: string) => void;
  studentsForPick: Student[];
  selectedId: string;
  setSelectedId: (v: string) => void;
  selected: Student | null;
  summaryBalance: number | null;
  summarySpendable: number | null;
  storeLocked: boolean;
  loading: boolean;
  err: string | null;
  liveHp?: number | null;
  liveMaxHp?: number | null;
  guildTheme: {
    border: string;
    pill: string;
    softPanel: string;
    cardGlow: string;
    avatarGlow: string;
    gradient: string;
    shellGlow: string;
    tintBg: string;
    text: string;
  };
};



function num(v: unknown, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function resolveHealth(student: Student | null) {
  if (!student) {
    return { hp: 0, maxHp: 20 };
  }

  const row = student as Record<string, unknown>;

  const rawMaxHp =
    num(row.baseHP, NaN) ||
    num(row.baseHp, NaN) ||
    num(row.maxHp, NaN) ||
    num(row.maxHP, NaN) ||
    num(row.hpMax, NaN) ||
    num(row.hpmax, NaN) ||
    20;

  const maxHp = rawMaxHp > 0 ? rawMaxHp : 20;

  const rawHp =
    num(row.currentHP, NaN) ||
    num(row.currentHp, NaN) ||
    num(row.hpCurrent, NaN) ||
    num(row.currentHealth, NaN) ||
    num(row.health, NaN) ||
    num(row.hp, NaN) ||
    maxHp;

  const hp = Math.max(0, Math.min(rawHp, maxHp));

  return { hp, maxHp };
}

function isValidNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

export default function LegendSelectionPanel({
  homerooms,
  hr,
  setHr,
  guildsForHr,
  guild,
  setGuild,
  studentsForPick,
  selectedId,
  setSelectedId,
  selected,
  liveHp,
  liveMaxHp,
  guildTheme,
}: Props) {
  const selectedStudentId = selected
    ? String((selected as Record<string, unknown>).id ?? "")
    : "";

  const fallback = resolveHealth(selected);

  const maxHp = selected
    ? isValidNumber(liveMaxHp)
      ? Math.max(1, Math.round(liveMaxHp))
      : fallback.maxHp
    : 20;

  const hp = selected
    ? isValidNumber(liveHp)
      ? Math.max(0, Math.min(Math.round(liveHp), maxHp))
      : fallback.hp
    : 0;

  const safeMaxHp = maxHp > 0 ? maxHp : 20;
  const hpPct = selected
    ? Math.max(0, Math.min(100, (hp / safeMaxHp) * 100))
    : 0;

  const healthState = selected
    ? hpStatus(hp, safeMaxHp)
    : {
        label: "Awaiting target",
        pillClass: "border-white/[0.05] bg-white/[0.035] text-white/62",
      };

  const healthLabel = healthState.label;
  const healthPillClass = selected
    ? healthState.pillClass
    : "border-white/[0.05] bg-white/[0.035] text-white/62";

  const barClass = !selected
    ? "bg-white/20"
    : healthLabel === "Dead"
    ? "bg-zinc-700"
    : healthLabel === "Critical"
    ? "bg-red-500"
    : healthLabel === "Wounded"
    ? "bg-amber-400"
    : "bg-emerald-400";

  const healthGlow = !selected
    ? ""
    : healthLabel === "Dead"
    ? "shadow-[0_0_0_1px_rgba(113,113,122,0.18),0_0_28px_rgba(113,113,122,0.08)]"
    : healthLabel === "Critical"
    ? "shadow-[0_0_0_1px_rgba(239,68,68,0.16),0_0_32px_rgba(239,68,68,0.10)]"
    : healthLabel === "Wounded"
    ? "shadow-[0_0_0_1px_rgba(251,191,36,0.16),0_0_32px_rgba(251,191,36,0.10)]"
    : "shadow-[0_0_0_1px_rgba(52,211,153,0.14),0_0_30px_rgba(52,211,153,0.08)]";

  const avatarTone = !selected
    ? ""
    : healthLabel === "Critical"
    ? "before:absolute before:inset-[-12px] before:rounded-[36px] before:bg-red-500/8 before:blur-2xl before:content-['']"
    : healthLabel === "Wounded"
    ? "before:absolute before:inset-[-12px] before:rounded-[36px] before:bg-amber-400/8 before:blur-2xl before:content-['']"
    : healthLabel === "Healthy"
    ? "before:absolute before:inset-[-12px] before:rounded-[36px] before:bg-emerald-400/8 before:blur-2xl before:content-['']"
    : "";


  return (
    <aside
      className={`${shellCardBase} ${guildTheme.border} ${guildTheme.tintBg} px-3 py-3 xl:px-5 xl:py-5 ${guildTheme.shellGlow}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-white/42 xl:text-[11px] xl:tracking-[0.24em]">
            Legend Selection
          </div>

          <div className="mt-1 text-lg font-semibold tracking-tight text-white xl:text-xl">
            Choose your legend
          </div>
        </div>

        <div className="rounded-full border border-white/[0.05] bg-white/[0.035] px-2.5 py-1 text-[11px] text-white/56 xl:px-3 xl:text-xs">
          {studentsForPick.length || 0} shown
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-3 xl:mt-4 xl:block xl:space-y-3">
        <div className={`${softPanel} px-3 py-2 xl:py-3`}>
          <div className={`${label} flex items-center gap-2`}>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-400/20 text-[11px] font-black text-cyan-200">
              1
            </span>

            Choose Homeroom
          </div>

          <div className="relative mt-1.5">
            <select
              className={select}
              value={hr}
              onChange={(e) => setHr(e.target.value)}
              disabled={homerooms.length === 0}
            >
              <option
                value=""
                className="bg-slate-950 text-white"
              >
                Select…
              </option>

              {homerooms.map((x) => (
                <option
                  key={x}
                  value={x}
                  className="bg-slate-950 text-white"
                >
                  {x}
                </option>
              ))}
            </select>

            <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/36">
              ▾
            </div>
          </div>
        </div>

        <div className={`${softPanel} px-3 py-2 xl:py-3`}>
          <div className={`${label} flex items-center gap-2`}>
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-black ${
                hr
                  ? "bg-cyan-400/20 text-cyan-200"
                  : "bg-white/10 text-white/40"
              }`}
            >
              2
            </span>

            <span className={!hr ? "text-white/40" : ""}>
              Choose Guild
            </span>
          </div>

          <div className="relative mt-1.5">
            <select
              className={select}
              value={guild}
              onChange={(e) => setGuild(e.target.value)}
              disabled={!hr}
            >
              <option
                value=""
                className="bg-slate-950 text-white"
              >
                {hr ? "All guilds" : "Select homeroom first"}
              </option>

              {guildsForHr.map((g) => (
                <option
                  key={g}
                  value={g}
                  className="bg-slate-950 text-white"
                >
                  {g}
                </option>
              ))}
            </select>

            <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/36">
              ▾
            </div>
          </div>
        </div>

        <div className={`${softPanel} px-3 py-2 xl:py-3`}>
          <div className={`${label} flex items-center gap-2`}>
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-black ${
                hr
                  ? "bg-cyan-400/20 text-cyan-200"
                  : "bg-white/10 text-white/40"
              }`}
            >
              3
            </span>

            <span className={!hr ? "text-white/40" : ""}>
              Choose Your Legend
            </span>
          </div>

          <div className="relative mt-1.5">
            <select
              className={`${select} ${
                selected ? `${guildTheme.border} ${guildTheme.softPanel}` : ""
              }`}
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              disabled={!hr}
            >
              <option
                value=""
                className="bg-slate-950 text-white"
              >
                {hr ? "Select…" : "Select homeroom first"}
              </option>

              {studentsForPick.map((s) => {
                const id = String((s as Record<string, unknown>).id ?? "");

                return (
                  <option
                    key={id}
                    value={id}
                    className="bg-slate-950 text-white"
                  >
                    {fullName(s)} • {id}
                  </option>
                );
              })}
            </select>

            <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/36">
              ▾
            </div>
          </div>
        </div>
      </div>

      <div
        className={`${innerCard} mt-4 hidden overflow-hidden px-4 py-4 xl:block ${
          selected
            ? `${guildTheme.border} ${guildTheme.softPanel} ${guildTheme.cardGlow}`
            : ""
        }`}
      >
        <div className="relative">
          <div
            className={`absolute inset-x-0 top-0 h-28 bg-gradient-to-b ${guildTheme.gradient} opacity-90`}
          />

          <div className="relative">
            <div className="flex flex-col items-center text-center">
              <div className={`relative mt-1 ${avatarTone}`}>
                <div
                  className={`relative z-[1] flex h-28 w-28 items-center justify-center rounded-[30px] border border-white/[0.05] bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] text-5xl font-bold tracking-tight text-white ${guildTheme.avatarGlow}`}
                >
                  {initialsForStudent(selected)}
                </div>
              </div>

              <div className="mt-4 max-w-full truncate text-[28px] font-semibold leading-none tracking-tight text-white">
                {selected ? fullName(selected) : "No legend selected"}
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                <span className="rounded-full border border-white/[0.05] bg-white/[0.035] px-3 py-1 text-xs text-white/72">
                  {selected
                    ? cleanText(
                        (selected as Record<string, unknown>).homeroom
                      ) || "—"
                    : "Select a student"}
                </span>

                <span
                  className={`rounded-full border px-3 py-1 text-xs ${
                    selected
                      ? guildTheme.pill
                      : "border-white/[0.05] bg-white/[0.035] text-white/72"
                  }`}
                >
                  {selected
                    ? cleanText((selected as Record<string, unknown>).guild) ||
                      "No guild"
                    : "No guild"}
                </span>

                <span
                  className={`rounded-full border px-3 py-1 text-xs ${healthPillClass}`}
                >
                  {healthLabel}
                </span>
              </div>

              <div className="mt-3 text-xs text-white/48">
                {selected ? selectedStudentId : "Awaiting selection"}
              </div>
            </div>

            <div
              className={`mt-5 rounded-[20px] border border-white/[0.04] bg-black/16 px-3 py-3 transition-shadow duration-300 ${healthGlow}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className={label}>Health</div>

                <div className="text-sm font-semibold tabular-nums text-white">
                  {selected ? `${hp}/${safeMaxHp}` : "—"}
                </div>
              </div>

              <div className="mt-2 text-[11px] uppercase tracking-[0.18em] text-white/36">
                {selected ? `${Math.round(hpPct)}% integrity` : "Awaiting data"}
              </div>

              <div className="mt-3 h-3 rounded-full bg-black/40 p-[2px] ring-1 ring-white/[0.05]">
                <div
                  className={`h-full rounded-full transition-[width] duration-500 ${barClass}`}
                  style={{ width: `${selected ? Math.max(10, hpPct) : 12}%` }}
                />
              </div>
            </div>


          </div>
        </div>
      </div>

 
    </aside>
  );
}