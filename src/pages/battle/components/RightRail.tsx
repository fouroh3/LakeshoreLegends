// src/pages/battle/components/RightRail.tsx
import { useMemo } from "react";
import type { Student } from "../../../types";
import type { BossState } from "../../../bossApi";
import { hpBarColorFromPct } from "../../../utils/hpColor";

type Banner = { type: "ok" | "err"; msg: string } | null;

type GuildTotalsRow = {
  guild: string;
  damage: number;
  heal: number;
  net: number;
};

type Props = {
  // Boss
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
  bossBanner: Banner;
  bossCooldownUntil: number;

  // Modes / permissions
  studentHealMode: boolean;
  studentAttackMode: boolean;
  guildAttacksOpen: boolean;
  isTeacher: boolean;

  // Student controls
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
  banner: Banner;

  // Group action toggle
  groupAction: "ATTACK" | "HEAL";
  setGroupAction: (v: "ATTACK" | "HEAL") => void;

  // Guild totals
  guildTotals: GuildTotalsRow[];
  guildTotalsErr: string | null;
};

const card =
  "rounded-2xl border border-zinc-900/60 bg-zinc-950/15 shadow-[0_10px_40px_rgb(0,0,0,0.35)]";
const label = "text-[10px] uppercase tracking-widest text-zinc-500";
const input =
  "w-full rounded-xl bg-black/40 border border-zinc-800/70 px-3 py-2 text-sm text-white outline-none focus:border-white/25";
const btn =
  "w-full rounded-xl px-3 py-2 text-sm font-semibold border transition disabled:opacity-50 disabled:cursor-not-allowed";
const btnPrimary = "bg-cyan-500/15 border-cyan-300/40 hover:bg-cyan-500/20";
const btnDanger = "bg-red-500/10 border-red-400/30 hover:bg-red-500/15";
const btnSoft = "border-zinc-800/70 bg-zinc-950/25 hover:bg-zinc-950/35";
const pill =
  "px-2 py-1 rounded-full text-[11px] border border-zinc-800/70 bg-zinc-950/30";

function BannerBox({ banner }: { banner: Banner }) {
  if (!banner) return null;
  const cls =
    banner.type === "ok"
      ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-100"
      : "border-red-500/30 bg-red-950/20 text-red-100";
  return (
    <div className={`mt-2 rounded-xl border px-3 py-2 text-sm ${cls}`}>
      {banner.msg}
    </div>
  );
}

