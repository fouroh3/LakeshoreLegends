// src/pages/battle/components/BattleGuildPanel.tsx

const label = "text-[10px] uppercase tracking-widest text-zinc-500";

export default function BattleGuildPanel(props: {
  isTeacher: boolean;
  guildAttacksOpen: boolean;
  groupAction?: "ATTACK" | "HEAL";
  setGroupAction?: (v: "ATTACK" | "HEAL") => void;
}) {
  const { isTeacher, guildAttacksOpen, groupAction, setGroupAction } = props;

  // If you don’t want the right-rail to show group action (because it’s already in top controls),
  // keep this panel but make it “status only”.
  const showButtons = !isTeacher && groupAction && setGroupAction;

  return (
    <div>
      <div className={label}>Guild</div>

      <div className="mt-1 flex items-center justify-between gap-2">
        <div className="text-[11px] text-zinc-400">
          Guild attacks:{" "}
          <span
            className={guildAttacksOpen ? "text-emerald-200" : "text-amber-200"}
          >
            {guildAttacksOpen ? "OPEN" : "CLOSED"}
          </span>
        </div>

        {isTeacher && (
          <span className="text-[11px] text-zinc-500">(Teacher view)</span>
        )}
      </div>

      {showButtons && (
        <div className="mt-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setGroupAction!("ATTACK")}
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
              onClick={() => setGroupAction!("HEAL")}
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

      <div className="mt-3 border-t border-zinc-900/60" />
    </div>
  );
}
