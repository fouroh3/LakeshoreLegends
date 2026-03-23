import type { Student } from "../../../types";
import { hpStatus } from "../../../utils/hpStatus";
import {
  getStatusPill,
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
  rosterBaseAttr,
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

function statChip(labelText: string, value: number) {
  return (
    <div className="rounded-2xl border border-white/[0.05] bg-white/[0.03] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]">
      <div className="text-[10px] uppercase tracking-[0.2em] text-white/40">
        {labelText}
      </div>
      <div className="mt-1 text-base font-semibold tabular-nums text-white">
        {value}
      </div>
    </div>
  );
}

function readoutTile(
  title: string,
  value: string | number,
  subtitle: string,
  accentClass = ""
) {
  return (
    <div
      className={`rounded-[22px] border border-white/[0.05] bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02))] px-4 py-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] ${accentClass}`}
    >
      <div className="text-[10px] uppercase tracking-[0.22em] text-white/42">
        {title}
      </div>
      <div className="mt-2 text-3xl font-bold leading-none tabular-nums text-white">
        {value}
      </div>
      <div className="mt-2 text-xs text-white/46">{subtitle}</div>
    </div>
  );
}

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
  summaryBalance,
  summarySpendable,
  storeLocked,
  loading,
  err,
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

  const readoutGlow = !selected
    ? ""
    : storeLocked
    ? "shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_14px_28px_rgba(0,0,0,0.22)]"
    : "shadow-[0_0_0_1px_rgba(34,211,238,0.10),0_18px_36px_rgba(14,165,233,0.08)]";

  const str = selected ? rosterBaseAttr(selected, "STR") : 0;
  const dex = selected ? rosterBaseAttr(selected, "DEX") : 0;
  const con = selected ? rosterBaseAttr(selected, "CON") : 0;
  const intVal = selected ? rosterBaseAttr(selected, "INT") : 0;

  return (
    <aside
      className={`${shellCardBase} ${guildTheme.border} ${guildTheme.tintBg} px-4 py-4 sm:px-5 ${guildTheme.shellGlow}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.24em] text-white/42">
            Legend Selection
          </div>
          <div className="mt-1 text-xl font-semibold tracking-tight text-white">
            Choose your legend
          </div>
        </div>
        <div className="rounded-full border border-white/[0.05] bg-white/[0.035] px-3 py-1 text-xs text-white/56">
          {studentsForPick.length || 0} shown
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <div className={`${softPanel} px-3 py-3`}>
          <div className={label}>Homeroom</div>
          <div className="relative mt-1.5">
            <select
              className={select}
              value={hr}
              onChange={(e) => setHr(e.target.value)}
              disabled={homerooms.length === 0}
            >
              <option value="">Select…</option>
              {homerooms.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/36">
              ▾
            </div>
          </div>
        </div>

        <div className={`${softPanel} px-3 py-3`}>
          <div className={label}>Guild</div>
          <div className="relative mt-1.5">
            <select
              className={select}
              value={guild}
              onChange={(e) => setGuild(e.target.value)}
              disabled={!hr}
            >
              <option value="">
                {hr ? "All guilds" : "Select homeroom first"}
              </option>
              {guildsForHr.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/36">
              ▾
            </div>
          </div>
        </div>

        <div className={`${softPanel} px-3 py-3`}>
          <div className={label}>Student</div>
          <div className="relative mt-1.5">
            <select
              className={`${select} ${
                selected ? `${guildTheme.border} ${guildTheme.softPanel}` : ""
              }`}
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              disabled={!hr}
            >
              <option value="">
                {hr ? "Select…" : "Select homeroom first"}
              </option>
              {studentsForPick.map((s) => {
                const id = String((s as Record<string, unknown>).id ?? "");
                return (
                  <option key={id} value={id}>
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
        className={`${innerCard} mt-4 overflow-hidden px-4 py-4 ${
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

            <div className="mt-4 grid grid-cols-2 gap-2">
              {statChip("Strength", str)}
              {statChip("Dexterity", dex)}
              {statChip("Constitution", con)}
              {statChip("Intelligence", intVal)}
            </div>
          </div>
        </div>
      </div>

      <div
        className={`${innerCard} mt-4 overflow-hidden px-4 py-4 ${readoutGlow}`}
      >
        <div className="relative">
          <div className="absolute inset-x-0 top-0 h-20 bg-[linear-gradient(180deg,rgba(255,255,255,0.035),transparent)]" />

          <div className="relative">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className={label}>Quick Readout</div>
                <div className="mt-1 text-lg font-semibold tracking-tight text-white">
                  Store Readiness
                </div>
              </div>
              <span className={getStatusPill(storeLocked)}>
                {storeLocked ? "Closed" : "Open"}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {readoutTile(
                "XP Balance",
                selected ? summaryBalance ?? "—" : "—",
                selected ? "Total stored XP" : "Select a legend first",
                "shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_10px_22px_rgba(0,0,0,0.18)]"
              )}

              {readoutTile(
                "Spendable",
                selected ? summarySpendable ?? "—" : "—",
                selected ? "Available points now" : "Awaiting selection",
                !storeLocked
                  ? "shadow-[0_0_0_1px_rgba(34,211,238,0.08),0_12px_24px_rgba(14,165,233,0.08)]"
                  : "shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_10px_22px_rgba(0,0,0,0.18)]"
              )}
            </div>

            <div className="mt-4 rounded-[18px] border border-white/[0.05] bg-white/[0.025] px-3.5 py-3">
              {loading ? (
                <div className="text-sm text-white/62">Loading roster…</div>
              ) : err ? (
                <div className="text-sm text-red-200">{err}</div>
              ) : !selected ? (
                <div className="text-sm text-white/52">
                  Select a legend to load XP totals and purchase readiness.
                </div>
              ) : storeLocked ? (
                <div className="text-sm text-white/56">
                  The store is currently locked. XP is visible, but purchases
                  are disabled until it opens.
                </div>
              ) : (
                <div className="text-sm text-white/60">
                  Legend is loaded. Enter the Store PIN and confirm the ID to
                  begin upgrades.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
