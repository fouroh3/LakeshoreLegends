import { useEffect, useMemo, useState } from "react";
import logoUrl from "../../assets/Lakeshore Legends Logo.png";
import { useBattleControl } from "./hooks/useBattleControl";
import { useBossState } from "./hooks/useBossState";
import { usePageActive } from "./hooks/usePageActive";
import { getBossMeta } from "./battleBossMeta";

function hpBarClass(pct: number, defeated: boolean) {
  if (defeated) return "bg-[#ef4444] shadow-[0_0_28px_rgba(239,68,68,0.55)]";
  if (pct <= 20) return "bg-[#ef4444] shadow-[0_0_30px_rgba(239,68,68,0.55)]";
  if (pct <= 60) return "bg-[#eab308] shadow-[0_0_26px_rgba(234,179,8,0.42)]";
  return "bg-[#4ade80] shadow-[0_0_26px_rgba(74,222,128,0.38)]";
}

function cardGlowClass(pct: number, defeated: boolean) {
  if (defeated || pct <= 20) {
    return "shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_24px_70px_rgba(0,0,0,0.48),0_0_42px_rgba(239,68,68,0.13)]";
  }

  if (pct <= 60) {
    return "shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_24px_70px_rgba(0,0,0,0.48),0_0_42px_rgba(234,179,8,0.11)]";
  }

  return "shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_24px_70px_rgba(0,0,0,0.48),0_0_42px_rgba(34,211,238,0.08)]";
}

function ambientClass(pct: number, defeated: boolean) {
  if (defeated || pct <= 20) return "bg-red-500/[0.055]";
  if (pct <= 60) return "bg-amber-500/[0.05]";
  return "bg-cyan-500/[0.045]";
}

