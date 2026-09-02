// src/pages/store/components/StoreModeTabs.tsx

export type StoreMode = "attributes" | "skills";

type Props = {
  mode: StoreMode;
  setMode: (next: StoreMode) => void;
  xpBalance: number | null;
  spendablePoints: number | null;
  skillTokens?: number | null;
};

function modeButtonClass(active: boolean, tone: "cyan" | "violet") {
  const activeClass =
    tone === "cyan"
      ? "border-cyan-200/70 bg-[linear-gradient(180deg,rgba(34,211,238,0.20),rgba(8,25,35,0.94))] ring-2 ring-cyan-300/25 shadow-[0_0_36px_rgba(34,211,238,0.22),inset_0_1px_0_rgba(255,255,255,0.08)] scale-[1.008]"
      : "border-violet-200/70 bg-[linear-gradient(180deg,rgba(139,92,246,0.22),rgba(23,14,43,0.94))] ring-2 ring-violet-300/25 shadow-[0_0_36px_rgba(139,92,246,0.22),inset_0_1px_0_rgba(255,255,255,0.08)] scale-[1.008]";

  return [
    "group relative overflow-hidden rounded-[22px] border px-4 py-4 text-left transition-all duration-300",
    active
      ? activeClass
      : "border-white/[0.05] bg-white/[0.025] opacity-80 hover:border-white/[0.11] hover:bg-white/[0.05] hover:opacity-100",
  ].join(" ");
}

export default function StoreModeTabs({
  mode,
  setMode,
  xpBalance,
  spendablePoints,
  skillTokens = null,
}: Props) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <button
        type="button"
        className={modeButtonClass(mode === "attributes", "cyan")}
        onClick={() => setMode("attributes")}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-cyan-400/10 to-transparent" />
        <div className="relative z-10 flex items-start justify-between gap-4">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200/70">
              Attribute Upgrades
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <div className="text-xl font-semibold text-white">Spend XP</div>
              {mode === "attributes" ? (
                <span className="inline-flex items-center rounded-full border border-cyan-200/40 bg-cyan-300 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-slate-950 shadow-[0_0_18px_rgba(34,211,238,0.38)]">
                  ✓ Selected
                </span>
              ) : null}
            </div>
            <div className="mt-1 text-sm leading-5 text-white/56">
              Increase Strength, Dexterity, Constitution, Intelligence, Wisdom,
              or Charisma.
            </div>
          </div>

          <div className="shrink-0 rounded-2xl border border-white/[0.06] bg-black/20 px-3 py-2 text-right">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/38">
              XP
            </div>
            <div className="text-lg font-black text-white">
              {xpBalance ?? "—"}
            </div>
            <div className="text-[10px] text-white/42">
              {spendablePoints ?? "—"} point{spendablePoints === 1 ? "" : "s"}
            </div>
          </div>
        </div>
      </button>

      <button
        type="button"
        className={modeButtonClass(mode === "skills", "violet")}
        onClick={() => setMode("skills")}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-violet-400/10 to-transparent" />
        <div className="relative z-10 flex items-start justify-between gap-4">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-violet-200/70">
              Skill Training
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <div className="text-xl font-semibold text-white">Spend Skill Tokens</div>
              {mode === "skills" ? (
                <span className="inline-flex items-center rounded-full border border-violet-200/40 bg-violet-300 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-slate-950 shadow-[0_0_18px_rgba(139,92,246,0.38)]">
                  ✓ Selected
                </span>
              ) : null}
            </div>
            <div className="mt-1 text-sm leading-5 text-white/56">
              Unlock new skills that appear on dashboard cards and battle cards.
            </div>
          </div>

          <div className="shrink-0 rounded-2xl border border-white/[0.06] bg-black/20 px-3 py-2 text-right">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/38">
              Tokens
            </div>
            <div className="text-lg font-black text-white">
              {skillTokens ?? "Soon"}
            </div>
            <div className="text-[10px] text-white/42">1 per skill</div>
          </div>
        </div>
      </button>
    </div>
  );
}
