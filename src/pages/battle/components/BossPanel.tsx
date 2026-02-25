// src/pages/battle/components/BossPanel.tsx
import { useEffect, useMemo, useState } from "react";
import type { BossState } from "../../../bossApi";
import { hpBarColorFromPct } from "../../../utils/hpColor";

const selectClass =
  "w-full rounded-xl border border-zinc-800/70 bg-zinc-950/45 px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500/30";

export default function BossPanel(props: {
  hasBossConfigured: boolean;
  bossName: string;
  boss: BossState | null;
  bossErr: string | null;

  bossSubmitting: boolean;
  bossDamage: string;
  setBossDamage: (v: string) => void;

  bossNote: string;
  setBossNote: (v: string) => void;

  onSubmitBossAttack: () => void;
  bossSubmitErr: string | null;

  // ✅ NEW: success/error banner + cooldown
  bossBanner: { type: "ok" | "err"; msg: string } | null;
  bossCooldownUntil: number;

  studentHealMode: boolean;
  studentAttackMode: boolean;
  guildAttacksOpen: boolean;
  isTeacher: boolean;
}) {
  const {
    hasBossConfigured,
    bossName,
    boss,
    bossErr,
    bossSubmitting,
    bossDamage,
    setBossDamage,
    bossNote,
    setBossNote,
    onSubmitBossAttack,
    bossSubmitErr,
    bossBanner,
    bossCooldownUntil,
    studentHealMode,
    studentAttackMode,
    guildAttacksOpen,
    isTeacher,
  } = props;

  const bossPct = useMemo(() => {
    if (!boss) return 0;
    return Math.max(0, Math.min(1, boss.currentHP / Math.max(1, boss.maxHP)));
  }, [boss]);

  // ✅ cooldown timer (for button label + disable)
  const [cooldownMsLeft, setCooldownMsLeft] = useState(0);

  useEffect(() => {
    const tick = () => {
      const left = Math.max(0, bossCooldownUntil - Date.now());
      setCooldownMsLeft(left);
    };
    tick();
    const t = window.setInterval(tick, 100);
    return () => window.clearInterval(t);
  }, [bossCooldownUntil]);

  const onCooldown = cooldownMsLeft > 0;

  const disableBossApply =
    bossSubmitting ||
    onCooldown ||
    (!isTeacher && studentAttackMode && !guildAttacksOpen);

  const cooldownLabel = onCooldown
    ? `Wait ${(cooldownMsLeft / 1000).toFixed(1)}s`
    : null;

  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-zinc-500">
        Boss
      </div>

      {!hasBossConfigured ? (
        <div className="mt-2 rounded-xl border border-zinc-800/60 bg-zinc-950/20 p-2 text-[11px] text-zinc-400">
          No boss configured for this battle yet. Set BossKey in Battle_Control
          …
        </div>
      ) : (
        <div className="mt-2">
          <div className="text-sm font-semibold text-zinc-100">{bossName}</div>
          <div className="text-[11px] text-zinc-400 tabular-nums">
            {boss ? `${boss.currentHP}/${boss.maxHP}` : "Loading..."}
          </div>

          <div className="mt-1 h-2 w-full rounded-full bg-zinc-900/70 border border-zinc-800/65 overflow-hidden">
            <div
              className="h-full transition-[width] duration-300"
              style={{
                width: `${Math.round(bossPct * 100)}%`,
                backgroundColor: hpBarColorFromPct(bossPct),
              }}
            />
          </div>

          {/* ✅ Boss success/error banner (shows even when there isn't an error) */}
          {bossBanner && (
            <div
              className={[
                "mt-2 rounded-xl px-3 py-2 text-sm border",
                bossBanner.type === "ok"
                  ? "border-emerald-900/40 bg-emerald-950/25 text-emerald-200"
                  : "border-red-900/50 bg-red-950/30 text-red-200",
              ].join(" ")}
            >
              {bossBanner.msg}
            </div>
          )}

          {studentHealMode ? (
            <div className="mt-2 text-[11px] text-zinc-500">
              Group Action is HEAL. Boss attacks are disabled.
            </div>
          ) : (
            <>
              <div className="mt-2 text-[10px] uppercase tracking-widest text-zinc-500 mb-1">
                Guild Total Attack
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={bossDamage}
                  onChange={(e) => setBossDamage(e.target.value)}
                  className={selectClass}
                  disabled={bossSubmitting || onCooldown}
                />

                <button
                  type="button"
                  onClick={onSubmitBossAttack}
                  disabled={disableBossApply}
                  className={[
                    "rounded-xl px-3 py-2 text-sm font-semibold border transition",
                    disableBossApply
                      ? "border-zinc-800/70 bg-zinc-900/60 text-zinc-400 cursor-not-allowed"
                      : "border-cyan-300/60 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/15",
                  ].join(" ")}
                  title={
                    onCooldown
                      ? "Attack just submitted — cooldown active."
                      : undefined
                  }
                >
                  {bossSubmitting
                    ? "Submitting…"
                    : onCooldown
                    ? cooldownLabel
                    : "Apply"}
                </button>
              </div>

              {!isTeacher && studentAttackMode && !guildAttacksOpen && (
                <div className="mt-1 text-[11px] text-amber-300">
                  Guild attacks are CLOSED
                </div>
              )}

              {onCooldown && (
                <div className="mt-1 text-[11px] text-zinc-500">
                  Attack locked briefly to prevent double-submit.
                </div>
              )}

              <div className="mt-2 text-[10px] uppercase tracking-widest text-zinc-500 mb-1">
                Breakdown / Note
              </div>
              <textarea
                value={bossNote}
                onChange={(e) => setBossNote(e.target.value)}
                placeholder="Optional note for this boss hit"
                className={selectClass}
                rows={2}
                disabled={bossSubmitting || onCooldown}
              />
            </>
          )}

          {(bossSubmitErr || bossErr) && (
            <div className="mt-2 rounded-xl px-3 py-2 text-sm border border-red-900/50 bg-red-950/30 text-red-200">
              {bossSubmitErr || bossErr}
            </div>
          )}
        </div>
      )}

      <div className="mt-3 border-t border-zinc-900/60" />
    </div>
  );
}
