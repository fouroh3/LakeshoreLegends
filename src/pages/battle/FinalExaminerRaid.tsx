import { useCallback, useEffect, useMemo, useState } from "react";
import AppTopBar from "../../components/AppTopBar";
import { getFinalExaminerState, submitFinalExaminerAction, type FinalExaminerRaidState } from "./finalExaminerApi";

const RAID_ID = "final_examiner_2026";
const num = (v: number) => Math.max(0, Math.round(v || 0)).toLocaleString();
const percent = (current: number, max: number) => max ? Math.max(0, Math.min(100, current / max * 100)) : 0;
const requestId = () => `fe:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`;

export default function FinalExaminerRaid() {
  const isTeacher = useMemo(() => new URLSearchParams(window.location.search).get("teacher") === "1", []);
  const [raid, setRaid] = useState<FinalExaminerRaidState | null>(null);
  const [error, setError] = useState("");
  const [classKey, setClassKey] = useState("");
  const [action, setAction] = useState<"HEAL" | "STRIKE">("STRIKE");
  const [target, setTarget] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    try { setRaid(await getFinalExaminerState(RAID_ID)); setError(""); }
    catch (e: any) { setError(e?.message || "Final Examiner is not configured yet."); }
  }, []);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 2000);
    return () => window.clearInterval(id);
  }, [refresh]);

  const targets = useMemo(() => (raid?.bosses || []).filter((b) => !b.locked && !b.defeated), [raid]);
  useEffect(() => { if (raid?.classes?.length && !raid.classes.some((c) => c.classKey === classKey)) setClassKey(raid.classes[0].classKey); }, [raid, classKey]);
  useEffect(() => { if (action === "STRIKE" && !targets.some((b) => b.bossKey === target)) setTarget(targets[0]?.bossKey || ""); }, [action, targets, target]);

  const apply = async () => {
    const total = Number.parseInt(amount, 10);
    if (!classKey || !Number.isFinite(total) || total <= 0 || (action === "STRIKE" && !target)) { setNotice("Complete the action fields first."); return; }
    setBusy(true);
    try {
      const result: any = await submitFinalExaminerAction({ raidId: RAID_ID, classKey, action, amount: total, targetBossKey: action === "STRIKE" ? target : "", requestId: requestId() });
      setNotice(result?.overkillLost ? `Applied ${num(result.appliedAmount)}. Overkill lost: ${num(result.overkillLost)}.` : "Action applied.");
      setAmount(""); await refresh();
    } catch (e: any) { setNotice(e?.message || "Action failed."); }
    finally { setBusy(false); }
  };

  return <div className="min-h-[100dvh] bg-[#05070d] text-zinc-100">
    <AppTopBar title="Final Examiner" activeView="battle" onNavigate={(next) => { window.location.href = next === "dashboard" ? "/" : `/${next}`; }} />
    <main className="mx-auto w-full max-w-[1700px] px-4 py-5">
      <header className="rounded-3xl border border-violet-400/25 bg-violet-950/20 p-5"><div className="text-[10px] font-bold tracking-[0.2em] text-violet-300">SHARED RAID</div><h1 className="mt-1 text-3xl font-black">THE FINAL EXAMINER</h1><p className="mt-2 text-sm text-zinc-400">Class HP is separate from player HP. No rounds or locks: each class acts when ready.</p></header>
      {error && <div className="mt-4 rounded-2xl border border-red-400/25 bg-red-950/30 p-3 text-sm text-red-200">{error}</div>}
      {notice && <div className="mt-4 rounded-2xl border border-cyan-400/25 bg-cyan-950/20 p-3 text-sm text-cyan-100">{notice}</div>}
      {raid?.active && <><section className="mt-5 grid gap-4 lg:grid-cols-2"><div className="rounded-3xl border border-cyan-400/15 bg-zinc-950/60 p-4"><div className="text-xs font-bold tracking-widest text-cyan-300">CLASS RAID HP</div><div className="mt-4 grid gap-3 sm:grid-cols-2">{raid.classes.map((c) => <article key={c.classKey} className="rounded-2xl border border-cyan-400/15 bg-cyan-950/10 p-4"><div className="font-semibold">{c.label}</div><div className="mt-3 flex justify-between"><b className="text-2xl">{num(c.currentHP)}</b><span className="text-xs text-zinc-500">/ {num(c.startingHP)} HP</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-900"><div className="h-full bg-cyan-400" style={{width:`${percent(c.currentHP,c.startingHP)}%`}} /></div></article>)}</div></div><div className="rounded-3xl border border-rose-400/15 bg-zinc-950/60 p-4"><div className="text-xs font-bold tracking-widest text-rose-300">BOSS ARENA · {raid.phase}</div><div className="mt-4 space-y-3">{raid.bosses.map((b) => <article key={b.bossKey} className="rounded-2xl border border-zinc-800 bg-black/20 p-4"><div className="flex justify-between gap-3"><div><div className="text-[10px] tracking-widest text-zinc-500">{b.defeated ? "DEFEATED" : b.locked ? "LOCKED" : "ACTIVE TARGET"}</div><div className="mt-1 font-semibold">{b.bossName}</div></div><b>{num(b.currentHP)} / {num(b.maxHP)}</b></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-900"><div className={b.defeated ? "h-full bg-emerald-400" : "h-full bg-rose-500"} style={{width:`${percent(b.currentHP,b.maxHP)}%`}} /></div></article>)}</div></div></section>
      {isTeacher && <section className="mt-5 rounded-3xl border border-amber-400/20 bg-amber-950/10 p-5"><div className="text-xs font-bold tracking-widest text-amber-300">ADMIN ACTION ENTRY</div><div className="mt-4 grid gap-3 md:grid-cols-4"><select value={classKey} onChange={(e)=>setClassKey(e.target.value)} className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2">{raid.classes.map((c)=><option value={c.classKey} key={c.classKey}>{c.label}</option>)}</select><select value={action} onChange={(e)=>setAction(e.target.value as "HEAL"|"STRIKE")} className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2"><option value="STRIKE">Strike</option><option value="HEAL">Heal</option></select>{action === "STRIKE" ? <select value={target} onChange={(e)=>setTarget(e.target.value)} className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2">{targets.map((b)=><option value={b.bossKey} key={b.bossKey}>{b.bossName}</option>)}</select> : <div/>}<input value={amount} onChange={(e)=>setAmount(e.target.value.replace(/\D/g,""))} placeholder={action === "HEAL" ? "Total D4 healing" : "Total D20 damage"} className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2" /></div><button disabled={busy} onClick={()=>void apply()} className="mt-4 rounded-xl border border-amber-300/40 bg-amber-400/15 px-4 py-2 font-bold text-amber-100 disabled:opacity-50">{busy ? "Applying…" : "Apply Action"}</button></section>}</>}
    </main></div>;
}