export default function RightRail(props: Props) {
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
    groupAction,
    setGroupAction,
    guildTotals,
    guildTotalsErr,
  } = props;

  const bossPct = useMemo(() => {
    if (!boss) return 0;
    return Math.max(0, Math.min(1, boss.currentHP / Math.max(1, boss.maxHP)));
  }, [boss]);

  const bossBarColor = useMemo(() => hpBarColorFromPct(bossPct), [bossPct]);

  const cooldownMs = useMemo(() => {
    const ms = bossCooldownUntil - Date.now();
    return ms > 0 ? ms : 0;
  }, [bossCooldownUntil]);

  const showAttackUi = isTeacher ? true : groupAction === "ATTACK";
  const showHealUi = isTeacher ? true : groupAction === "HEAL";

  return (
    <div className="min-h-0 overflow-auto pr-1">
      {/* ✅ Sticky Header: Boss name + HP + status + (student) Group Action */}
      <div className="sticky top-0 z-20">
        <div className={`${card} p-3 bg-zinc-950/60 backdrop-blur`}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-lg font-extrabold tracking-wide text-zinc-100 truncate">
                {bossName}
              </div>

              <div className="mt-1 flex items-center gap-2 flex-wrap">
                <span className={pill}>
                  {hasBossConfigured ? "Boss Active" : "No Boss Set"}
                </span>

                {!isTeacher && (
                  <span className={pill}>
                    Guild Attacks:{" "}
                    <span
                      className={
                        guildAttacksOpen ? "text-emerald-300" : "text-red-300"
                      }
                    >
                      {guildAttacksOpen ? "OPEN" : "CLOSED"}
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Boss HP */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Boss HP</span>
              <span className="tabular-nums text-zinc-200">
                {boss ? `${boss.currentHP}/${boss.maxHP}` : "—"}
              </span>
            </div>

            <div className="mt-1 h-2 w-full rounded-full bg-zinc-900/70 border border-zinc-800/65 overflow-hidden">
              <div
                className="h-full transition-[width] duration-300"
                style={{
                  width: `${Math.round(bossPct * 100)}%`,
                  backgroundColor: boss ? bossBarColor : "rgba(113,113,122,1)",
                }}
              />
            </div>

            {bossErr && (
              <div className="mt-2 text-xs text-red-200/80">{bossErr}</div>
            )}
          </div>

          {/* ✅ Group Action toggle directly under header (student-facing only) */}
          {!isTeacher && (
            <div className="mt-3">
              <div className={label}>Group Action</div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className={`${btn} ${
                    groupAction === "ATTACK" ? btnDanger : btnSoft
                  }`}
                  onClick={() => setGroupAction("ATTACK")}
                >
                  ATTACK
                </button>
                <button
                  type="button"
                  className={`${btn} ${
                    groupAction === "HEAL" ? btnPrimary : btnSoft
                  }`}
                  onClick={() => setGroupAction("HEAL")}
                >
                  HEAL
                </button>
              </div>
            </div>
          )}
        </div>

        {/* little separator so sticky doesn't “blend” */}
        <div className="h-2" />
      </div>

      {/* ✅ ATTACK UI (only when ATTACK for students; always for teacher) */}
      {showAttackUi && (
        <div className={`${card} p-3`}>
          <div className={label}>Boss Attack</div>

          <div className="mt-3 space-y-2">
            <div className={label}>Guild Total Attack</div>
            <input
              className={input}
              value={bossDamage}
              onChange={(e) => setBossDamage(e.target.value)}
              inputMode="numeric"
              placeholder="e.g. 250"
              disabled={!hasBossConfigured || bossSubmitting}
            />

            <div className={label}>Note (optional)</div>
            <input
              className={input}
              value={bossNote}
              onChange={(e) => setBossNote(e.target.value)}
              placeholder="e.g. Shadows combo"
              disabled={!hasBossConfigured || bossSubmitting}
            />

            {bossSubmitErr && (
              <div className="text-xs text-red-200/80">{bossSubmitErr}</div>
            )}

            <button
              type="button"
              className={`${btn} ${btnDanger}`}
              onClick={onSubmitBossAttack}
              disabled={
                !hasBossConfigured ||
                bossSubmitting ||
                cooldownMs > 0 ||
                studentHealMode
              }
              title={
                studentHealMode ? "Switch Group Action to ATTACK" : undefined
              }
            >
              {cooldownMs > 0
                ? `Cooldown… ${(cooldownMs / 1000).toFixed(1)}s`
                : bossSubmitting
                ? "Submitting…"
                : "Submit Boss Hit"}
            </button>

            <BannerBox banner={bossBanner} />
          </div>
        </div>
      )}

      {/* ✅ HEAL UI (only when HEAL for students; always for teacher) */}
      {showHealUi && (
        <div className={`${card} p-3 mt-2`}>
          <div className="flex items-center justify-between">
            <div className={label}>Student Controls</div>
            <span className={pill}>
              Selected:{" "}
              <span className="text-zinc-100 tabular-nums">
                {selectedCount}
              </span>
            </span>
          </div>

          {/* Delta */}
          <div className="mt-3">
            <div className={label}>Heal / Damage Amount</div>
            <select
              className={input}
              value={String(delta)}
              onChange={(e) => setDelta(Number(e.target.value))}
              disabled={studentControlsDisabled}
            >
              <option value="-1">Damage -1</option>
              <option value="-2">Damage -2</option>
              <option value="-3">Damage -3</option>
              <option value="-5">Damage -5</option>
              <option value="1">Heal +1</option>
              <option value="2">Heal +2</option>
              <option value="3">Heal +3</option>
              <option value="5">Heal +5</option>
            </select>
          </div>

          {/* Note */}
          <div className="mt-3">
            <div className={label}>Note (optional)</div>
            <input
              className={input}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. potion, trap, crit"
              disabled={studentControlsDisabled}
            />
          </div>

          {/* Quick info */}
          {selectedStudents.length === 1 && selectedSkills.length > 0 && (
            <div className="mt-3">
              <div className={label}>Selected Student Skills</div>
              <div className="mt-2 flex flex-wrap gap-1">
                {selectedSkills.slice(0, 6).map((s) => (
                  <span
                    key={s}
                    className="rounded-full border border-zinc-800/70 bg-zinc-950/30 px-2 py-0.5 text-[11px] text-zinc-200"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            className={`${btn} ${btnPrimary} mt-3`}
            onClick={onSubmit}
            disabled={
              submitting || studentControlsDisabled || selectedCount === 0
            }
          >
            {submitting ? "Submitting…" : "Submit to Selected"}
          </button>

          <BannerBox banner={banner} />
        </div>
      )}

      {/* Guild totals (always visible below actions) */}
      <div className={`${card} p-3 mt-2`}>
        <div className={label}>Guild Totals (This Battle)</div>

        {guildTotalsErr && (
          <div className="mt-2 text-xs text-red-200/80">{guildTotalsErr}</div>
        )}

        {!guildTotalsErr && guildTotals.length === 0 && (
          <div className="mt-2 text-xs text-zinc-500">
            No totals yet (waiting for first actions).
          </div>
        )}

        <div className="mt-2 space-y-1">
          {guildTotals.map((r) => (
            <div
              key={r.guild}
              className="flex items-center justify-between rounded-xl border border-zinc-900/60 bg-zinc-950/20 px-2 py-1"
            >
              <div className="text-sm text-zinc-100 truncate">{r.guild}</div>
              <div className="text-xs tabular-nums text-zinc-300">
                <span className="text-zinc-500">DMG </span>
                {r.damage}
                <span className="text-zinc-700"> · </span>
                <span className="text-zinc-500">HEAL </span>
                {r.heal}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
