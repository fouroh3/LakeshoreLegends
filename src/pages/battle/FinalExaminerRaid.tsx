import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AppTopBar from "../../components/AppTopBar";
import { getBossMeta } from "./battleBossMeta";
import {
  getFinalExaminerState,
  submitFinalExaminerAction,
  type FinalExaminerBossState,
  type FinalExaminerRaidState,
} from "./finalExaminerApi";

const RAID_ID = "final_examiner_2026";
type RaidAction = "HEAL" | "STRIKE" | "DAMAGE";

function num(value: number) {
  return Math.max(0, Math.round(value || 0)).toLocaleString();
}

function percent(current: number, max: number) {
  return max ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
}

function requestId() {
  return `fe:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`;
}

function bossState(boss: FinalExaminerBossState) {
  if (boss.defeated) return "DEFEATED";
  if (boss.locked) return "SEALED";
  return "ACTIVE";
}

function bossTheme(boss: FinalExaminerBossState) {
  if (boss.defeated) {
    return {
      edge: "from-emerald-400 to-cyan-300",
      wash: "from-emerald-950/35 via-black/35 to-cyan-950/20",
      glow: "shadow-[inset_0_0_40px_rgba(16,185,129,0.10)]",
    };
  }

  if (boss.locked) {
    return {
      edge: "from-violet-500 to-fuchsia-300",
      wash: "from-violet-950/45 via-black/35 to-fuchsia-950/20",
      glow: "shadow-[inset_0_0_40px_rgba(168,85,247,0.10)]",
    };
  }

  const themes: Record<string, { edge: string; wash: string; glow: string }> = {
    KEEPER_SHADOWS: {
      edge: "from-sky-400 via-indigo-400 to-violet-300",
      wash: "from-sky-950/45 via-slate-950/25 to-violet-950/20",
      glow: "shadow-[inset_0_0_38px_rgba(56,189,248,0.10)]",
    },
    CRYPT_WARDEN: {
      edge: "from-amber-300 via-orange-400 to-stone-300",
      wash: "from-amber-950/35 via-stone-950/35 to-orange-950/20",
      glow: "shadow-[inset_0_0_38px_rgba(251,191,36,0.08)]",
    },
    THE_ALCHEMIST: {
      edge: "from-lime-300 via-emerald-400 to-teal-300",
      wash: "from-lime-950/30 via-emerald-950/35 to-teal-950/25",
      glow: "shadow-[inset_0_0_38px_rgba(74,222,128,0.10)]",
    },
    PLAGUEBEARER: {
      edge: "from-rose-400 via-red-500 to-orange-300",
      wash: "from-rose-950/40 via-red-950/35 to-orange-950/20",
      glow: "shadow-[inset_0_0_38px_rgba(244,63,94,0.10)]",
    },
    PRISM_SENTINEL: {
      edge: "from-fuchsia-400 via-violet-400 to-cyan-300",
      wash: "from-fuchsia-950/35 via-violet-950/35 to-cyan-950/20",
      glow: "shadow-[inset_0_0_38px_rgba(217,70,239,0.10)]",
    },
  };

  return themes[boss.bossKey] || {
    edge: "from-rose-500 via-pink-400 to-orange-300",
    wash: "from-rose-950/35 via-black/35 to-orange-950/20",
    glow: "shadow-[inset_0_0_38px_rgba(244,63,94,0.10)]",
  };
}

function Bar({ current, max, className }: { current: number; max: number; className: string }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-black/55 ring-1 ring-white/5">
      <div
        className={`h-full rounded-full bg-gradient-to-r ${className}`}
        style={{ width: `${percent(current, max)}%` }}
      />
    </div>
  );
}

function BossWatermark({ boss }: { boss: FinalExaminerBossState }) {
  const meta = getBossMeta(boss.bossKey) || getBossMeta(boss.bossName);
  if (!meta?.logo) return null;

  return (
    <img
      src={meta.logo}
      alt=""
      className="pointer-events-none absolute -right-3 -top-3 h-28 w-auto select-none opacity-[0.16] grayscale brightness-200 contrast-125"
      draggable={false}
    />
  );
}

function FinalBossMark({ boss }: { boss: FinalExaminerBossState }) {
  const meta = getBossMeta(boss.bossKey) || getBossMeta(boss.bossName);
  if (!meta?.logo) return null;

  return (
    <img
      src={meta.logo}
      alt=""
      className="h-[72px] w-auto object-contain drop-shadow-[0_0_18px_rgba(255,255,255,0.25)]"
      draggable={false}
    />
  );
}

