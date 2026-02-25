// src/pages/battle/components/BattleTopControls.tsx
import type { Guild } from "../../../types";
import type { BattleControlRow, GroupAction } from "../battleTypes";

const panel =
  "rounded-2xl border border-zinc-800/60 bg-zinc-950/30 p-2 shadow-[0_8px_30px_rgb(0,0,0,0.35)]";
const label = "text-[10px] uppercase tracking-widest text-zinc-500";
const selectClass =
  "w-full rounded-xl border border-zinc-800/70 bg-zinc-950/45 px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500/30";

export default function BattleTopControls(props: {
  isTeacher: boolean;
  activeOptions: BattleControlRow[];
  activeHomeroom: string;
  setActiveHomeroom: (hr: string) => void;

  guildFilter: Guild | "ALL";
  setGuildFilter: (g: Guild | "ALL") => void;
  guildOptions: Guild[];

  selectedCount: number;
  multiSelect: boolean;
  setMultiSelect: (v: boolean) => void;
  clearSelection: () => void;

  groupAction: GroupAction;
  setGroupAction: (v: GroupAction) => void;
}) {
  const {
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
    groupAction,
    setGroupAction,
  } = props;

  return (
    <div className={panel}>
      <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2">
        <div>
          <div className={label}>Active Homeroom</div>
          <select
            className={selectClass}
            value={activeHomeroom}
            onChange={(e) => setActiveHomeroom(e.target.value)}
          >
            {activeOptions.length === 0 ? (
              <option value="">No ACTIVE homerooms</option>
            ) : (
              activeOptions.map((r) => (
                <option key={r.homeroom} value={r.homeroom}>
                  {r.homeroom} · ACTIVE
                </option>
              ))
            )}
          </select>
        </div>

        <div>
          <div className={label}>Guild</div>
          <select
            className={selectClass}
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

        <div>
          <div className={label}>Targets</div>
          <div className="mt-1 flex items-center justify-between gap-2">
            <div className="text-sm font-semibold text-zinc-100">
              {selectedCount} selected
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMultiSelect(!multiSelect)}
                className={[
                  "rounded-xl border px-3 py-2 text-sm font-semibold transition",
                  multiSelect
                    ? "border-cyan-400/60 bg-cyan-400/10 text-cyan-100"
                    : "border-zinc-800/70 bg-zinc-950/40 text-zinc-200 hover:bg-zinc-900/60",
                ].join(" ")}
              >
                {multiSelect ? "Multi" : "Single"}
              </button>

              <button
                type="button"
                onClick={clearSelection}
                className="rounded-xl border border-zinc-800/70 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900/60"
              >
                Clear
              </button>
            </div>
          </div>
          {selectedCount === 0 && (
            <div className="mt-1 text-[11px] text-zinc-500">
              Tap tiles to select.
            </div>
          )}
        </div>
      </div>

      {!isTeacher && (
        <div className="mt-2 rounded-xl border border-zinc-800/60 bg-zinc-950/25 p-2">
          <div className={label}>Group Action</div>
          <div className="mt-1 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setGroupAction("ATTACK")}
              className={[
                "rounded-xl py-2 text-sm font-semibold border transition",
                groupAction === "ATTACK"
                  ? "border-red-400 bg-red-500/10 text-red-100 ring-2 ring-red-400/25"
                  : "border-zinc-800/70 bg-zinc-950/40 text-zinc-200 hover:bg-zinc-900/60",
              ].join(" ")}
            >
              ATTACK
            </button>
            <button
              type="button"
              onClick={() => setGroupAction("HEAL")}
              className={[
                "rounded-xl py-2 text-sm font-semibold border transition",
                groupAction === "HEAL"
                  ? "border-emerald-400 bg-emerald-500/10 text-emerald-100 ring-2 ring-emerald-400/25"
                  : "border-zinc-800/70 bg-zinc-950/40 text-zinc-200 hover:bg-zinc-900/60",
              ].join(" ")}
            >
              HEAL
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
