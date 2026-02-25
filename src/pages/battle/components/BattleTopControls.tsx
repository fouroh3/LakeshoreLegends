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
  "rounded-xl border border-zinc-800/70 bg-zinc-950/25 px-3 py-2 text-sm text-zinc-100";
const select =
  "rounded-xl bg-black/40 border border-zinc-800/70 px-3 py-2 text-sm text-white outline-none focus:border-white/25";
const btn =
  "rounded-xl px-3 py-2 text-sm font-semibold border transition disabled:opacity-50 disabled:cursor-not-allowed";
const btnSoft = "border-zinc-800/70 bg-zinc-950/25 hover:bg-zinc-950/35";
const btnCyan = "border-cyan-300/40 bg-cyan-500/15 hover:bg-cyan-500/20";

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
    <div className="rounded-2xl border border-zinc-900/60 bg-zinc-950/15 p-2">
      <div className="flex flex-wrap items-center gap-2">
        {/* Homeroom */}
        <div className="flex items-center gap-2">
          <div className="text-[10px] uppercase tracking-widest text-zinc-500">
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

        {/* Guild */}
        <div className="flex items-center gap-2">
          <div className="text-[10px] uppercase tracking-widest text-zinc-500">
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
          <span className="tabular-nums font-semibold text-white">
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
          <span className="text-[10px] uppercase tracking-widest text-zinc-500 border border-zinc-800/70 bg-zinc-950/25 rounded-xl px-2 py-2">
            Teacher
          </span>
        )}
      </div>
    </div>
  );
}