function EncounterCard({ boss }: { boss: FinalExaminerBossState }) {
  const theme = bossTheme(boss);

  return (
    <article className={`group relative min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${theme.wash} px-4 py-4 ${theme.glow}`}>
      <BossWatermark boss={boss} />
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${theme.edge}`} />
      <div className="relative flex min-h-[182px] flex-col">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[9px] font-black tracking-[0.18em] text-white/45">QUEST BOSS</span>
          <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[9px] font-black tracking-[0.12em] text-white/70">
            {bossState(boss)}
          </span>
        </div>
        <div className="mt-4 max-w-[82%] text-[15px] font-black leading-[1.15] tracking-tight text-white sm:text-base">
          {boss.bossName}
        </div>
        <div className="mt-auto pt-5">
          <div className="flex items-end justify-between gap-2">
            <div>
              <div className="text-2xl font-black tracking-tight text-white">{num(boss.currentHP)}</div>
              <div className="mt-0.5 text-[9px] font-bold tracking-[0.15em] text-white/40">OF {num(boss.maxHP)} HP</div>
            </div>
            <div className="text-sm font-black text-white/75">{Math.round(percent(boss.currentHP, boss.maxHP))}%</div>
          </div>
          <div className="mt-3">
            <Bar current={boss.currentHP} max={boss.maxHP} className={theme.edge} />
          </div>
        </div>
      </div>
    </article>
  );
}

function activityMessage(previous: FinalExaminerRaidState | null, next: FinalExaminerRaidState) {
  if (!previous) return "The raid command board is live. Await the next class action.";

  const previousFinal = previous.bosses.find((boss) => boss.bossKey === "FINAL_EXAMINER");
  const nextFinal = next.bosses.find((boss) => boss.bossKey === "FINAL_EXAMINER");
  if (previousFinal?.locked && nextFinal && !nextFinal.locked) {
    return "THE SEAL IS BROKEN — The Final Examiner enters the arena.";
  }

  for (const nextBoss of next.bosses) {
    const oldBoss = previous.bosses.find((boss) => boss.bossKey === nextBoss.bossKey);
    if (!oldBoss) continue;

    if (!oldBoss.defeated && nextBoss.defeated) {
      return `${nextBoss.bossName} has fallen.`;
    }

    const change = oldBoss.currentHP - nextBoss.currentHP;
    if (change > 0) {
      return `${nextBoss.bossName} took ${num(change)} damage.`;
    }
  }

  for (const nextClass of next.classes) {
    const oldClass = previous.classes.find((unit) => unit.classKey === nextClass.classKey);
    if (!oldClass) continue;

    const change = oldClass.currentHP - nextClass.currentHP;
    if (change > 0) return `${nextClass.label} took ${num(change)} class damage.`;
    if (change < 0) return `${nextClass.label} restored ${num(Math.abs(change))} class HP.`;
  }

  return "The raid command board is live. Await the next class action.";
}

export default function FinalExaminerRaid() {
  const teacher = useMemo(() => new URLSearchParams(window.location.search).get("teacher") === "1", []);
  const [raid, setRaid] = useState<FinalExaminerRaidState | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [activity, setActivity] = useState("The raid command board is live. Await the next class action.");
  const [classKey, setClassKey] = useState("");
  const [action, setAction] = useState<RaidAction>("STRIKE");
  const [target, setTarget] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const previousRaid = useRef<FinalExaminerRaidState | null>(null);

  const refresh = useCallback(async () => {
    try {
      const nextRaid = await getFinalExaminerState(RAID_ID);
      setActivity(activityMessage(previousRaid.current, nextRaid));
      previousRaid.current = nextRaid;
      setRaid(nextRaid);
      setError("");
    } catch (caught: any) {
      setError(caught?.message || "Final Examiner is not configured yet.");
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 2000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const minions = useMemo(() => (raid?.bosses || []).filter((boss) => boss.bossKey !== "FINAL_EXAMINER"), [raid]);
  const finalBoss = useMemo(() => (raid?.bosses || []).find((boss) => boss.bossKey === "FINAL_EXAMINER") || null, [raid]);
  const targets = useMemo(() => (raid?.bosses || []).filter((boss) => !boss.locked && !boss.defeated), [raid]);
  const defeated = minions.filter((boss) => boss.defeated).length;
  const remaining = minions.reduce((sum, boss) => sum + boss.currentHP, 0);
  const total = minions.reduce((sum, boss) => sum + boss.maxHP, 0);

  useEffect(() => {
    if (raid?.classes?.length && !raid.classes.some((unit) => unit.classKey === classKey)) {
      setClassKey(raid.classes[0].classKey);
    }
  }, [raid, classKey]);

  useEffect(() => {
    if (action === "STRIKE" && !targets.some((boss) => boss.bossKey === target)) {
      setTarget(targets[0]?.bossKey || "");
    }
  }, [action, target, targets]);

  const actionLabel = action === "DAMAGE" ? "Damage Class" : action === "HEAL" ? "Heal Class" : "Strike Boss";
  const amountPlaceholder = action === "DAMAGE" ? "Damage total" : action === "HEAL" ? "D4 total" : "D20 total";

  async function apply() {
    const totalAmount = Number.parseInt(amount, 10);
    if (!classKey || !Number.isFinite(totalAmount) || totalAmount <= 0 || (action === "STRIKE" && !target)) {
      setNotice("Complete the action fields first.");
      return;
    }

    setBusy(true);
    try {
      const result: any = await submitFinalExaminerAction({
        raidId: RAID_ID,
        classKey,
        action,
        amount: totalAmount,
        targetBossKey: action === "STRIKE" ? target : "",
        requestId: requestId(),
      });
      setNotice(
        result?.overkillLost
          ? `${actionLabel} applied: ${num(result.appliedAmount)}. Excess lost: ${num(result.overkillLost)}.`
          : `${actionLabel} applied.`
      );
      setAmount("");
      await refresh();
    } catch (caught: any) {
      setNotice(caught?.message || "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-[#05070d] text-zinc-100">
      <AppTopBar title={teacher ? "Final Examiner · Teacher Console" : "Final Examiner"} activeView="battle" onNavigate={() => undefined} />
      <main className={teacher ? "mx-auto w-full max-w-[1500px] px-4 py-5" : "mx-auto flex min-h-[calc(100dvh-84px)] w-full max-w-[1900px] flex-col px-4 py-4"}>
        {teacher ? (
          <>
            <section className="relative overflow-hidden rounded-[28px] border border-amber-300/20 bg-[radial-gradient(circle_at_86%_15%,rgba(251,191,36,0.16),transparent_30%),linear-gradient(135deg,rgba(54,35,5,0.88),rgba(12,12,16,0.98))] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
              <div className="text-[10px] font-black tracking-[0.24em] text-amber-200/80">FINAL EXAMINER · TEACHER CONSOLE</div>
              <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h1 className="text-4xl font-black tracking-[-0.05em] text-white">Record a Class Action</h1>
                  <p className="mt-1 text-sm text-zinc-300">Enter the combined total only after a class finishes rolling.</p>
                </div>
                <a href="/finalexaminer" className="rounded-xl border border-white/15 bg-white/[0.05] px-4 py-2 text-sm font-bold text-white transition hover:border-white/30 hover:bg-white/[0.1]">Open Student Raid Board</a>
              </div>
            </section>
            {error ? <div className="mt-4 rounded-xl border border-red-400/25 bg-red-950/30 px-4 py-3 text-sm text-red-100">{error}</div> : null}
            {notice ? <div className="mt-4 rounded-xl border border-cyan-400/25 bg-cyan-950/30 px-4 py-3 text-sm text-cyan-100">{notice}</div> : null}
            {raid?.active ? <>
              <section className="mt-5 rounded-[26px] border border-amber-300/20 bg-[linear-gradient(145deg,rgba(58,38,5,0.40),rgba(13,13,17,0.96))] p-5 shadow-[0_20px_45px_rgba(0,0,0,0.22)]">
                <div className="grid gap-3 lg:grid-cols-[1.15fr_0.82fr_1.2fr_0.72fr_auto]">
                  <select value={classKey} onChange={(event) => setClassKey(event.target.value)} className="rounded-xl border border-white/10 bg-black/35 px-3 py-3 text-sm font-semibold outline-none focus:border-amber-300/50">{raid.classes.map((unit) => <option key={unit.classKey} value={unit.classKey}>{unit.label}</option>)}</select>
                  <select value={action} onChange={(event) => setAction(event.target.value as RaidAction)} className="rounded-xl border border-white/10 bg-black/35 px-3 py-3 text-sm font-semibold outline-none focus:border-amber-300/50"><option value="STRIKE">Strike Boss</option><option value="HEAL">Heal Class</option><option value="DAMAGE">Damage Class</option></select>
                  {action === "STRIKE" ? <select value={target} onChange={(event) => setTarget(event.target.value)} className="rounded-xl border border-white/10 bg-black/35 px-3 py-3 text-sm font-semibold outline-none focus:border-amber-300/50">{targets.map((boss) => <option key={boss.bossKey} value={boss.bossKey}>{boss.bossName}</option>)}</select> : <div className={`rounded-xl border px-3 py-3 text-sm font-semibold ${action === "DAMAGE" ? "border-rose-300/25 bg-rose-950/30 text-rose-100" : "border-cyan-300/20 bg-cyan-950/20 text-cyan-100"}`}>{action === "DAMAGE" ? "Subtract from this class's raid HP" : "Restore this class's raid HP"}</div>}
                  <input value={amount} onChange={(event) => setAmount(event.target.value.replace(/\D/g, ""))} placeholder={amountPlaceholder} inputMode="numeric" className="rounded-xl border border-white/10 bg-black/35 px-3 py-3 text-sm font-semibold outline-none placeholder:text-zinc-600 focus:border-amber-300/50" />
                  <button disabled={busy} onClick={() => void apply()} className={`rounded-xl border px-5 py-3 text-sm font-black transition disabled:opacity-45 ${action === "DAMAGE" ? "border-rose-200/35 bg-gradient-to-r from-rose-500/25 to-red-500/15 text-rose-50 hover:border-rose-100/70" : "border-amber-200/35 bg-gradient-to-r from-amber-400/20 to-orange-400/15 text-amber-50 hover:border-amber-100/70"}`}>{busy ? "Applying…" : actionLabel}</button>
                </div>
              </section>
              <section className="mt-5 grid gap-4 xl:grid-cols-[0.85fr_1.5fr]">
                <div className="rounded-[24px] border border-cyan-300/15 bg-cyan-950/10 p-4"><div className="text-[10px] font-black tracking-[0.18em] text-cyan-200/80">LIVE CLASS HP</div><div className="mt-3 space-y-2">{raid.classes.map((unit) => <div key={unit.classKey} className="rounded-xl border border-cyan-300/15 bg-black/20 p-3"><div className="flex justify-between gap-3 text-sm font-black"><span>{unit.label}</span><span className="text-cyan-100">{num(unit.currentHP)} / {num(unit.startingHP)}</span></div><div className="mt-2"><Bar current={unit.currentHP} max={unit.startingHP} className="from-cyan-400 via-sky-300 to-teal-200" /></div></div>)}</div></div>
                <div className="rounded-[24px] border border-rose-300/15 bg-rose-950/10 p-4"><div className="flex items-center justify-between"><div className="text-[10px] font-black tracking-[0.18em] text-rose-200/80">LIVE BOSS STATUS</div><div className="text-sm font-black text-rose-100">{defeated} / 5 defeated</div></div><div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{(raid.bosses || []).map((boss) => <EncounterCard key={boss.bossKey} boss={boss} />)}</div></div>
              </section>
            </> : null}
          </>
        ) : <>
          <section className="relative overflow-hidden rounded-[26px] border border-violet-300/20 bg-[radial-gradient(circle_at_87%_15%,rgba(168,85,247,0.23),transparent_28%),linear-gradient(135deg,rgba(24,13,47,0.98),rgba(8,10,22,0.98))] px-6 py-4 shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
            <div className="flex items-center justify-between gap-5">
              <div><div className="text-[10px] font-black tracking-[0.22em] text-violet-200/80">ENDGAME RAID · LIVE COMMAND BOARD</div><h1 className="mt-1 text-3xl font-black tracking-[-0.05em] text-white">THE FINAL EXAMINER</h1></div>
              <div className="grid grid-cols-4 gap-2">{[["PHASE", raid?.phase === "FINAL_EXAMINER" ? "FINAL BOSS" : raid?.phase || "LOADING", "text-violet-100"], ["DOWN", `${defeated} / 5`, "text-white"], ["MINION HP", num(remaining), "text-rose-200"], ["STATUS", "LIVE", "text-cyan-100"]].map(([label, value, color]) => <div key={label} className="min-w-[94px] rounded-xl border border-white/10 bg-black/25 px-3 py-2"><div className="text-[9px] font-bold tracking-[0.14em] text-zinc-500">{label}</div><div className={`mt-1 text-sm font-black ${color}`}>{value}</div></div>)}</div>
            </div>
            <div className="mt-3 flex min-h-[34px] items-center justify-center rounded-xl border border-cyan-300/15 bg-black/25 px-4 text-center text-xs font-bold tracking-wide text-cyan-50 shadow-[inset_0_0_16px_rgba(34,211,238,0.05)]">
              <span className="mr-2 text-[9px] font-black tracking-[0.18em] text-cyan-300">LIVE FEED</span>
              {activity}
            </div>
          </section>
          {error ? <div className="mt-3 rounded-xl border border-red-400/25 bg-red-950/30 px-4 py-2 text-sm text-red-100">{error}</div> : null}
          {raid?.active ? <section className="mt-4 grid flex-1 gap-4 xl:grid-cols-[0.76fr_1.84fr]">
            <div className="rounded-[22px] border border-cyan-300/15 bg-[linear-gradient(145deg,rgba(8,24,34,0.88),rgba(8,12,20,0.96))] p-4"><div className="flex items-center justify-between"><div><div className="text-[10px] font-black tracking-[0.19em] text-cyan-200/85">RAID PARTIES</div><h2 className="mt-0.5 text-lg font-black">Class Vitality</h2></div><div className="rounded-full border border-cyan-300/15 bg-cyan-300/10 px-2.5 py-1 text-[9px] font-black tracking-[0.13em] text-cyan-100">LIVE HP</div></div><div className="mt-3 grid gap-2">{raid.classes.map((unit, index) => <article key={unit.classKey} className="relative overflow-hidden rounded-xl border border-cyan-300/15 bg-black/20 px-4 py-3"><div className="absolute inset-y-0 left-0 w-1 bg-cyan-300/75" /><div className="flex items-center justify-between gap-3 pl-1"><div><div className="text-[9px] font-bold tracking-[0.14em] text-cyan-200/65">RAID UNIT 0{index + 1}</div><div className="mt-0.5 text-base font-black">{unit.label}</div></div><div className="text-right"><div className="text-2xl font-black text-cyan-100">{num(unit.currentHP)}</div><div className="text-[9px] font-bold tracking-[0.1em] text-zinc-500">OF {num(unit.startingHP)}</div></div></div><div className="mt-2"><Bar current={unit.currentHP} max={unit.startingHP} className="from-cyan-400 via-sky-300 to-teal-200" /></div></article>)}</div></div>
            <div className="flex flex-col rounded-[22px] border border-rose-300/15 bg-[linear-gradient(145deg,rgba(36,8,18,0.75),rgba(9,10,18,0.98))] p-4"><div className="flex items-center justify-between"><div><div className="text-[10px] font-black tracking-[0.19em] text-rose-200/85">BOSS ARENA</div><h2 className="mt-0.5 text-lg font-black">The Five Minions</h2></div><div className="w-[200px]"><div className="flex justify-between text-[9px] font-bold tracking-[0.12em] text-zinc-500"><span>ARENA CLEARANCE</span><span>{Math.round(percent(total - remaining, total))}%</span></div><div className="mt-1.5"><Bar current={total - remaining} max={total} className="from-rose-400 to-amber-200" /></div></div></div><div className="mt-3 grid grid-cols-5 gap-2">{minions.map((boss) => <EncounterCard key={boss.bossKey} boss={boss} />)}</div>{finalBoss ? <section className="mt-3 grid flex-1 gap-3 rounded-xl border border-violet-300/25 bg-[radial-gradient(circle_at_82%_30%,rgba(192,132,252,0.18),transparent_30%),rgba(25,12,45,0.75)] p-4 lg:grid-cols-[1fr_280px] lg:items-center"><div className="flex items-center gap-4"><FinalBossMark boss={finalBoss} /><div><div className="text-[10px] font-black tracking-[0.19em] text-violet-200/85">{finalBoss.locked ? "THE SEAL HOLDS" : finalBoss.defeated ? "EXAMINER DEFEATED" : "FINAL PHASE ACTIVE"}</div><h2 className="mt-1 text-2xl font-black tracking-[-0.04em]">{finalBoss.bossName}</h2><p className="mt-1 text-xs text-zinc-300">Defeat every minion to break the seal.</p></div></div><div className="rounded-xl border border-violet-200/15 bg-black/25 px-4 py-3 text-right"><div className="text-[9px] font-bold tracking-[0.14em] text-violet-200/65">FINAL EXAMINER HP</div><div className="mt-1 text-3xl font-black text-violet-100">{num(finalBoss.currentHP)}</div><div className="text-[9px] font-bold tracking-[0.1em] text-zinc-500">OF {num(finalBoss.maxHP)}</div><div className="mt-2"><Bar current={finalBoss.currentHP} max={finalBoss.maxHP} className="from-violet-500 via-fuchsia-400 to-cyan-300" /></div></div></section> : null}</div>
          </section> : null}
        </>}
      </main>
    </div>
  );
}
