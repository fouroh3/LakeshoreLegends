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
  if (!max) return 0;
  return Math.max(0, Math.min(100, (current / max) * 100));
}

function requestId() {
  return `fe:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`;
}

function bossStatus(boss: FinalExaminerBossState) {
  if (boss.defeated) return "DEFEATED";
  if (boss.locked) return "SEALED";
  return "ACTIVE TARGET";
}

function bossAccent(boss: FinalExaminerBossState) {
  if (boss.defeated) return "from-emerald-300 via-emerald-400 to-cyan-300";
  if (boss.locked) return "from-violet-400 via-fuchsia-400 to-violet-300";
  return "from-rose-400 via-pink-500 to-orange-300";
}

export default function FinalExaminerRaid() {
  const isTeacher = useMemo(
    () => new URLSearchParams(window.location.search).get("teacher") === "1",
    []
  );

  const [raid, setRaid] = useState<FinalExaminerRaidState | null>(null);
  const [error, setError] = useState("");
  const [classKey, setClassKey] = useState("");
  const [action, setAction] = useState<"HEAL" | "STRIKE">("STRIKE");
  const [target, setTarget] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    try {
      const nextRaid = await getFinalExaminerState(RAID_ID);
      setRaid(nextRaid);
      setError("");
    } catch (caught: any) {
      setError(caught?.message || "Final Examiner is not configured yet.");
    }
  }, []);

  useEffect(() => {
    void refresh();

    const intervalId = window.setInterval(() => {
      void refresh();
    }, 2000);

    return () => window.clearInterval(intervalId);
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

  const defeatedMinions = minions.filter((boss) => boss.defeated).length;
  const totalMinionHp = minions.reduce((sum, boss) => sum + boss.maxHP, 0);
  const remainingMinionHp = minions.reduce((sum, boss) => sum + boss.currentHP, 0);

  useEffect(() => {
    if (!raid?.classes?.length) return;

    if (!raid.classes.some((classUnit) => classUnit.classKey === classKey)) {
      setClassKey(raid.classes[0].classKey);
    }
  }, [raid, classKey]);

  useEffect(() => {
    if (action !== "STRIKE") return;

    if (!targets.some((boss) => boss.bossKey === target)) {
      setTarget(targets[0]?.bossKey || "");
    }
  }, [action, target, targets]);

  const apply = async () => {
    const total = Number.parseInt(amount, 10);

    if (
      !classKey ||
      !Number.isFinite(total) ||
      total <= 0 ||
      (action === "STRIKE" && !target)
    ) {
      setNotice("Complete the action fields first.");
      return;
    }

    setBusy(true);

    try {
      const result: any = await submitFinalExaminerAction({
        raidId: RAID_ID,
        classKey,
        action,
        amount: total,
        targetBossKey: action === "STRIKE" ? target : "",
        requestId: requestId(),
      });

      setNotice(
        result?.overkillLost
          ? `Applied ${num(result.appliedAmount)}. Overkill lost: ${num(result.overkillLost)}.`
          : "Action applied. The raid board has updated."
      );
      setAmount("");
      await refresh();
    } catch (caught: any) {
      setNotice(caught?.message || "Action failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-[#05070d] text-zinc-100">
      <AppTopBar
        title="Final Examiner"
        activeView="battle"
        onNavigate={() => undefined}
      />

      <main className="mx-auto w-full max-w-[1720px] px-4 py-5 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-[32px] border border-violet-300/20 bg-[radial-gradient(circle_at_85%_20%,rgba(168,85,247,0.26),transparent_31%),radial-gradient(circle_at_8%_95%,rgba(34,211,238,0.12),transparent_30%),linear-gradient(135deg,rgba(24,13,47,0.96),rgba(8,10,22,0.98))] px-6 py-7 shadow-[0_24px_75px_rgba(0,0,0,0.38)] sm:px-8">
          <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] [background-size:32px_32px]" />

          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="text-[10px] font-black tracking-[0.26em] text-violet-200/85">
                ENDGAME RAID · LIVE COMMAND BOARD
              </div>
              <h1 className="mt-2 text-4xl font-black tracking-[-0.045em] text-white sm:text-5xl">
                THE FINAL EXAMINER
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300 sm:text-base">
                Three class units. Five minions. One sealed final boss. Every action updates the shared raid immediately.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:w-[560px]">
              <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 backdrop-blur-sm">
                <div className="text-[10px] font-bold tracking-[0.16em] text-zinc-500">PHASE</div>
                <div className="mt-1 text-sm font-black text-violet-100">
                  {raid?.phase === "FINAL_EXAMINER" ? "FINAL BOSS" : raid?.phase || "LOADING"}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 backdrop-blur-sm">
                <div className="text-[10px] font-bold tracking-[0.16em] text-zinc-500">MINIONS DOWN</div>
                <div className="mt-1 text-sm font-black text-white">
                  {defeatedMinions} / {minions.length || 5}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 backdrop-blur-sm">
                <div className="text-[10px] font-bold tracking-[0.16em] text-zinc-500">MINION HP</div>
                <div className="mt-1 text-sm font-black text-rose-200">{num(remainingMinionHp)}</div>
              </div>
              <div className="rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-3 backdrop-blur-sm">
                <div className="text-[10px] font-bold tracking-[0.16em] text-cyan-200/70">STATUS</div>
                <div className="mt-1 text-sm font-black text-cyan-100">LIVE SYNC</div>
              </div>
            </div>
          </div>
        </section>

        {error ? (
          <div className="mt-5 rounded-2xl border border-red-400/25 bg-red-950/30 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        ) : null}

        {notice ? (
          <div className="mt-5 rounded-2xl border border-cyan-400/25 bg-cyan-950/30 px-4 py-3 text-sm text-cyan-100">
            {notice}
          </div>
        ) : null}

        {raid?.active ? (
          <>
            <section className="mt-6 grid gap-5 xl:grid-cols-[0.9fr_1.55fr]">
              <div className="rounded-[28px] border border-cyan-300/15 bg-[linear-gradient(145deg,rgba(8,24,34,0.88),rgba(8,12,20,0.92))] p-5 shadow-[0_20px_45px_rgba(0,0,0,0.25)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-black tracking-[0.22em] text-cyan-200/90">RAID PARTIES</div>
                    <h2 className="mt-1 text-xl font-black tracking-tight">Class Vitality</h2>
                  </div>
                  <div className="rounded-full border border-cyan-300/15 bg-cyan-300/10 px-3 py-1 text-[10px] font-bold tracking-[0.15em] text-cyan-100">
                    HP IS SEPARATE
                  </div>
                </div>

                <div className="mt-5 grid gap-3">
                  {raid.classes.map((classUnit, index) => {
                    const hpPercent = percent(classUnit.currentHP, classUnit.startingHP);
                    const isCritical = hpPercent <= 25;

                    return (
                      <article
                        key={classUnit.classKey}
                        className="relative overflow-hidden rounded-2xl border border-cyan-300/15 bg-black/20 p-4"
                      >
                        <div className="absolute inset-y-0 left-0 w-1 bg-cyan-300/70" />
                        <div className="pl-2">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-[10px] font-bold tracking-[0.17em] text-cyan-200/65">
                                RAID UNIT 0{index + 1}
                              </div>
                              <div className="mt-1 text-lg font-black tracking-tight text-white">
                                {classUnit.label}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={isCritical ? "text-2xl font-black text-rose-200" : "text-2xl font-black text-cyan-100"}>
                                {num(classUnit.currentHP)}
                              </div>
                              <div className="text-[10px] font-bold tracking-[0.12em] text-zinc-500">
                                OF {num(classUnit.startingHP)} HP
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-black/50 ring-1 ring-white/5">
                            <div
                              className={isCritical ? "h-full rounded-full bg-gradient-to-r from-rose-500 to-orange-300" : "h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-300 to-teal-200"}
                              style={{ width: `${hpPercent}%` }}
                            />
                          </div>
                          <div className="mt-2 flex items-center justify-between text-[10px] font-semibold tracking-[0.12em] text-zinc-500">
                            <span>{isCritical ? "CRITICAL VITALITY" : "READY FOR ACTION"}</span>
                            <span>{Math.round(hpPercent)}%</span>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-[28px] border border-rose-300/15 bg-[linear-gradient(145deg,rgba(36,8,18,0.75),rgba(9,10,18,0.96))] p-5 shadow-[0_20px_45px_rgba(0,0,0,0.25)]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-[10px] font-black tracking-[0.22em] text-rose-200/90">BOSS ARENA</div>
                    <h2 className="mt-1 text-xl font-black tracking-tight">The Five Minions</h2>
                  </div>
                  <div className="min-w-[170px]">
                    <div className="flex justify-between text-[10px] font-bold tracking-[0.13em] text-zinc-500">
                      <span>ARENA CLEARANCE</span>
                      <span>{Math.round(percent(totalMinionHp - remainingMinionHp, totalMinionHp))}%</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/50 ring-1 ring-white/5">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-rose-400 via-orange-300 to-amber-200"
                        style={{ width: `${percent(totalMinionHp - remainingMinionHp, totalMinionHp)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {minions.map((boss, index) => {
                    const hpPercent = percent(boss.currentHP, boss.maxHP);

                    return (
                      <article
                        key={boss.bossKey}
                        className="group relative overflow-hidden rounded-2xl border border-white/10 bg-black/25 p-4 transition hover:-translate-y-0.5 hover:border-rose-200/35"
                      >
                        <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${bossAccent(boss)}`} />
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-[10px] font-black tracking-[0.16em] text-zinc-500">MINION 0{index + 1}</div>
                          <div className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[9px] font-black tracking-[0.13em] text-zinc-300">
                            {bossStatus(boss)}
                          </div>
                        </div>
                        <div className="mt-3 min-h-[48px] text-lg font-black leading-6 tracking-tight text-white">
                          {boss.bossName}
                        </div>
                        <div className="mt-5 flex items-end justify-between gap-3">
                          <div>
                            <div className="text-2xl font-black text-rose-100">{num(boss.currentHP)}</div>
                            <div className="text-[10px] font-bold tracking-[0.12em] text-zinc-500">OF {num(boss.maxHP)} HP</div>
                          </div>
                          <div className="text-right text-sm font-black text-zinc-300">{Math.round(hpPercent)}%</div>
                        </div>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/50 ring-1 ring-white/5">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${bossAccent(boss)}`}
                            style={{ width: `${hpPercent}%` }}
                          />
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            </section>

            {finalBoss ? (
              <section className="mt-5 overflow-hidden rounded-[30px] border border-violet-300/25 bg-[radial-gradient(circle_at_78%_15%,rgba(192,132,252,0.2),transparent_29%),linear-gradient(135deg,rgba(37,16,67,0.92),rgba(11,10,23,0.98))] shadow-[0_22px_65px_rgba(0,0,0,0.3)]">
                <div className="grid gap-5 p-6 lg:grid-cols-[1fr_auto] lg:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-full border border-violet-300/25 bg-violet-300/10 px-3 py-1 text-[10px] font-black tracking-[0.16em] text-violet-100">
                        {finalBoss.locked ? "THE SEAL HOLDS" : finalBoss.defeated ? "EXAMINER DEFEATED" : "FINAL PHASE ACTIVE"}
                      </span>
                      <span className="text-[10px] font-bold tracking-[0.16em] text-violet-200/55">FINAL BOSS</span>
                    </div>
                    <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">
                      {finalBoss.bossName}
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-300">
                      Defeat every minion to break the seal. Damage cannot be transferred between bosses, and overkill is lost.
                    </p>
                  </div>

                  <div className="min-w-[260px] rounded-2xl border border-violet-200/15 bg-black/25 p-4 text-right">
                    <div className="text-[10px] font-bold tracking-[0.16em] text-violet-200/65">FINAL EXAMINER HP</div>
                    <div className="mt-2 text-4xl font-black text-violet-100">{num(finalBoss.currentHP)}</div>
                    <div className="text-[10px] font-bold tracking-[0.13em] text-zinc-500">OF {num(finalBoss.maxHP)} HP</div>
                  </div>
                </div>

                <div className="h-3 bg-black/35">
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 via-fuchsia-400 to-cyan-300 transition-[width] duration-500"
                    style={{ width: `${percent(finalBoss.currentHP, finalBoss.maxHP)}%` }}
                  />
                </div>
              </section>
            ) : null}

            {isTeacher ? (
              <section className="mt-5 rounded-[28px] border border-amber-300/20 bg-[linear-gradient(145deg,rgba(58,38,5,0.46),rgba(13,13,17,0.95))] p-5 shadow-[0_20px_45px_rgba(0,0,0,0.24)]">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-[10px] font-black tracking-[0.22em] text-amber-200/90">TEACHER COMMAND CONSOLE</div>
                    <h2 className="mt-1 text-xl font-black tracking-tight">Record a Class Action</h2>
                  </div>
                  <div className="text-xs text-amber-100/70">Enter the class total after its students roll.</div>
                </div>

                <div className="mt-5 grid gap-3 lg:grid-cols-[1.15fr_0.8fr_1.2fr_0.85fr_auto]">
                  <label className="grid gap-1.5">
                    <span className="text-[10px] font-bold tracking-[0.14em] text-zinc-500">RAID UNIT</span>
                    <select
                      value={classKey}
                      onChange={(event) => setClassKey(event.target.value)}
                      className="rounded-xl border border-white/10 bg-black/35 px-3 py-3 text-sm font-semibold text-zinc-100 outline-none transition focus:border-amber-300/45"
                    >
                      {raid.classes.map((classUnit) => (
                        <option value={classUnit.classKey} key={classUnit.classKey}>
                          {classUnit.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-1.5">
                    <span className="text-[10px] font-bold tracking-[0.14em] text-zinc-500">ACTION</span>
                    <select
                      value={action}
                      onChange={(event) => setAction(event.target.value as "HEAL" | "STRIKE")}
                      className="rounded-xl border border-white/10 bg-black/35 px-3 py-3 text-sm font-semibold text-zinc-100 outline-none transition focus:border-amber-300/45"
                    >
                      <option value="STRIKE">Strike</option>
                      <option value="HEAL">Heal</option>
                    </select>
                  </label>

                  <label className="grid gap-1.5">
                    <span className="text-[10px] font-bold tracking-[0.14em] text-zinc-500">{action === "STRIKE" ? "TARGET BOSS" : "HEALING MODE"}</span>
                    {action === "STRIKE" ? (
                      <select
                        value={target}
                        onChange={(event) => setTarget(event.target.value)}
                        className="rounded-xl border border-white/10 bg-black/35 px-3 py-3 text-sm font-semibold text-zinc-100 outline-none transition focus:border-amber-300/45"
                      >
                        {targets.map((boss) => (
                          <option value={boss.bossKey} key={boss.bossKey}>
                            {boss.bossName}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm font-semibold text-cyan-100">
                        Restore class raid HP
                      </div>
                    )}
                  </label>

                  <label className="grid gap-1.5">
                    <span className="text-[10px] font-bold tracking-[0.14em] text-zinc-500">TOTAL</span>
                    <input
                      value={amount}
                      onChange={(event) => setAmount(event.target.value.replace(/\D/g, ""))}
                      placeholder={action === "HEAL" ? "D4 total" : "D20 total"}
                      inputMode="numeric"
                      className="rounded-xl border border-white/10 bg-black/35 px-3 py-3 text-sm font-semibold text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-amber-300/45"
                    />
                  </label>

                  <button
                    disabled={busy}
                    onClick={() => void apply()}
                    className="self-end rounded-xl border border-amber-200/35 bg-gradient-to-r from-amber-400/20 to-orange-400/15 px-5 py-3 text-sm font-black text-amber-50 shadow-[0_10px_25px_rgba(245,158,11,0.12)] transition hover:border-amber-100/70 hover:from-amber-400/30 hover:to-orange-400/25 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {busy ? "Applying…" : "Apply Action"}
                  </button>
                </div>
              </section>
            ) : null}
          </>
        ) : null}
      </main>
    </div>
  );
}
