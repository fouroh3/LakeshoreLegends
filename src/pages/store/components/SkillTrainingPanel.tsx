// src/pages/store/components/SkillTrainingPanel.tsx

import { useEffect, useMemo, useState } from "react";
import { normalizeSkillName, skillLibrary } from "../../../data/skillLibrary";
import {
  getSkillSummary,
  purchaseSkill,
  type SkillSummary,
} from "../../../skillApi";
import { innerCard, label } from "../storeTheme";

type Props = {
  studentId: string;
  selectedSkillId: string | null;
  setSelectedSkillId: (next: string | null) => void;
  ownedSkillIds: Set<string>;
  storeLocked: boolean;
  pin: string;
  confirmOk: boolean;
  guildTheme: {
    border: string;
    softPanel: string;
    cardGlow: string;
    text: string;
    accent: string;
  };
};

export default function SkillTrainingPanel({
  studentId,
  selectedSkillId,
  setSelectedSkillId,
  ownedSkillIds,
  storeLocked,
  pin,
  confirmOk,
  guildTheme,
}: Props) {
  const [summary, setSummary] = useState<SkillSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [lastPurchasedSkillId, setLastPurchasedSkillId] = useState<string | null>(
    null
  );

  useEffect(() => {
    let alive = true;

    (async () => {
      if (!studentId) {
        setSummary(null);
        return;
      }

      try {
        setLoading(true);
        setErr(null);
        const next = await getSkillSummary(studentId);
        if (!alive) return;
        setSummary(next);
      } catch (e) {
        if (!alive) return;
        setSummary(null);
        setErr(
          e instanceof Error
            ? e.message
            : "Skill Tokens are not available yet."
        );
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [studentId]);

  const purchasedSkillIds = useMemo(() => {
    return new Set(
      (summary?.purchasedSkills ?? [])
        .map((skill) => normalizeSkillName(skill))
        .filter(Boolean)
    );
  }, [summary?.purchasedSkills]);

  const allOwnedSkillIds = useMemo(() => {
    return new Set([...Array.from(ownedSkillIds), ...Array.from(purchasedSkillIds)]);
  }, [ownedSkillIds, purchasedSkillIds]);

  const selectedSkill =
    skillLibrary.find((skill) => skill.id === selectedSkillId) ?? null;
  const selectedOwned = selectedSkill
    ? allOwnedSkillIds.has(selectedSkill.id)
    : false;
  const skillTokens = summary?.skillTokens ?? 0;
  const skillCost = Math.max(1, summary?.skillCost ?? 1);
  const canAfford = skillTokens >= skillCost;
  const canBuy =
    !!selectedSkill &&
    !selectedOwned &&
    !storeLocked &&
    !loading &&
    !purchasing &&
    !err &&
    !!pin.trim() &&
    confirmOk &&
    canAfford;

  async function handleBuySkill() {
    if (!selectedSkill || !studentId) return;

    setPurchasing(true);
    setErr(null);

    try {
      const requestId = `skill:${studentId}:${selectedSkill.id}:${Date.now()}:${Math.random()
        .toString(16)
        .slice(2)}`;

      const res = await purchaseSkill({
        studentId,
        skillId: selectedSkill.id,
        skillName: selectedSkill.name,
        pin: pin.trim(),
        requestId,
      });

      if (res?.summary) {
        setSummary(res.summary as SkillSummary);
      } else {
        const next = await getSkillSummary(studentId);
        setSummary(next);
      }

      setLastPurchasedSkillId(selectedSkill.id);

      window.setTimeout(() => {
        setLastPurchasedSkillId(null);
      }, 2400);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Skill purchase failed.");
    } finally {
      setPurchasing(false);
    }
  }

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
              Spend Skill Tokens to unlock a new permanent skill.
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="self-start rounded-full border border-violet-300/15 bg-violet-400/[0.08] px-3 py-1 text-[11px] text-violet-100">
              Cost: {skillCost} Skill Token{skillCost === 1 ? "" : "s"}
            </div>
            <div className="self-start rounded-full border border-cyan-300/15 bg-cyan-400/[0.08] px-3 py-1 text-[11px] text-cyan-100">
              Tokens: {loading ? "…" : err ? "—" : skillTokens}
            </div>
          </div>
        </div>

        {err && (
          <div className="mt-4 rounded-2xl border border-amber-300/16 bg-amber-400/[0.08] px-3 py-2 text-xs leading-5 text-amber-100">
            {err}
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:mt-5">
          {skillLibrary.map((skill) => {
            const owned = allOwnedSkillIds.has(skill.id);
            const isSelected = selectedSkillId === skill.id;

            return (
              <button
                key={skill.id}
                type="button"
                onClick={() => setSelectedSkillId(isSelected ? null : skill.id)}
                className={[
                  "group relative overflow-hidden rounded-[18px] border px-3.5 py-3.5 text-left transition-all duration-300",
                  isSelected && !owned
                    ? "border-cyan-200/85 bg-[linear-gradient(180deg,rgba(17,88,104,0.64),rgba(5,24,33,0.98))] ring-2 ring-cyan-300/35 shadow-[0_0_32px_rgba(34,211,238,0.26),inset_0_1px_0_rgba(255,255,255,0.09)] scale-[1.012]"
                    : isSelected && owned
                    ? "border-emerald-200/70 bg-[linear-gradient(180deg,rgba(16,94,72,0.48),rgba(5,29,23,0.98))] ring-2 ring-emerald-300/28 shadow-[0_0_28px_rgba(52,211,153,0.20),inset_0_1px_0_rgba(255,255,255,0.07)] scale-[1.008]"
                    : owned
                    ? "border-emerald-300/22 bg-[linear-gradient(180deg,rgba(16,74,58,0.24),rgba(7,20,18,0.88))] hover:border-emerald-300/34 hover:bg-[linear-gradient(180deg,rgba(16,82,63,0.30),rgba(7,22,19,0.92))]"
                    : "border-cyan-200/[0.10] bg-[linear-gradient(180deg,rgba(17,23,33,0.80),rgba(7,10,16,0.94))] hover:border-cyan-200/24 hover:bg-[linear-gradient(180deg,rgba(20,31,43,0.90),rgba(8,13,21,0.96))] hover:shadow-[0_0_20px_rgba(34,211,238,0.08)]",
                ].join(" ")}
              >
                <div
                  className={[
                    "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r",
                    isSelected && !owned
                      ? "from-transparent via-cyan-100 to-transparent"
                      : owned
                      ? "from-transparent via-emerald-300/70 to-transparent"
                      : "from-transparent via-cyan-300/30 to-transparent",
                  ].join(" ")}
                />

                <div
                  className={[
                    "pointer-events-none absolute bottom-0 left-0 top-0 w-[3px] transition-all duration-300",
                    isSelected && !owned
                      ? "bg-cyan-300 shadow-[0_0_14px_rgba(34,211,238,0.60)]"
                      : owned
                      ? "bg-emerald-400/70"
                      : "bg-cyan-300/18",
                  ].join(" ")}
                />

                <div className="min-h-[44px] pr-1 pl-1">
                  <div
                    className={[
                      "whitespace-normal break-words text-[15px] font-semibold leading-[1.35]",
                      owned && !isSelected ? "text-emerald-50/88" : "text-white",
                    ].join(" ")}
                  >
                    {skill.name}
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between gap-2 pl-1">
                  <div
                    className={[
                      "flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.17em]",
                      owned
                        ? "text-emerald-200"
                        : isSelected
                        ? "text-cyan-100"
                        : "text-cyan-100/58",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "flex h-4 w-4 items-center justify-center rounded-full border text-[9px] leading-none",
                        owned
                          ? "border-emerald-300/30 bg-emerald-400/15 text-emerald-200"
                          : isSelected
                          ? "border-cyan-100/40 bg-cyan-300 text-slate-950"
                          : "border-cyan-300/25 bg-cyan-300/[0.06] text-cyan-200/70",
                      ].join(" ")}
                    >
                      {owned || isSelected ? "✓" : "•"}
                    </span>
                    {owned ? "Owned" : isSelected ? "Selected" : "Available"}
                  </div>

                  <span
                    className={[
                      "shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold",
                      owned
                        ? "border-emerald-300/22 bg-emerald-400/[0.10] text-emerald-100/88"
                        : isSelected
                        ? "border-cyan-100/50 bg-cyan-300 text-slate-950 shadow-[0_0_14px_rgba(34,211,238,0.34)]"
                        : "border-cyan-200/[0.10] bg-cyan-300/[0.04] text-cyan-50/60",
                    ].join(" ")}
                  >
                    {owned
                      ? "Already owned"
                      : `${skillCost} Token${skillCost === 1 ? "" : "s"}`}
                  </span>
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
                {selectedOwned ? "Owned" : `${skillCost} Token${skillCost === 1 ? "" : "s"}`}
              </span>
            </div>

            <div className="mt-5 rounded-2xl border border-white/[0.05] bg-black/20 px-4 py-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/54">Cost</span>
                <span className="font-semibold text-white">{skillCost} Skill Token{skillCost === 1 ? "" : "s"}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-white/54">Tokens Available</span>
                <span className="font-semibold text-white">
                  {loading ? "…" : err ? "—" : skillTokens}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-white/54">After Purchase</span>
                <span className="font-semibold text-cyan-100">
                  {selectedOwned ? skillTokens : Math.max(0, skillTokens - skillCost)}
                </span>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-cyan-300/10 bg-cyan-400/[0.06] px-4 py-3">
              <div className="text-sm font-semibold text-cyan-100">
                Where this will show
              </div>
              <div className="mt-1 text-xs leading-5 text-cyan-100/62">
                Purchased skills will appear on the dashboard card, profile
                modal, and battle card after the purchased-skill display layer is
                connected.
              </div>
            </div>

            <button
              type="button"
              disabled={!canBuy || lastPurchasedSkillId === selectedSkill.id}
              onClick={() => {
                void handleBuySkill();
              }}
              className={[
                "mt-5 w-full rounded-[24px] px-5 py-4 text-[15px] font-semibold tracking-tight transition-all duration-200",
                lastPurchasedSkillId === selectedSkill.id
                  ? "border border-emerald-300/20 bg-emerald-400/[0.14] text-emerald-100 shadow-[0_0_28px_rgba(52,211,153,0.16)]"
                  : canBuy
                  ? "bg-[linear-gradient(180deg,#a78bfa,#67e8f9)] text-slate-950 shadow-[0_0_28px_rgba(34,211,238,0.24)] hover:scale-[1.02]"
                  : "cursor-not-allowed border border-white/[0.05] bg-white/[0.04] text-white/38",
              ].join(" ")}
            >
              {lastPurchasedSkillId === selectedSkill.id
                ? `Purchased — ${selectedSkill.name}`
                : selectedOwned
                ? "Already Owned"
                : purchasing
                ? "Processing Purchase..."
                : storeLocked
                ? "Store Closed"
                : !pin.trim()
                ? "Enter Store PIN"
                : !confirmOk
                ? "Confirm StudentID"
                : err
                ? "Skill Backend Needed"
                : !canAfford
                ? "Not Enough Skill Tokens"
                : `Buy ${selectedSkill.name} (${skillCost} Token${skillCost === 1 ? "" : "s"})`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
