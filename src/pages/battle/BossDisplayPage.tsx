import { useMemo } from "react";
import { useBattleControl } from "./hooks/useBattleControl";
import { useBossState } from "./hooks/useBossState";
import { usePageActive } from "./hooks/usePageActive";
import { getBossMeta } from "./battleBossMeta";

export default function BossDisplayPage() {
  const pageActive = usePageActive();

  const { battleRows } = useBattleControl(pageActive, true);

  const activeRows = useMemo(() => {
    return battleRows.filter(
      (r) =>
        String(r.status || "").toUpperCase() === "ACTIVE" &&
        r.bossInstanceId
    );
  }, [battleRows]);

  const primaryBattle = activeRows[0] || null;

  const bossKey = primaryBattle?.bossKey || "";
  const bossInstanceId = primaryBattle?.bossInstanceId || "";

  const { boss } = useBossState(
    pageActive,
    bossKey,
    bossInstanceId
  );

  const meta = getBossMeta(
    boss?.bossKey || boss?.bossName || bossKey || ""
  );

  const currentHP = Math.max(0, boss?.currentHP || 0);
  const maxHP = Math.max(1, boss?.maxHP || 1);

  const pct = Math.max(
    0,
    Math.min(100, (currentHP / maxHP) * 100)
  );

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <div className="mx-auto flex min-h-screen max-w-[900px] flex-col px-6 py-8">
        {!primaryBattle || !boss ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="rounded-3xl border border-white/10 bg-black/30 px-10 py-8 text-center backdrop-blur">
              <div className="text-2xl font-semibold text-white/90">
                No Active Boss Battle
              </div>

              <div className="mt-2 text-sm text-white/50">
                Waiting for Battle_Control activation...
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start gap-6">
              {meta?.logo ? (
                <img
                  src={meta.logo}
                  alt={boss.bossName}
                  className="h-32 w-32 rounded-3xl border border-white/10 bg-black/30 object-cover shadow-2xl"
                  draggable={false}
                />
              ) : (
                <div className="flex h-32 w-32 items-center justify-center rounded-3xl border border-white/10 bg-black/30 text-4xl font-black text-white/30 shadow-2xl">
                  B
                </div>
              )}

              <div className="min-w-0 flex-1 pt-2">
                <div className="text-sm uppercase tracking-[0.45em] text-amber-300/90">
                  {meta?.questName || "Active Encounter"}
                </div>

                <div className="mt-3 text-6xl font-black leading-none text-white drop-shadow-[0_0_18px_rgba(255,255,255,0.12)]">
                  {boss.bossName}
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <div className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-5 py-2 text-lg font-semibold text-emerald-200">
                    Boss Active
                  </div>

                  <div
                    className={[
                      "rounded-full border px-5 py-2 text-lg font-semibold",
                      String(
                        primaryBattle.guildAttacks || ""
                      ).toUpperCase() === "OPEN"
                        ? "border-cyan-400/30 bg-cyan-500/10 text-cyan-200"
                        : "border-red-400/30 bg-red-500/10 text-red-200",
                    ].join(" ")}
                  >
                    Guild Attacks:{" "}
                    {String(
                      primaryBattle.guildAttacks || "CLOSED"
                    ).toUpperCase()}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-12 rounded-[36px] border border-white/10 bg-black/25 p-8 shadow-[0_0_80px_rgba(34,211,238,0.08)] backdrop-blur">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <div className="text-lg uppercase tracking-[0.35em] text-white/40">
                    Boss Health
                  </div>

                  <div className="mt-4 text-8xl font-black leading-none tabular-nums text-white">
                    {currentHP}

                    <span className="ml-3 text-4xl text-white/40">
                      / {maxHP}
                    </span>
                  </div>
                </div>

                <div className="pb-2 text-right">
                  <div className="text-sm uppercase tracking-[0.25em] text-white/35">
                    Remaining
                  </div>

                  <div className="mt-2 text-4xl font-black text-emerald-300">
                    {Math.round(pct)}%
                  </div>
                </div>
              </div>

              <div className="mt-8 overflow-hidden rounded-full border border-white/10 bg-white/5 p-2">
                <div
                  className="h-14 rounded-full bg-gradient-to-r from-emerald-400 via-lime-300 to-emerald-400 shadow-[0_0_35px_rgba(74,222,128,0.45)] transition-all duration-700"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            <div className="mt-10 grid grid-cols-3 gap-5">
              <div className="rounded-3xl border border-white/10 bg-black/20 p-6">
                <div className="text-sm uppercase tracking-[0.25em] text-white/40">
                  Homeroom
                </div>

                <div className="mt-3 text-3xl font-black text-white">
                  {primaryBattle.homeroom}
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-black/20 p-6">
                <div className="text-sm uppercase tracking-[0.25em] text-white/40">
                  Round
                </div>

                <div className="mt-3 text-3xl font-black text-white">
                  {primaryBattle.round || 1}
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-black/20 p-6">
                <div className="text-sm uppercase tracking-[0.25em] text-white/40">
                  Turn
                </div>

                <div className="mt-3 text-3xl font-black text-white">
                  {primaryBattle.turn || "BOSS"}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}