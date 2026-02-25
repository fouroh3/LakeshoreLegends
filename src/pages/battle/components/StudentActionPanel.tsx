// src/pages/battle/components/StudentActionPanel.tsx
import type { Student } from "../../../types";

const innerPanel = "rounded-xl border border-zinc-800/55 bg-zinc-950/25 p-2";
const label = "text-[10px] uppercase tracking-widest text-zinc-500";
const selectClass =
  "w-full rounded-xl border border-zinc-800/70 bg-zinc-950/45 px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500/30";

const damageOptions = [-1, -2, -3, -4, -5];
const healOptions = [1, 2, 3, 4, 5];

export default function StudentActionPanel(props: {
  selectedCount: number;
  studentControlsDisabled: boolean;

  delta: number;
  setDelta: (n: number) => void;

  note: string;
  setNote: (s: string) => void;

  selectedStudents: Student[];
  selectedSkills: string[];

  submitting: boolean;
  onSubmit: () => void;

  banner: { type: "ok" | "err"; msg: string } | null;
}) {
  const {
    selectedCount,
    studentControlsDisabled,
    delta,
    setDelta,
    note,
    setNote,
    selectedStudents,
    selectedSkills,
    submitting,
    onSubmit,
    banner,
  } = props;

  return (
    <div>
      <div className="flex items-center gap-2">
        <div className={label}>Damage / Heal</div>
        <div className="flex-1" />
        <div className="text-[11px] text-zinc-400">
          Targets: <span className="text-zinc-200">{selectedCount}</span>
        </div>
      </div>

      {studentControlsDisabled && (
        <div className="mt-2 rounded-xl border border-zinc-800/60 bg-zinc-950/20 p-2 text-[11px] text-zinc-400">
          Group Action is ATTACK. Student damage/heal submit is disabled.
        </div>
      )}

      <div
        className={
          studentControlsDisabled
            ? "mt-2 opacity-40 pointer-events-none"
            : "mt-2"
        }
      >
        <div className={label + " mb-1"}>Damage</div>
        <div className="grid grid-cols-5 gap-2">
          {damageOptions.map((d) => {
            const active = delta === d;
            return (
              <button
                key={d}
                type="button"
                onClick={() => setDelta(d)}
                className={[
                  "rounded-xl py-2 text-sm font-semibold border transition",
                  active
                    ? "border-red-400 bg-red-500/10 text-red-100 ring-2 ring-red-400/25"
                    : "border-zinc-800/70 bg-zinc-950/40 text-zinc-200 hover:bg-zinc-900/60",
                ].join(" ")}
              >
                {d}
              </button>
            );
          })}
        </div>

        <div className={"mt-2 " + label + " mb-1"}>Heal</div>
        <div className="grid grid-cols-5 gap-2">
          {healOptions.map((d) => {
            const active = delta === d;
            return (
              <button
                key={d}
                type="button"
                onClick={() => setDelta(d)}
                className={[
                  "rounded-xl py-2 text-sm font-semibold border transition",
                  active
                    ? "border-emerald-400 bg-emerald-500/10 text-emerald-100 ring-2 ring-emerald-400/25"
                    : "border-zinc-800/70 bg-zinc-950/40 text-zinc-200 hover:bg-zinc-900/60",
                ].join(" ")}
              >
                +{d}
              </button>
            );
          })}
        </div>

        <div className="mt-3 border-t border-zinc-900/60" />

        <div className="mt-3">
          <div className={label + " mb-1"}>Note</div>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional (what happened)"
            className={selectClass}
          />
        </div>

        {selectedStudents.length === 1 && (
          <div className="mt-2">
            <div className={label + " mb-1"}>Full Skills</div>
            <div className={innerPanel}>
              {selectedSkills.length === 0 ? (
                <div className="text-[11px] text-zinc-500">
                  No skills listed.
                </div>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {selectedSkills.map((sk) => (
                    <span
                      key={sk}
                      className="rounded-full border border-zinc-800/70 bg-zinc-950/35 px-2 py-0.5 text-[11px] text-zinc-200"
                    >
                      {sk}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {selectedStudents.length > 1 && (
          <div className="mt-2 text-[11px] text-zinc-500">
            Full skills hidden in multi-target mode.
          </div>
        )}

        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          className={[
            "mt-2 rounded-2xl px-6 py-3 text-sm font-semibold transition border w-full",
            submitting
              ? "border-zinc-800/70 bg-zinc-900/60 text-zinc-400 cursor-not-allowed"
              : "border-cyan-300/60 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/15 ring-1 ring-cyan-300/15",
          ].join(" ")}
        >
          {submitting ? "Submitting…" : "Submit"}
        </button>

        {banner && (
          <div
            className={[
              "mt-2 rounded-xl px-3 py-2 text-sm border",
              banner.type === "ok"
                ? "border-emerald-900/50 bg-emerald-950/30 text-emerald-200"
                : "border-red-900/50 bg-red-950/30 text-red-200",
            ].join(" ")}
          >
            {banner.msg}
          </div>
        )}
      </div>
    </div>
  );
}
