import { useCallback, useEffect, useMemo, useState } from "react";
import AppTopBar from "../../components/AppTopBar";
import {
  getFinalExaminerState,
  submitFinalExaminerAction,
  type FinalExaminerBossState,
  type FinalExaminerRaidState,
} from "./finalExaminerApi";

const RAID_ID = "final_examiner_2026";

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

function bossBar(boss: FinalExaminerBossState) {
  if (boss.defeated) return "from-emerald-400 to-cyan-300";
  if (boss.locked) return "from-violet-500 to-fuchsia-300";
  return "from-rose-500 via-pink-400 to-orange-300";
}

export default function FinalExaminerRaid() {
  const teacher = useMemo(
    () => new URLSearchParams(window.location.search).get("teacher") === "1",
    []
  );
  const [raid, setRaid] = useState<FinalExaminerRaidState | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [classKey, setClassKey] = useState("");
  const [action, setAction] = useState<"HEAL" | "STRIKE">("STRIKE");
  const [target, setTarget] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setRaid(await getFinalExaminerState(RAID_ID));
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

  const minions = useMemo(
    () => (raid?.bosses || []).filter((boss) => boss.bossKey !== "FINAL_EXAMINER"),
    [raid]
  );
  const finalBoss = useMemo(
    () => (raid?.bosses || []).find((boss) => boss.bossKey === "FINAL_EXAMINER") || null,
    [raid]
  );
  const targets = useMemo(
    () => (raid?.bosses || []).filter((boss) => !boss.locked && !boss.defeated),
    [raid]
  );
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
      setNotice(result?.overkillLost ? `Applied ${num(result.appliedAmount)}. Overkill lost: ${num(result.overkillLost)}.` : "Action applied.");
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
      <AppTopBar title="Final Examiner" activeView="battle" onNavigate={() => undefined} />

      <main className="mx-auto w-full max-w-[1900px] px-4 py-4 lg:zoom-[0.78] xl:zoom-[0.86] 2xl:zoom-100">
        <section className="relative overflow-hidden rounded-[28px] border border-violet-300/20 bg-[radial-gradient(circle_at_88%_10%,rgba(168,85,247,0.23),transparent_28%),linear-gradient(135deg,rgba(24,13,47,0.98),rgba(8,10,22,0.98))] px-6 py-5 shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-[10px] font-black tracking-[0.24em] text-violet-200/80">ENDGAME RAID · LIVE COMMAND BOARD</div>
              <h1 className="mt-1 text-4xl font-black tracking-[-0.05em] text-white">THE FINAL EXAMINER</h1>
              <p className="mt-1 text-sm text-zinc-300">Three class units. Five minions. One sealed final boss.</p>
            </div>
            <div className="grid grid-cols-4 gap-2 lg:w-[470px]">
              {[
                ["PHASE", raid?.phase === "FINAL_EXAMINER" ? "FINAL BOSS" : raid?.phase || "LOADING", "text-violet-100"],
                ["DOWN", `${defeated} / ${minions.length || 5}`, "text-white"],
                ["MINION HP", num(remaining), "text-rose-200"],
                ["STATUS", "LIVE SYNC", "text-cyan-100"],
              ].map(([label, value, color]) => (
                <div key={label} className="rounded-xl border border-white/10 bg-black/25 px-3 py-2">
                  <div className="text-[9px] font-bold tracking-[0.15em] text-zinc-500">{label}</div>
                  <div className={`mt-1 text-sm font-black ${color}`}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {error ? <div className="mt-3 rounded-xl border border-red-400/25 bg-red-950/30 px-4 py-2 text-sm text-red-100">{error}</div> : null}
        {notice ? <div className="mt-3 rounded-xl border border-cyan-400/25 bg-cyan-950/30 px-4 py-2 text-sm text-cyan-100">{notice}</div> : null}

        {raid?.active ? (
          <>
            <section className="mt-4 grid gap-4 xl:grid-cols-[0.72fr_1.78fr]">
              <div className="rounded-[24px] border border-cyan-300/15 bg-[linear-gradient(145deg,rgba(8,24,34,0.88),rgba(8,12,20,0.96))] p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-black tracking-[0.2em] text-cyan-200/85">RAID PARTIES</div>
                    <h2 className="mt-0.5 text-lg font-black">Class Vitality</h2>
                  </div>
                  <div className="rounded-full border border-cyan-300/15 bg-cyan-300/10 px-2.5 py-1 text-[9px] font-black tracking-[0.14em] text-cyan-100">HP IS SEPARATE</div>
                </div>

                <div className="mt-3 grid gap-2">
                  {raid.classes.map((unit, index) => {
                    const hp = percent(unit.currentHP, unit.startingHP);
                    return (
                      <article key={unit.classKey} className="relative overflow-hidden rounded-xl border border-cyan-300/15 bg-black/20 px-4 py-3">
                        <div className="absolute inset-y-0 left-0 w-1 bg-cyan-300/75" />
                        <div className="flex items-center justify-between gap-3 pl-1">
                          <div>
                            <div className="text-[9px] font-bold tracking-[0.15em] text-cyan-200/65">RAID UNIT 0{index + 1}</div>
                            <div className="mt-0.5 text-base font-black">{unit.label}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-black text-cyan-100">{num(unit.currentHP)}</div>
                            <div className="text-[9px] font-bold tracking-[0.12em] text-zinc-500">OF {num(unit.startingHP)} HP</div>
                          </div>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/50"><div className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-300 to-teal-200" style={{ width: `${hp}%` }} /></div>
                      </article>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-[24px] border border-rose-300/15 bg-[linear-gradient(145deg,rgba(36,8,18,0.75),rgba(9,10,18,0.98))] p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-[10px] font-black tracking-[0.2em] text-rose-200/85">BOSS ARENA</div>
                    <h2 className="mt-0.5 text-lg font-black">The Five Minions</h2>
                  </div>
                  <div className="w-[210px]">
                    <div className="flex justify-between text-[9px] font-bold tracking-[0.12em] text-zinc-500"><span>ARENA CLEARANCE</span><span>{Math.round(percent(total - remaining, total))}%</span></div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-black/50"><div className="h-full rounded-full bg-gradient-to-r from-rose-400 to-amber-200" style={{ width: `${percent(total - remaining, total)}%` }} /></div>
                  </div>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                  {minions.map((boss, index) => (
                    <article key={boss.bossKey} className="relative min-w-0 overflow-hidden rounded-xl border border-white/10 bg-black/25 px-3 py-3">
                      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${bossBar(boss)}`} />
                      <div className="flex items-center justify-between gap-2 text-[9px] font-black tracking-[0.13em] text-zinc-500"><span>MINION 0{index + 1}</span><span className="text-zinc-300">{bossState(boss)}</span></div>
                      <div className="mt-2 min-h-[38px] text-sm font-black leading-5 text-white">{boss.bossName}</div>
                      <div className="mt-3 flex items-end justify-between"><div><div className="text-xl font-black text-rose-100">{num(boss.currentHP)}</div><div className="text-[9px] font-bold tracking-[0.1em] text-zinc-500">OF {num(boss.maxHP)}</div></div><div className="text-xs font-black text-zinc-300">{Math.round(percent(boss.currentHP, boss.maxHP))}%</div></div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/50"><div className={`h-full rounded-full bg-gradient-to-r ${bossBar(boss)}`} style={{ width: `${percent(boss.currentHP, boss.maxHP)}%` }} /></div>
                    </article>
                  ))}
                </div>
              </div>
            </section>

            {finalBoss ? (
              <section className="mt-4 grid gap-4 rounded-[24px] border border-violet-300/25 bg-[radial-gradient(circle_at_82%_20%,rgba(192,132,252,0.19),transparent_28%),linear-gradient(135deg,rgba(37,16,67,0.92),rgba(11,10,23,0.98))] p-4 lg:grid-cols-[1fr_315px] lg:items-center">
                <div>
                  <div className="text-[10px] font-black tracking-[0.2em] text-violet-200/85">{finalBoss.locked ? "THE SEAL HOLDS" : finalBoss.defeated ? "EXAMINER DEFEATED" : "FINAL PHASE ACTIVE"}</div>
                  <h2 className="mt-1 text-2xl font-black tracking-[-0.035em]">{finalBoss.bossName}</h2>
                  <p className="mt-1 text-xs text-zinc-300">Defeat every minion to break the seal. Damage cannot transfer between bosses.</p>
                </div>
                <div className="rounded-xl border border-violet-200/15 bg-black/25 px-4 py-3 text-right"><div className="text-[9px] font-bold tracking-[0.15em] text-violet-200/65">FINAL EXAMINER HP</div><div className="mt-1 text-3xl font-black text-violet-100">{num(finalBoss.currentHP)}</div><div className="text-[9px] font-bold tracking-[0.12em] text-zinc-500">OF {num(finalBoss.maxHP)} HP</div><div className="mt-2 h-2 overflow-hidden rounded-full bg-black/50"><div className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-400 to-cyan-300" style={{ width: `${percent(finalBoss.currentHP, finalBoss.maxHP)}%` }} /></div></div>
              </section>
            ) : null}

            {teacher ? (
              <section className="mt-4 rounded-[24px] border border-amber-300/20 bg-[linear-gradient(145deg,rgba(58,38,5,0.46),rgba(13,13,17,0.96))] p-4">
                <div className="flex items-center justify-between"><div><div className="text-[10px] font-black tracking-[0.2em] text-amber-200/85">TEACHER COMMAND CONSOLE</div><h2 className="mt-0.5 text-lg font-black">Record a Class Action</h2></div><div className="text-xs text-amber-100/65">Enter the total after the class rolls.</div></div>
                <div className="mt-3 grid gap-2 lg:grid-cols-[1.15fr_0.72fr_1.15fr_0.68fr_auto]">
                  <select value={classKey} onChange={(event) => setClassKey(event.target.value)} className="rounded-xl border border-white/10 bg-black/35 px-3 py-2.5 text-sm font-semibold outline-none focus:border-amber-300/50">{raid.classes.map((unit) => <option key={unit.classKey} value={unit.classKey}>{unit.label}</option>)}</select>
                  <select value={action} onChange={(event) => setAction(event.target.value as "HEAL" | "STRIKE")} className="rounded-xl border border-white/10 bg-black/35 px-3 py-2.5 text-sm font-semibold outline-none focus:border-amber-300/50"><option value="STRIKE">Strike</option><option value="HEAL">Heal</option></select>
                  {action === "STRIKE" ? <select value={target} onChange={(event) => setTarget(event.target.value)} className="rounded-xl border border-white/10 bg-black/35 px-3 py-2.5 text-sm font-semibold outline-none focus:border-amber-300/50">{targets.map((boss) => <option key={boss.bossKey} value={boss.bossKey}>{boss.bossName}</option>)}</select> : <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm font-semibold text-cyan-100">Restore class raid HP</div>}
                  <input value={amount} onChange={(event) => setAmount(event.target.value.replace(/\D/g, ""))} placeholder={action === "HEAL" ? "D4 total" : "D20 total"} inputMode="numeric" className="rounded-xl border border-white/10 bg-black/35 px-3 py-2.5 text-sm font-semibold outline-none placeholder:text-zinc-600 focus:border-amber-300/50" />
                  <button disabled={busy} onClick={() => void apply()} className="rounded-xl border border-amber-200/35 bg-gradient-to-r from-amber-400/20 to-orange-400/15 px-5 py-2.5 text-sm font-black text-amber-50 transition hover:border-amber-100/70 disabled:opacity-45">{busy ? "Applying…" : "Apply Action"}</button>
                </div>
              </section>
            ) : null}
          </>
        ) : null}
      </main>
    </div>
  );
}
