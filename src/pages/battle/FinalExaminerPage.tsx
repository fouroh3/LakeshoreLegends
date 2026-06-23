// src/pages/battle/FinalExaminerPage.tsx

import { useCallback, useEffect, useMemo, useState } from "react";
import AppTopBar from "../../components/AppTopBar";
import {
  getFinalExaminerState,
  startFinalExaminerRaid,
  submitFinalExaminerAction,
  type FinalExaminerBossState,
  type FinalExaminerRaidState,
} from "./finalExaminerApi";

const RAID_ID = "final_examiner_2026";

function formatNumber(value: number) {
  return Math.max(0, Math.round(Number(value) || 0)).toLocaleString();
}

function makeRequestId(prefix: string) {
  return `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2, 9)}`;
}

function hpPercent(current: number, max: number) {
  if (!max) return 0;
  return Math.max(0, Math.min(100, (current / max) * 100));
}

export default function FinalExaminerPage() {
  const isTeacher = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("teacher") === "1";
  }, []);

  const [raid, setRaid] = useState<FinalExaminerRaidState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedClassKey, setSelectedClassKey] = useState("");
  const [action, setAction] = useState<"HEAL" | "STRIKE">("STRIKE");
  const [targetBossKey, setTargetBossKey] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const next = await getFinalExaminerState(RAID_ID);
      setRaid(next);
      setError(null);
    } catch (e: any) {
      setError(e?.message || "Could not load Final Examiner state.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 2_000);
    return () => window.clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    if (!raid?.classes?.length) return;
    setSelectedClassKey((current) =>
      raid.classes.some((item) => item.classKey === current)
        ? current
        : raid.classes[0].classKey
    );
  }, [raid?.classes]);

  const selectableBosses = useMemo(
    () =>
      (raid?.bosses ?? []).filter((boss) => !boss.locked && !boss.defeated),
    [raid?.bosses]
  );

  useEffect(() => {
    if (action !== "STRIKE") return;
    setTargetBossKey((current) =>
      selectableBosses.some((boss) => boss.bossKey === current)
        ? current
        : selectableBosses[0]?.bossKey ?? ""
    );
  }, [action, selectableBosses]);

  const selectedBoss = useMemo(
    () => (raid?.bosses ?? []).find((boss) => boss.bossKey === targetBossKey),
    [raid?.bosses, targetBossKey]
  );

  const submitAction = useCallback(async () => {
    const parsed = Number.parseInt(amount, 10);
    if (!selectedClassKey) {
      setMessage("Choose a class first.");
      return;
    }
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setMessage("Enter a positive total.");
      return;
    }
    if (action === "STRIKE" && !targetBossKey) {
      setMessage("Choose one living boss to strike.");
      return;
    }

    setSubmitting(true);
    setMessage(null);
    try {
      const result = await submitFinalExaminerAction({
        raidId: RAID_ID,
        classKey: selectedClassKey,
        action,
        amount: parsed,
        targetBossKey: action === "STRIKE" ? targetBossKey : "",
        note,
        requestId: makeRequestId("final-examiner"),
      });

      const applied = Number(result?.appliedAmount ?? parsed);
      const overkill = Number(result?.overkillLost ?? 0);
      setMessage(
        action === "HEAL"
          ? `Healing applied: +${formatNumber(applied)} HP.`
          : overkill > 0
          ? `Strike applied: ${formatNumber(applied)} damage. ${formatNumber(overkill)} overkill was lost.`
          : `Strike applied: ${formatNumber(applied)} damage.`
      );
      setAmount("");
      setNote("");
      await refresh();
    } catch (e: any) {
      setMessage(e?.message || "Could not apply that action.");
    } finally {
      setSubmitting(false);
    }
  }, [action, amount, note, refresh, selectedClassKey, targetBossKey]);

  const startRaid = useCallback(async () => {
    if (!window.confirm("Start or reset the Final Examiner raid using the currently ACTIVE Battle_Control classes? This resets Final Examiner HP only.")) {
      return;
    }

    setSubmitting(true);
    setMessage(null);
    try {
      await startFinalExaminerRaid({
        raidId: RAID_ID,
        requestId: makeRequestId("final-examiner-start"),
      });
      setMessage("Final Examiner raid started from the active class HP totals.");
      await refresh();
    } catch (e: any) {
      setMessage(e?.message || "Could not start Final Examiner.");
    } finally {
      setSubmitting(false);
    }
  }, [refresh]);

  const bossCard = (boss: FinalExaminerBossState) => {
    const percent = hpPercent(boss.currentHP, boss.maxHP);
    return (
      <div
        key={boss.bossKey}
        className={[
          "rounded-2xl border p-4",
          boss.defeated
            ? "border-emerald-500/30 bg-emerald-950/20 opacity-70"
            : boss.locked
            ? "border-zinc-800 bg-zinc-950/60 opacity-60"
            : "border-rose-500/25 bg-rose-950/15",
        ].join(" ")}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold tracking-[0.18em] text-zinc-500">
              {boss.defeated ? "DEFEATED" : boss.locked ? "LOCKED" : "ACTIVE TARGET"}
            </div>
            <div className="mt-1 text-base font-semibold text-zinc-100">{boss.bossName}</div>
          </div>
          <div className="text-right text-sm font-semibold tabular-nums text-zinc-100">
            {formatNumber(boss.currentHP)} / {formatNumber(boss.maxHP)}
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-900">
          <div
            className={boss.defeated ? "h-full bg-emerald-400" : "h-full bg-rose-500"}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-[100dvh] bg-[#05070d] text-zinc-100">
      <AppTopBar
        title="Final Examiner"
        activeView="battle"
        onNavigate={(next) => {
          const routes: Record<string, string> = {
            dashboard: "/",
            store: "/store",
            cards: "/cards",
            battle: "/battle",
          };
          window.location.href = routes[next] || "/";
        }}
      />

      <main className="mx-auto w-full max-w-[1800px] px-3 py-4 sm:px-5 lg:px-7">
        <div className="rounded-3xl border border-violet-400/20 bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.17),transparent_48%),rgba(9,11,20,0.95)] p-5 shadow-2xl shadow-violet-950/30">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-[11px] font-bold tracking-[0.24em] text-violet-300">MEGA BOSS RAID</div>
              <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">THE FINAL EXAMINER</h1>
              <p className="mt-2 max-w-3xl text-sm text-zinc-400">
                Each class is one raid unit. Heal totals are summed from D4 rolls; strike totals are summed from D20 rolls and must target one boss.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm">
              <div className="text-[10px] font-bold tracking-[0.16em] text-zinc-500">RAID STATUS</div>
              <div className="mt-1 font-semibold text-zinc-100">{raid?.phase ?? "NOT STARTED"}</div>
            </div>
          </div>
        </div>

        {error && <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-950/30 px-4 py-3 text-sm text-red-200">{error}</div>}
        {message && <div className="mt-4 rounded-2xl border border-cyan-500/25 bg-cyan-950/20 px-4 py-3 text-sm text-cyan-100">{message}</div>}

        {loading ? (
          <div className="mt-5 text-sm text-zinc-400">Loading Final Examiner raid…</div>
        ) : !raid?.active ? (
          <div className="mt-5 rounded-3xl border border-zinc-800 bg-zinc-950/60 p-6">
            <div className="text-lg font-semibold">Final Examiner has not started.</div>
            <p className="mt-2 max-w-2xl text-sm text-zinc-400">
              Start it after the participating classes are ACTIVE in Battle_Control. The backend will total each class or paired class’s current player HP into a separate raid HP pool.
            </p>
            {isTeacher && (
              <button
                type="button"
                disabled={submitting}
                onClick={() => void startRaid()}
                className="mt-5 rounded-xl border border-violet-400/40 bg-violet-500/20 px-4 py-2 text-sm font-semibold text-violet-100 disabled:opacity-50"
              >
                Start Final Examiner Raid
              </button>
            )}
          </div>
        ) : (
          <>
            <section className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)]">
              <div className="rounded-3xl border border-zinc-800 bg-zinc-950/60 p-4 sm:p-5">
                <div className="mb-4 flex items-baseline justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-bold tracking-[0.18em] text-cyan-300">CLASS RAID HP</div>
                    <div className="mt-1 text-lg font-semibold">All classes act independently</div>
                  </div>
                  <button type="button" onClick={() => void refresh()} className="text-xs text-zinc-400 hover:text-zinc-100">Refresh</button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {(raid.classes ?? []).map((item) => {
                    const percent = hpPercent(item.currentHP, item.startingHP);
                    return (
                      <div key={item.classKey} className="rounded-2xl border border-cyan-500/15 bg-cyan-950/10 p-4">
                        <div className="text-sm font-semibold text-zinc-100">{item.label}</div>
                        <div className="mt-3 flex items-baseline justify-between gap-2">
                          <div className="text-2xl font-black tabular-nums">{formatNumber(item.currentHP)}</div>
                          <div className="text-xs text-zinc-500">/ {formatNumber(item.startingHP)} HP</div>
                        </div>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-900">
                          <div className="h-full bg-cyan-400" style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-3xl border border-zinc-800 bg-zinc-950/60 p-4 sm:p-5">
                <div className="text-[10px] font-bold tracking-[0.18em] text-rose-300">BOSS ARENA</div>
                <div className="mt-1 text-lg font-semibold">Minions first. Examiner unlocks last.</div>
                <div className="mt-4 grid gap-3">{(raid.bosses ?? []).map(bossCard)}</div>
              </div>
            </section>

            {isTeacher && (
              <section className="mt-5 rounded-3xl border border-amber-400/20 bg-amber-950/10 p-4 sm:p-5">
                <div className="text-[10px] font-bold tracking-[0.18em] text-amber-300">ADMIN ACTION ENTRY</div>
                <div className="mt-1 text-lg font-semibold">Apply one completed class action immediately</div>
                <p className="mt-1 text-sm text-zinc-400">No round locks. Enter a class’s total only after that class has finished its D4 or D20 rolls.</p>

                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                  <label className="block text-xs text-zinc-400">
                    Class
                    <select value={selectedClassKey} onChange={(e) => setSelectedClassKey(e.target.value)} className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100">
                      {(raid.classes ?? []).map((item) => <option key={item.classKey} value={item.classKey}>{item.label}</option>)}
                    </select>
                  </label>
                  <label className="block text-xs text-zinc-400">
                    Action
                    <select value={action} onChange={(e) => setAction(e.target.value as "HEAL" | "STRIKE")} className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100">
                      <option value="STRIKE">Strike</option>
                      <option value="HEAL">Heal</option>
                    </select>
                  </label>
                  {action === "STRIKE" ? (
                    <label className="block text-xs text-zinc-400">
                      One target boss
                      <select value={targetBossKey} onChange={(e) => setTargetBossKey(e.target.value)} className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100">
                        {selectableBosses.map((boss) => <option key={boss.bossKey} value={boss.bossKey}>{boss.bossName}</option>)}
                      </select>
                    </label>
                  ) : <div />}
                  <label className="block text-xs text-zinc-400">
                    {action === "STRIKE" ? "Total D20 damage" : "Total D4 healing"}
                    <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" placeholder="0" className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100" />
                  </label>
                  <label className="block text-xs text-zinc-400">
                    Note (optional)
                    <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. cards applied" className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100" />
                  </label>
                </div>

                {action === "STRIKE" && selectedBoss && amount && (
                  <div className="mt-3 rounded-xl border border-zinc-800 bg-black/20 px-3 py-2 text-xs text-zinc-300">
                    Preview: {selectedBoss.bossName} takes {formatNumber(Math.min(Number(amount) || 0, selectedBoss.currentHP))}. Overkill lost: {formatNumber(Math.max(0, (Number(amount) || 0) - selectedBoss.currentHP))}.
                  </div>
                )}

                <button type="button" disabled={submitting} onClick={() => void submitAction()} className="mt-4 rounded-xl border border-amber-300/40 bg-amber-400/15 px-5 py-2.5 text-sm font-bold text-amber-100 disabled:opacity-50">
                  {submitting ? "Applying…" : "Apply Class Action"}
                </button>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
