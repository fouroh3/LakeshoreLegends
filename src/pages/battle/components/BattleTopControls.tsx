// src/pages/battle/components/BattleTopControls.tsx
import type { Guild } from "../../../types";

type ActiveOption = { homeroom: string; sessionId: string };

type Props = {
  isTeacher: boolean;

  activeOptions: ActiveOption[];
  activeHomeroom: string;
  setActiveHomeroom: (hr: string) => void;

  guildFilter: Guild | "ALL";
  setGuildFilter: (g: Guild | "ALL") => void;
  guildOptions: Guild[];

  selectedCount: number;

  multiSelect: boolean;
  setMultiSelect: (v: boolean) => void;

  clearSelection: () => void;
};

const chip =
  "rounded-full border border-cyan-300/15 bg-cyan-400/[0.06] px-3 py-1.5 text-xs font-black text-cyan-100";
const select =
  "rounded-xl border border-cyan-300/20 bg-black/45 px-3 py-2 text-sm font-bold text-white outline-none focus:border-cyan-300/55";
const btn =
  "rounded-xl border px-3 py-2 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-50";
const btnSoft =
  "border-zinc-800/70 bg-black/25 text-zinc-300 hover:border-white/15 hover:bg-white/[0.06]";
const btnCyan =
  "border-cyan-300/35 bg-cyan-400/12 text-cyan-50 shadow-[0_0_18px_rgba(34,211,238,0.08)]";

export default function BattleTopControls({
  isTeacher,
  activeOptions,
  activeHomeroom,
  setActiveHomeroom,
  guildFilter,
  setGuildFilter,
  guildOptions,
  selectedCount,
  multiSelect,
  setMultiSelect,
  clearSelection,
}: Props) {
  return (
    <section className="rounded-[22px] border border-cyan-300/15 bg-[linear-gradient(135deg,rgba(8,28,38,0.68),rgba(10,10,16,0.96))] p-3 shadow-[0_14px_38px_rgba(0,0,0,0.28)]">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 rounded-2xl border border-zinc-800/70 bg-black/20 px-3 py-2">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300/70">
            Homeroom
          </div>
          <select
            className={select}
            value={activeHomeroom}
            onChange={(e) => setActiveHomeroom(e.target.value)}
          >
            {activeOptions.length === 0 ? (
              <option value="">No ACTIVE battles</option>
            ) : (
              activeOptions.map((o) => (
                <option key={`${o.homeroom}:${o.sessionId}`} value={o.homeroom}>
                  {o.homeroom}
                </option>
              ))
            )}
          </select>
        </div>

        <div className="flex items-center gap-2 rounded-2xl border border-zinc-800/70 bg-black/20 px-3 py-2">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300/70">
            Guild
          </div>
          <select
            className={select}
            value={guildFilter}
            onChange={(e) => setGuildFilter(e.target.value as any)}
          >
            <option value="ALL">All guilds</option>
            {guildOptions.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1" />

        <div className={chip}>
          Selected{" "}
          <span className="tabular-nums text-white">
            {selectedCount}
          </span>
        </div>

        <button
          type="button"
          className={`${btn} ${multiSelect ? btnCyan : btnSoft}`}
          onClick={() => setMultiSelect(!multiSelect)}
          title="Toggle multi-select"
        >
          {multiSelect ? "Multi: ON" : "Multi: OFF"}
        </button>

        <button
          type="button"
          className={`${btn} ${btnSoft}`}
          onClick={clearSelection}
          disabled={selectedCount === 0}
        >
          Clear
        </button>

        {isTeacher && (
          <span className="rounded-full border border-amber-300/25 bg-amber-400/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-amber-100">
            Teacher
          </span>
        )}
      </div>
    </section>
  );
}
