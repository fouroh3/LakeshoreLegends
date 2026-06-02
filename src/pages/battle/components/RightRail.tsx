// src/pages/battle/components/RightRail.tsx
import { useEffect, useMemo, useState } from "react";
import type { Student } from "../../../types";
import type { BossState } from "../../../bossApi";
import { hpBarColorFromPct } from "../../../utils/hpColor";
import { getBossMeta } from "../battleBossMeta";

type Banner = { type: "ok" | "err"; msg: string } | null;

type Props = {
  hasBossConfigured: boolean;
  bossName: string;
  bossKey: string;
  questName: string;
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

  activeRound: number;
  activeGuild: string;

  studentHealMode: boolean;
  studentAttackMode: boolean;
  guildAttacksOpen: boolean;
  isTeacher: boolean;

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

  groupAction: "ATTACK" | "HEAL";
  setGroupAction: (v: "ATTACK" | "HEAL") => void;
  completedGuildAction: string;
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
  bossKey,
  questName,
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
  completedGuildAction,
  setGroupAction,
}: Props) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!bossCooldownUntil || bossCooldownUntil <= Date.now()) {
      setNow(Date.now());
      return;
    }

    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 100);

    const timeoutMs = Math.max(0, bossCooldownUntil - Date.now());
    const timeoutId = window.setTimeout(() => {
      setNow(Date.now());
    }, timeoutMs + 25);

    return () => {
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
    };
  }, [bossCooldownUntil]);

    const guildActionLocked =
    completedGuildAction === "ATTACK" ||
    completedGuildAction === "HEAL";

  const bossPct = useMemo(() => {
    if (!boss) return 0;
    return Math.max(0, Math.min(1, boss.currentHP / Math.max(1, boss.maxHP)));
  }, [boss]);

  const bossDefeated = useMemo(() => {
    return Boolean(boss && boss.currentHP <= 0);
  }, [boss]);

  const bossBarColor = useMemo(() => hpBarColorFromPct(bossPct), [bossPct]);

  const cooldownMs = useMemo(() => {
    const ms = bossCooldownUntil - now;
    return ms > 0 ? ms : 0;
  }, [bossCooldownUntil, now]);

  const showAttackUi = isTeacher ? true : groupAction === "ATTACK";
  const showHealUi = isTeacher ? true : groupAction === "HEAL";

  const attackDisabledReason = useMemo(() => {
    if (!hasBossConfigured) return "No boss configured";
    if (bossDefeated) return "Boss defeated";
    if (studentHealMode) return "Switch Group Action to ATTACK";
    if (!isTeacher && !guildAttacksOpen) return "Guild attacks are CLOSED";
    if (!activeRound || activeRound <= 0) return "Missing round";
    if (!activeGuild) return "Choose a guild first";
    return "";
  }, [
    hasBossConfigured,
    bossDefeated,
    studentHealMode,
    isTeacher,
    guildAttacksOpen,
    activeRound,
    activeGuild,
  ]);

  const bossLookupValue = useMemo(() => {
    return (
      boss?.bossName?.trim() ||
      bossName?.trim() ||
      questName?.trim() ||
      bossKey?.trim() ||
      ""
    );
  }, [boss?.bossName, bossName, questName, bossKey]);

  const bossBadge = useMemo(
    () => bossBadgeText(bossLookupValue),
    [bossLookupValue]
  );

  const bossMeta = useMemo(() => {
    return (
      getBossMeta(boss?.bossName || "") ||
      getBossMeta(bossName || "") ||
      getBossMeta(questName || "") ||
      getBossMeta(bossKey || "")
    );
  }, [boss?.bossName, bossName, questName, bossKey]);

  const isLowBossHp = !bossDefeated && bossPct > 0 && bossPct <= 0.3;

  const selectedStudentName =
    selectedStudents.length === 1
      ? `${selectedStudents[0].last ?? ""}, ${selectedStudents[0].first ?? ""}`
          .replace(/^,\s*|,\s*$/g, "")
          .trim() || "Selected student"
      : "";

  return (
    <div className="relative min-h-0 overflow-hidden pr-1">
      {bossDefeated && (
        <div className="pointer-events-none absolute inset-0 z-[999] bg-zinc-950/98 backdrop-blur-sm">
          <div className="sticky top-0 h-screen">
            <div className="absolute left-1/2 top-[30vh] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center animate-[fadeIn_0.4s_ease-out]">
              <div className="text-6xl leading-none drop-shadow-[0_0_20px_rgba(255,255,255,0.35)]">
                💀
              </div>

              <div className="mt-4 text-[22px] font-black tracking-[0.28em] text-zinc-100 drop-shadow-[0_0_14px_rgba(255,255,255,0.25)]">
                DEFEATED
              </div>

              <div className="mt-2 text-[11px] uppercase tracking-[0.16em] text-amber-300/80">
                The battle is won
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="sticky top-0 z-20">
        <div
          className={`${card} relative overflow-hidden p-3 backdrop-blur bg-zinc-950/60`}
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-amber-400/20 to-transparent" />

          <div className="relative flex items-start gap-3">
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center">
              <div
                className={[
                  "absolute inset-0 rounded-2xl bg-amber-400/20 blur-md transition-all duration-300",
                  bossSubmitting ? "opacity-90 scale-110" : "opacity-60",
                ].join(" ")}
              />

              <div
                className={[
                  "relative h-14 w-14 overflow-hidden rounded-2xl",
                  bossSubmitting ? "animate-pulse" : "",
                ].join(" ")}
              >
                {bossMeta?.logo ? (
                  <img
                    src={bossMeta.logo}
                    alt={
                      bossMeta.questName ||
                      bossMeta.bossName ||
                      bossLookupValue ||
                      "Boss"
                    }
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-lg font-black tracking-wider text-amber-200">
                    {bossBadge}
                  </div>
                )}
              </div>
            </div>

            <div className="min-w-0 flex-1">
              {(bossMeta?.questName || questName) && (
                <div className="truncate text-[11px] font-semibold uppercase tracking-[0.28em] text-amber-300/90 drop-shadow-[0_0_6px_rgba(251,191,36,0.35)]">
                  {bossMeta?.questName || questName}
                </div>
              )}

              <div className="truncate text-lg font-extrabold tracking-wide text-zinc-100">
                {bossMeta?.bossName || boss?.bossName || bossName || "Boss"}
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className={pill}>
                  {!hasBossConfigured
                    ? "No Boss Set"
                    : bossDefeated
                    ? "Defeated"
                    : "Boss Active"}
                </span>

                {!isTeacher && !bossDefeated && (
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

          <div className="relative mt-3">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Boss HP</span>
              <span className="tabular-nums text-zinc-200">
                {boss ? `${boss.currentHP}/${boss.maxHP}` : "—"}
              </span>
            </div>

            <div className="relative mt-1 h-2 w-full overflow-hidden rounded-full border border-zinc-800/65 bg-zinc-900/70">
              <div
                className={[
                  "h-full transition-[width] duration-300",
                  isLowBossHp
                    ? "animate-[bossHpBlink_0.9s_ease-in-out_infinite]"
                    : "",
                ].join(" ")}
                style={{
                  width: `${Math.round(bossPct * 100)}%`,
                  backgroundColor: boss ? bossBarColor : "rgba(113,113,122,1)",
                }}
              />
            </div>

            {isLowBossHp && boss && (
              <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-amber-300/80">
                Boss critical
              </div>
            )}

            {bossErr && (
              <div className="mt-2 text-xs text-red-200/80">{bossErr}</div>
            )}
          </div>
        </div>

        <div className="h-2" />
      </div>

      {!isTeacher && (
        <div className={`${card} mb-2 p-3`}>
          <div className={label}>Group Action</div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              className={[
                "rounded-xl border px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
                groupAction === "ATTACK"
                  ? "border-red-400/45 bg-red-500/10 text-white"
                  : "border-zinc-800/70 bg-zinc-950/25 hover:bg-zinc-950/35 text-zinc-300",
              ].join(" ")}
              onClick={() => setGroupAction("ATTACK")}
              disabled={guildActionLocked}
            >
              Attack
            </button>

            <button
              type="button"
              className={[
                "rounded-xl border px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
                groupAction === "HEAL"
                  ? "border-cyan-300/50 bg-cyan-500/15 text-white"
                  : "border-zinc-800/70 bg-zinc-950/25 hover:bg-zinc-950/35 text-zinc-300",
              ].join(" ")}
              onClick={() => setGroupAction("HEAL")}
              disabled={guildActionLocked}
            >
              Heal / Damage
            </button>
          </div>

          {guildActionLocked && (
            <div className="mt-2 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-[11px] font-semibold text-amber-200">
              Guild strike submitted successfully — healing locked until next round.
            </div>
          )}
        </div>
      )}

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
              disabled={Boolean(
                !hasBossConfigured || bossSubmitting || bossDefeated
              )}
            />

            <div className={label}>Note (optional)</div>
            <input
              className={input}
              value={bossNote}
              onChange={(e) => setBossNote(e.target.value)}
              placeholder="e.g. Shadows combo"
              disabled={Boolean(
                !hasBossConfigured || bossSubmitting || bossDefeated
              )}
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
                  {activeGuild || "—"}
                </span>
              </span>
            </div>

            {bossSubmitErr && (
              <div className="text-xs text-red-200/80">{bossSubmitErr}</div>
            )}

            {!!attackDisabledReason && (
              <div className="text-xs text-amber-200/80">
                {attackDisabledReason}
              </div>
            )}

            <button
              type="button"
              className={`${btn} ${btnDanger}`}
              onClick={() =>
                onSubmitBossAttack({ round: activeRound, guild: activeGuild })
              }
              disabled={Boolean(
                bossSubmitting || cooldownMs > 0 || !!attackDisabledReason
              )}
              title={attackDisabledReason || undefined}
            >
              {bossDefeated
                ? "Boss Defeated"
                : cooldownMs > 0
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

          {!isTeacher && (
            <div className="mt-2 text-xs text-zinc-400">
              Mode:{" "}
              {studentAttackMode
                ? "Damage"
                : studentHealMode
                ? "Heal"
                : "Mixed"}
            </div>
          )}

          <div className="mt-3">
            <div className={label}>Heal / Damage Amount</div>

            <div className="mt-2 grid grid-cols-5 gap-2">
              {[
                { v: -1, t: "-1" },
                { v: -2, t: "-2" },
                { v: -3, t: "-3" },
                { v: -4, t: "-4" },
                { v: -5, t: "-5" },
                { v: 1, t: "+1" },
                { v: 2, t: "+2" },
                { v: 3, t: "+3" },
                { v: 4, t: "+4" },
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
                    disabled={Boolean(studentControlsDisabled)}
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
              disabled={Boolean(studentControlsDisabled)}
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

          {selectedStudents.length === 1 && !selectedSkills.length && (
            <div className="mt-3 text-xs text-zinc-500">
              No skills listed for {selectedStudentName || "this student"}.
            </div>
          )}

          {selectedStudents.length > 1 && (
            <div className="mt-3 text-xs text-zinc-500">
              Full skills hidden in multi-target mode.
            </div>
          )}

          <button
            type="button"
            className={`${btn} ${btnPrimary} mt-3`}
            onClick={onSubmit}
            disabled={Boolean(
              submitting || studentControlsDisabled || selectedCount === 0
            )}
          >
            {submitting ? "Submitting…" : "Submit to Selected"}
          </button>

          <BannerBox banner={banner} />
        </div>
      )}

      <style>{`
        @keyframes bossHpBlink {
          0%, 100% {
            opacity: 1;
            filter: brightness(1);
          }
          50% {
            opacity: 0.45;
            filter: brightness(1.35);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.98);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