export default function BossDisplayPage() {
  const pageActive = usePageActive();
  const { battleRows } = useBattleControl(pageActive, true);

  const activeRows = useMemo(() => {
    return battleRows.filter(
      (r: any) =>
        String(r.status || "").toUpperCase() === "ACTIVE" &&
        r.bossInstanceId
    );
  }, [battleRows]);

  const battleOptions = useMemo(() => {
    const bySession = new Map<string, any[]>();

    for (const row of activeRows) {
      const key =
        String((row as any).activeBattleSessionId || "").trim() ||
        String(row.sessionId || "").trim() ||
        String(row.bossInstanceId || "").trim();

      if (!key) continue;

      if (!bySession.has(key)) {
        bySession.set(key, []);
      }

      bySession.get(key)!.push(row);
    }

    return Array.from(bySession.entries()).map(([sessionKey, rows]) => {
      const leader =
        rows.find((r: any) => {
          const leaderHomeroom = String(r.leaderHomeroom || "").trim();
          return !leaderHomeroom || leaderHomeroom === r.homeroom;
        }) || rows[0];

      const homerooms = rows
        .map((r: any) => String(r.homeroom || "").trim())
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, "en", { numeric: true }));

      return {
        sessionKey,
        leader,
        homerooms,
        label: homerooms.join(" + "),
      };
    });
  }, [activeRows]);

  const [selectedSessionKey, setSelectedSessionKey] = useState("");

  useEffect(() => {
    if (!battleOptions.length) {
      setSelectedSessionKey("");
      return;
    }

    const exists = battleOptions.some(
      (option) => option.sessionKey === selectedSessionKey
    );

    if (!selectedSessionKey || !exists) {
      setSelectedSessionKey(battleOptions[0].sessionKey);
    }
  }, [battleOptions, selectedSessionKey]);

  const selectedOption =
    battleOptions.find((option) => option.sessionKey === selectedSessionKey) ||
    battleOptions[0] ||
    null;

  const primaryBattle = selectedOption?.leader || null;

  const bossKey = primaryBattle?.bossKey || "";
  const bossInstanceId = primaryBattle?.bossInstanceId || "";

  const { boss } = useBossState(pageActive, bossKey, bossInstanceId);

  const meta = getBossMeta(boss?.bossKey || boss?.bossName || bossKey || "");

  const currentHP = Math.max(0, boss?.currentHP || 0);
  const maxHP = Math.max(1, boss?.maxHP || 1);
  const pct = Math.max(0, Math.min(100, (currentHP / maxHP) * 100));
  const defeated = currentHP <= 0;
  const critical = !defeated && pct <= 20;

  const homeroomLabel = selectedOption?.homerooms?.length
    ? selectedOption.homerooms.join(" + ")
    : primaryBattle?.homeroom || "—";

  const turnLabel = String(primaryBattle?.turn || "BOSS").toUpperCase();

  return (
    <div className="min-h-screen bg-[#05070d] text-zinc-100">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className={[
            "absolute left-1/2 top-[110px] h-[340px] w-[560px] -translate-x-1/2 rounded-full blur-3xl",
            ambientClass(pct, defeated),
          ].join(" ")}
        />
        <div className="absolute right-[-140px] top-[260px] h-[360px] w-[360px] rounded-full bg-amber-500/[0.04] blur-3xl" />
      </div>

      <div className="relative z-[1] flex min-h-screen flex-col">
        <header className="border-b border-zinc-900/80 bg-black/55 px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-3">
            <img
              src={logoUrl}
              alt="Lakeshore Legends"
              className="h-8 w-auto"
              draggable={false}
            />

            <div>
              <div className="text-[13px] font-semibold text-zinc-100">
                Boss Display
              </div>

              <div className="text-[10px] text-zinc-500">
                SmartBoard battle view
              </div>
            </div>

            <div className="flex-1" />
          </div>
        </header>

        <main className="flex flex-1 flex-col px-4 py-4">
          <div className="mx-auto flex w-full max-w-[760px] flex-col gap-4">
            {battleOptions.length > 1 && (
              <div className="rounded-[24px] border border-zinc-800/70 bg-zinc-950/35 p-3">
                <div className="mb-2 text-[9px] uppercase tracking-[0.28em] text-zinc-500">
                  Display Battle
                </div>

                <select
                  value={selectedSessionKey}
                  onChange={(e) => setSelectedSessionKey(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-800/70 bg-black/50 px-4 py-3 text-sm font-semibold text-zinc-100 outline-none focus:border-cyan-300/50"
                >
                  {battleOptions.map((option) => (
                    <option key={option.sessionKey} value={option.sessionKey}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {!boss || !primaryBattle ? (
              <div className="rounded-[28px] border border-zinc-800/70 bg-zinc-950/40 p-10 text-center">
                <div className="text-2xl font-black text-zinc-100">
                  No Active Boss Battle
                </div>

                <div className="mt-2 text-sm text-zinc-500">
                  Waiting for Battle_Control activation...
                </div>
              </div>
            ) : (
              <div
                className={[
                  "overflow-hidden rounded-[32px] border border-zinc-800/70 bg-zinc-950/45",
                  cardGlowClass(pct, defeated),
                ].join(" ")}
              >
                <div className="bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.20),transparent_55%)] px-5 py-6">
                  <div className="flex items-start gap-4">
                    {meta?.logo ? (
                      <img
                        src={meta.logo}
                        alt={boss.bossName}
                        className="h-20 w-20 shrink-0 object-cover drop-shadow-[0_14px_34px_rgba(0,0,0,0.45)]"
                        draggable={false}
                      />
                    ) : (
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[24px] border border-zinc-700/70 bg-black/30 text-3xl font-black text-zinc-500">
                        B
                      </div>
                    )}

                    <div className="min-w-0 flex-1 pt-1">
                      <div className="truncate text-[11px] uppercase tracking-[0.34em] text-amber-300/90">
                        {meta?.questName || "Active Encounter"}
                      </div>

                      <div className="mt-2 truncate pb-2 text-[38px] font-black leading-[1.02] text-zinc-100">
                        {boss.bossName}
                      </div>

                      {(critical || defeated) && (
                        <div
                          className={[
                            "mt-2 inline-flex rounded-full border px-4 py-2 text-sm font-black uppercase tracking-[0.16em]",
                            defeated
                              ? "border-red-400/35 bg-red-500/15 text-red-200"
                              : "border-red-400/30 bg-red-500/10 text-red-200 animate-pulse",
                          ].join(" ")}
                        >
                          {defeated ? "Defeated" : "Critical HP"}
                        </div>
                      )}

                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <div className="rounded-2xl border border-zinc-700/70 bg-black/25 px-3 py-2">
                          <div className="text-[8px] uppercase tracking-[0.24em] text-zinc-500">
                            Homeroom
                          </div>
                          <div className="mt-1 truncate text-[15px] font-black text-zinc-100">
                            {homeroomLabel}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-zinc-700/70 bg-black/25 px-3 py-2">
                          <div className="text-[8px] uppercase tracking-[0.24em] text-zinc-500">
                            Round
                          </div>
                          <div className="mt-1 text-[15px] font-black text-zinc-100">
                            {primaryBattle.round || 1}
                          </div>
                        </div>

                        <div
                          className={[
                            "rounded-2xl border px-3 py-2",
                            turnLabel === "GUILD"
                              ? "border-cyan-400/25 bg-cyan-500/10"
                              : "border-amber-400/25 bg-amber-500/10",
                          ].join(" ")}
                        >
                          <div className="text-[8px] uppercase tracking-[0.24em] text-zinc-500">
                            Turn
                          </div>
                          <div
                            className={[
                              "mt-1 text-[15px] font-black",
                              turnLabel === "GUILD"
                                ? "text-cyan-200"
                                : "text-amber-200",
                            ].join(" ")}
                          >
                            {turnLabel}
                          </div>
                        </div>

                        <div
                          className={[
                            "rounded-2xl border px-3 py-2",
                            String(primaryBattle.guildAttacks || "").toUpperCase() ===
                            "OPEN"
                              ? "border-emerald-400/25 bg-emerald-500/10"
                              : "border-red-400/25 bg-red-500/10",
                          ].join(" ")}
                        >
                          <div className="text-[8px] uppercase tracking-[0.24em] text-zinc-500">
                            Guild Attacks
                          </div>
                          <div
                            className={[
                              "mt-1 text-[15px] font-black",
                              String(primaryBattle.guildAttacks || "").toUpperCase() ===
                              "OPEN"
                                ? "text-emerald-200"
                                : "text-red-200",
                            ].join(" ")}
                          >
                            {String(
                              primaryBattle.guildAttacks || "CLOSED"
                            ).toUpperCase()}
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 rounded-[24px] border border-zinc-700/60 bg-black/25 p-4">
                        <div className="mb-3 text-center text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">
                          Guild Actions
                        </div>

                        <div
                          className={[
                            "grid gap-3",
                            selectedOption?.homerooms?.length > 1
                              ? "grid-cols-2"
                              : "grid-cols-1",
                          ].join(" ")}
                        >
                          {selectedOption?.homerooms?.map((hr: string) => {
                            const classRows = activeRows.filter((r: any) => {
                              const rowSessionKey =
                                String(
                                  (r as any).activeBattleSessionId || ""
                                ).trim() ||
                                String(r.sessionId || "").trim() ||
                                String(r.bossInstanceId || "").trim();

                              return (
                                String(r.homeroom || "").trim() === hr &&
                                rowSessionKey === selectedSessionKey
                              );
                            });

                            return (
                              <div
                                key={hr}
                                className="rounded-2xl border border-zinc-800/70 bg-zinc-950/50 p-3"
                              >
                                <div className="mb-3 text-center text-[13px] font-black text-cyan-300">
                                  {hr}
                                </div>

                                <div className="space-y-2">
                                  {classRows.map((row: any) => {
                                    const guild = String(row.guild || "Guild");

                                    const action = String(
                                      row.guildAction || ""
                                    ).toUpperCase();

                                    const completed =
                                      action === "ATTACK" || action === "HEAL";

                                    return (
                                      <div
                                        key={`${hr}-${guild}`}
                                        className="flex items-center justify-between rounded-xl border border-zinc-800/70 bg-black/30 px-3 py-2"
                                      >
                                        <div className="truncate text-sm font-bold text-zinc-100">
                                          {guild}
                                        </div>

                                        <div
                                          className={[
                                            "text-xs font-black uppercase tracking-[0.12em]",
                                            completed
                                              ? action === "HEAL"
                                                ? "text-emerald-300"
                                                : "text-red-300"
                                              : "text-zinc-500",
                                          ].join(" ")}
                                        >
                                          {completed
                                            ? action === "HEAL"
                                              ? "💚 Heal"
                                              : "⚔️ Attack"
                                            : "⏳ Waiting"}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {defeated && (
                    <div className="mt-5 rounded-[24px] border border-red-500/25 bg-red-950/30 px-5 py-5 text-center shadow-[0_0_32px_rgba(239,68,68,0.18)]">
                      <div className="text-[10px] uppercase tracking-[0.32em] text-red-300/70">
                        Encounter Status
                      </div>

                      <div className="mt-2 text-5xl font-black tracking-wide text-red-200">
                        BOSS DEFEATED
                      </div>
                    </div>
                  )}

                  <div className="mt-8">
                    <div className="mb-3 flex items-end justify-between gap-3">
                      <div className="text-[16px] font-medium text-zinc-300">
                        Boss HP
                      </div>

                      <div className="tabular-nums text-[22px] font-black text-zinc-100">
                        {Math.round(currentHP)}
                        <span className="text-zinc-500">
                          /{Math.round(maxHP)}
                        </span>
                      </div>
                    </div>

                    <div className="relative overflow-hidden rounded-full border border-zinc-700/70 bg-black/35 p-1.5">
                      <div
                        className={[
                          "relative h-7 overflow-hidden rounded-full transition-all duration-700",
                          hpBarClass(pct, defeated),
                        ].join(" ")}
                        style={{ width: `${pct}%` }}
                      >
                        <div className="absolute inset-0 bg-[linear-gradient(110deg,transparent_0%,rgba(255,255,255,0.18)_42%,transparent_70%)] opacity-60" />
                      </div>
                    </div>

                    <div className="mt-3 flex justify-between text-[10px] uppercase tracking-[0.22em] text-zinc-600">
                      <span>0</span>
                      <span>{Math.round(pct)}% remaining</span>
                      <span>{Math.round(maxHP)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}