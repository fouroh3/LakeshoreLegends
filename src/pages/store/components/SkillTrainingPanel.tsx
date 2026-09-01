// src/pages/store/components/SkillTrainingPanel.tsx

import { skillLibrary } from "../../../data/skillLibrary";
import { innerCard, label } from "../storeTheme";

type Props = {
  selectedSkillId: string | null;
  setSelectedSkillId: (next: string | null) => void;
  ownedSkillIds: Set<string>;
  skillTokens?: number | null;
  guildTheme: {
    border: string;
    softPanel: string;
    cardGlow: string;
    text: string;
    accent: string;
  };
};

export default function SkillTrainingPanel({
  selectedSkillId,
  setSelectedSkillId,
  ownedSkillIds,
  skillTokens = null,
  guildTheme,
}: Props) {
  const selectedSkill =
    skillLibrary.find((skill) => skill.id === selectedSkillId) ?? null;
  const selectedOwned = selectedSkill
    ? ownedSkillIds.has(selectedSkill.id)
    : false;
  const canAfford = typeof skillTokens === "number" && skillTokens >= 1;

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_360px] xl:gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
      <div className={`${innerCard} px-3 py-3 xl:px-5 xl:py-5`}>
        <div className="flex flex-col gap-2 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className={`${label} flex items-center gap-2`}>
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-300/20 text-[11px] font-black text-violet-100">
                S
              </span>
              Pick Skill
            </div>

            <div className="mt-1 text-lg font-semibold tracking-tight text-white xl:text-xl">
              Skill Training
            </div>

            <div className="mt-1 text-xs text-white/56 xl:text-sm">
              Select a skill to preview it. Owned skills are clearly marked.
            </div>
          </div>

          <div className="self-start rounded-full border border-violet-300/15 bg-violet-400/[0.08] px-3 py-1 text-[11px] text-violet-100">
            Cost: 1 Skill Token
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:mt-5 xl:grid-cols-3">
          {skillLibrary.map((skill) => {
            const owned = ownedSkillIds.has(skill.id);
            const isSelected = selectedSkillId === skill.id;

            return (
              <button
                key={skill.id}
                type="button"
                onClick={() => setSelectedSkillId(isSelected ? null : skill.id)}
                className={[
                  "group relative overflow-hidden rounded-[18px] border px-3 py-3 text-left transition-all duration-300",
                  isSelected
                    ? `${guildTheme.border} ${guildTheme.softPanel} ${guildTheme.cardGlow} ring-1 ring-cyan-300/15`
                    : "border-white/[0.05] bg-[linear-gradient(180deg,rgba(18,22,31,0.62),rgba(8,10,16,0.78))] hover:border-white/[0.09]",
                  owned ? "opacity-70" : "",
                ].join(" ")}
              >
                <div
                  className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r ${guildTheme.accent}`}
                />

                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-white">
                      {skill.name}
                    </div>
                    <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/36">
                      {owned ? "Owned" : "Available"}
                    </div>
                  </div>

                  <span
                    className={[
                      "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                      owned
                        ? "border-emerald-300/20 bg-emerald-400/[0.10] text-emerald-100"
                        : isSelected
                        ? "border-cyan-300/20 bg-cyan-400/[0.12] text-cyan-100"
                        : "border-white/[0.06] bg-white/[0.04] text-white/56",
                    ].join(" ")}
                  >
                    {owned ? "Owned" : "1 Token"}
                  </span>
                </div>

                <div className="mt-3 text-xs leading-5 text-white/50">
                  {owned
                    ? "This skill is already on this legend."
                    : "Unlock this skill for this legend."}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div
        className={[
          innerCard,
          selectedSkill ? guildTheme.border : "",
          selectedSkill ? guildTheme.softPanel : "",
          selectedSkill ? guildTheme.cardGlow : "",
          "self-start px-5 py-5 xl:sticky xl:top-24",
        ].join(" ")}
      >
        <div className={`${label} flex items-center gap-2`}>
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-300/20 text-[11px] font-black text-violet-100">
            R
          </span>
          Skill Review
        </div>

        {!selectedSkill && (
          <div className="mt-4 rounded-2xl border border-white/[0.04] bg-black/16 px-4 py-3 text-sm text-white/54">
            Choose a skill to preview the purchase.
          </div>
        )}

        {selectedSkill && (
          <div className="mt-4 rounded-[26px] border border-white/[0.06] bg-[linear-gradient(180deg,rgba(20,27,38,0.88),rgba(10,14,22,0.96))] px-5 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-2xl font-semibold text-white">
                  {selectedSkill.name}
                </div>
                <div className="mt-1 text-xs uppercase tracking-[0.22em] text-white/38">
                  Skill Training
                </div>
              </div>

              <span
                className={[
                  "rounded-full border px-3 py-1 text-xs font-semibold",
                  selectedOwned
                    ? "border-emerald-300/20 bg-emerald-400/[0.12] text-emerald-100"
                    : "border-violet-300/20 bg-violet-400/[0.12] text-violet-100",
                ].join(" ")}
              >
                {selectedOwned ? "Owned" : "1 Token"}
              </span>
            </div>

            <div className="mt-5 rounded-2xl border border-white/[0.05] bg-black/20 px-4 py-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/54">Cost</span>
                <span className="font-semibold text-white">1 Skill Token</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-white/54">Tokens Available</span>
                <span className="font-semibold text-white">
                  {skillTokens ?? "Coming soon"}
                </span>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-cyan-300/10 bg-cyan-400/[0.06] px-4 py-3">
              <div className="text-sm font-semibold text-cyan-100">
                Where this will show
              </div>
              <div className="mt-1 text-xs leading-5 text-cyan-100/62">
                Purchased skills will appear on the dashboard card, profile
                modal, and battle card once the skill-purchase backend is wired.
              </div>
            </div>

            <button
              type="button"
              disabled
              className="mt-5 w-full cursor-not-allowed rounded-[24px] border border-white/[0.05] bg-white/[0.04] px-5 py-4 text-[15px] font-semibold tracking-tight text-white/38"
            >
              {selectedOwned
                ? "Already Owned"
                : canAfford
                ? "Skill Purchase Backend Coming Next"
                : "Skill Tokens Coming Next"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
