import type { Student } from "../../../types";
import {
  getStatusPill,
  innerCard,
  label,
  select,
  shellCardBase,
  softPanel,
} from "../storeTheme";
import { cleanText, fullName, initialsForStudent } from "../storeUtils";

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
  guildTheme: {
    border: string;
    pill: string;
    softPanel: string;
    cardGlow: string;
    avatarGlow: string;
    gradient: string;
    shellGlow: string;
    tintBg: string;
  };
};

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
  guildTheme,
}: Props) {
  const selectedStudentId = selected
    ? String((selected as Record<string, unknown>).id ?? "")
    : "";

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
            className={`absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${guildTheme.gradient} opacity-90`}
          />
          <div className="relative flex flex-col items-center text-center">
            <div
              className={`mt-1 flex h-28 w-28 items-center justify-center rounded-[30px] border border-white/[0.05] bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] text-5xl font-bold tracking-tight text-white ${guildTheme.avatarGlow}`}
            >
              {initialsForStudent(selected)}
            </div>

            <div className="mt-4 max-w-full truncate text-2xl font-semibold tracking-tight text-white">
              {selected ? fullName(selected) : "No legend selected"}
            </div>

            <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
              <span className="rounded-full border border-white/[0.05] bg-white/[0.035] px-3 py-1 text-xs text-white/72">
                {selected
                  ? cleanText((selected as Record<string, unknown>).homeroom) ||
                    "—"
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
            </div>

            <div className="mt-3 text-xs text-white/48">
              {selected ? selectedStudentId : "Awaiting selection"}
            </div>
          </div>
        </div>
      </div>

      <div className={`${innerCard} mt-4 px-4 py-4`}>
        <div className="flex items-center justify-between gap-3">
          <div className={label}>Quick Readout</div>
          <span className={getStatusPill(storeLocked)}>
            {storeLocked ? "Closed" : "Open"}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className={`${softPanel} px-3 py-3 text-center`}>
            <div className={label}>XP Balance</div>
            <div className="mt-1 text-2xl font-bold tabular-nums text-white">
              {selected ? summaryBalance ?? "—" : "—"}
            </div>
          </div>
          <div className={`${softPanel} px-3 py-3 text-center`}>
            <div className={label}>Spendable</div>
            <div className="mt-1 text-2xl font-bold tabular-nums text-white">
              {selected ? summarySpendable ?? "—" : "—"}
            </div>
          </div>
        </div>

        {loading && (
          <div className="mt-3 text-sm text-white/62">Loading roster…</div>
        )}
        {err && <div className="mt-3 text-sm text-red-200">{err}</div>}
      </div>
    </aside>
  );
}
