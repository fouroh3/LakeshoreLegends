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
  onSubmitBossAttack: (payload: { round: number; guild: string }) => void;
  bossSubmitErr: string | null;
  bossBanner: Banner;
  bossCooldownUntil: number;

  // lock context
  activeRound: number;
  activeGuild: string;

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

function bossBadgeText(name: string) {
  const words = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return "B";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
}

export default function RightRail({
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
  activeRound,
  activeGuild,
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
}: Props) {
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

  const attackDisabledReason = useMemo(() => {
    if (!hasBossConfigured) return "No boss configured";
    if (studentHealMode) return "Switch Group Action to ATTACK";
    if (!isTeacher && !guildAttacksOpen) return "Guild attacks are CLOSED";
    if (!activeRound || activeRound <= 0) return "Missing round";
    return "";
  }, [
    hasBossConfigured,
    studentHealMode,
    isTeacher,
    guildAttacksOpen,
    activeRound,
  ]);

  const bossBadge = useMemo(() => bossBadgeText(bossName), [bossName]);

  return (
    <div className="min-h-0 overflow-auto pr-1">
      <div className="sticky top-0 z-20">
        <div className={`${card} bg-zinc-950/60 p-3 backdrop-blur`}>
          <div className="flex items-start gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-300/12 via-yellow-200/6 to-transparent text-lg font-black tracking-wider text-amber-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
              {bossBadge}
            </div>

            <div className="min-w-0 flex-1">
              <div className="truncate text-lg font-extrabold tracking-wide text-zinc-100">
                {bossName}
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-2">
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

          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Boss HP</span>
              <span className="tabular-nums text-zinc-200">
                {boss ? `${boss.currentHP}/${boss.maxHP}` : "—"}
              </span>
            </div>

            <div className="mt-1 h-2 w-full overflow-hidden rounded-full border border-zinc-800/65 bg-zinc-900/70">
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

        <div className="h-2" />
      </div>

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

            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className={pill}>
                Round:{" "}
                <span className="tabular-nums text-zinc-100">
                  {activeRound || "—"}
                </span>
              </span>
              <span className={pill}>
                Guild:{" "}
                <span className="truncate text-zinc-100">
                  {activeGuild || "Any / not tagged"}
                </span>
              </span>
            </div>

            {!activeGuild && (
              <div className="text-xs text-amber-200/80">
                No guild is selected right now. The hit can still submit, but it
                will not be tagged to a specific guild for round-lock context.
              </div>
            )}

            {bossSubmitErr && (
              <div className="text-xs text-red-200/80">{bossSubmitErr}</div>
            )}

            <button
              type="button"
              className={`${btn} ${btnDanger}`}
              onClick={() =>
                onSubmitBossAttack({ round: activeRound, guild: activeGuild })
              }
              disabled={
                bossSubmitting || cooldownMs > 0 || !!attackDisabledReason
              }
              title={attackDisabledReason || undefined}
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

      {showHealUi && (
        <div className={`${card} mt-2 p-3`}>
          <div className="flex items-center justify-between">
            <div className={label}>Student Controls</div>
            <span className={pill}>
              Selected:{" "}
              <span className="tabular-nums text-zinc-100">
                {selectedCount}
              </span>
            </span>
          </div>

          <div className="mt-3">
            <div className={label}>Heal / Damage Amount</div>

            <div className="mt-2 grid grid-cols-4 gap-2">
              {[
                { v: -1, t: "-1" },
                { v: -2, t: "-2" },
                { v: -3, t: "-3" },
                { v: -5, t: "-5" },
                { v: 1, t: "+1" },
                { v: 2, t: "+2" },
                { v: 3, t: "+3" },
                { v: 5, t: "+5" },
              ].map((o) => {
                const active = delta === o.v;
                const isHeal = o.v > 0;

                return (
                  <button
                    key={o.v}
                    type="button"
                    className={[
                      "rounded-xl border px-3 py-2 text-sm font-semibold transition",
                      active
                        ? isHeal
                          ? "border-cyan-300/50 bg-cyan-500/15"
                          : "border-red-400/45 bg-red-500/10"
                        : "border-zinc-800/70 bg-zinc-950/25 hover:bg-zinc-950/35",
                      studentControlsDisabled
                        ? "cursor-not-allowed opacity-50"
                        : "",
                    ].join(" ")}
                    onClick={() => setDelta(o.v)}
                    disabled={studentControlsDisabled}
                    title={isHeal ? "Heal" : "Damage"}
                  >
                    {o.t}
                  </button>
                );
              })}
            </div>
          </div>

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

      <div className={`${card} mt-2 p-3`}>
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
              <div className="truncate text-sm text-zinc-100">{r.guild}</div>
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
