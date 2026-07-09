// src/pages/battle/BattleTeacherConsole.tsx

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { collection, onSnapshot, query } from "firebase/firestore";

import AppTopBar from "../../components/AppTopBar";
import { db } from "../../firebase";
import { useBattleControl } from "./hooks/useBattleControl";
import { useBossState } from "./hooks/useBossState";
import { usePageActive } from "./hooks/usePageActive";
import { getBossMeta } from "./battleBossMeta";

const TEACHER_UNLOCK_KEY = "ll:battleTeacherUnlocked";

/*
  First-pass gate.

  This keeps students out casually, but it is not real security yet because
  frontend passcodes can be inspected in browser source.

  Next backend pass:
  - send passcode to Apps Script
  - Apps Script validates it
  - Apps Script returns a short-lived teacher token
  - teacher actions require that token
*/
const TEACHER_PASSCODE = "legends";

const GUILDS = [
  "Scouts",
  "Guardians",
  "Blades",
  "Shadows",
  "Scholars",
  "Diplomats",
];

type GuildActionMap = Record<string, string>;

function getRowSessionKey(row: any) {
  return (
    String(row?.activeBattleSessionId || "").trim() ||
    String(row?.sessionId || "").trim() ||
    String(row?.bossInstanceId || "").trim()
  );
}

function getActionDisplay(actionRaw: string) {
  const action = String(actionRaw || "").toUpperCase();

  if (action === "HEAL") {
    return {
      label: "HEAL",
      icon: "💚",
      className: "border-emerald-400/25 bg-emerald-500/10 text-emerald-200",
    };
  }

  if (action === "ATTACK" || action === "STRIKE") {
    return {
      label: "ATTACK",
      icon: "⚔️",
      className: "border-red-400/25 bg-red-500/10 text-red-200",
    };
  }

  return {
    label: "WAITING",
    icon: "⌛",
    className: "border-zinc-800/70 bg-black/30 text-zinc-500",
  };
}

function pct(current: number, max: number) {
  if (!max) return 0;
  return Math.max(0, Math.min(100, (current / max) * 100));
}

function hpBarClass(percent: number) {
  if (percent <= 20) {
    return "bg-red-500 shadow-[0_0_26px_rgba(239,68,68,0.45)]";
  }

  if (percent <= 60) {
    return "bg-amber-400 shadow-[0_0_22px_rgba(251,191,36,0.35)]";
  }

  return "bg-emerald-400 shadow-[0_0_22px_rgba(74,222,128,0.30)]";
}

function CollapsibleSection({
  title,
  subtitle,
  defaultOpen = false,
  children,
}: {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="rounded-[24px] border border-zinc-800/70 bg-zinc-950/45 shadow-[0_18px_48px_rgba(0,0,0,0.28)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <div>
          <div className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-300/75">
            {title}
          </div>

          {subtitle && (
            <div className="mt-1 text-sm text-zinc-400">{subtitle}</div>
          )}
        </div>

        <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-black text-zinc-200">
          {open ? "Collapse" : "Expand"}
        </div>
      </button>

      {open && <div className="border-t border-zinc-800/70 p-5">{children}</div>}
    </section>
  );
}

function PasscodeGate({ onUnlock }: { onUnlock: () => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  function submit() {
    if (value.trim() === TEACHER_PASSCODE) {
      localStorage.setItem(TEACHER_UNLOCK_KEY, "1");
      setError("");
      onUnlock();
      return;
    }

    setError("Incorrect passcode.");
  }

  return (
    <div className="min-h-[100dvh] bg-[#05070d] text-zinc-100">
      <AppTopBar
        title="Battle Teacher Console"
        activeView="battle"
        onNavigate={(next) => {
          if (next === "battle") {
            window.location.href = "/battle";
            return;
          }

          if (next === "dashboard") {
            window.location.href = "/";
            return;
          }

          const routes: Record<string, string> = {
            store: "/store",
            cards: "/cards",
            battle: "/battle",
          };

          window.location.href = routes[next] || "/";
        }}
      />

      <main className="mx-auto flex min-h-[calc(100dvh-84px)] w-full max-w-[720px] items-center px-4 py-8">
        <section className="w-full overflow-hidden rounded-[30px] border border-cyan-300/20 bg-[radial-gradient(circle_at_85%_15%,rgba(34,211,238,0.16),transparent_32%),linear-gradient(135deg,rgba(8,23,34,0.92),rgba(8,10,18,0.98))] p-7 shadow-[0_24px_70px_rgba(0,0,0,0.45)]">
          <div className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-200/80">
            Teacher Access
          </div>

          <h1 className="mt-3 text-4xl font-black tracking-[-0.05em] text-white">
            Battle Console
          </h1>

          <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-300">
            Enter the teacher passcode to manage regular battles without using
            the spreadsheet directly.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <input
              value={value}
              onChange={(event) => {
                setValue(event.target.value);
                setError("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") submit();
              }}
              type="password"
              autoFocus
              placeholder="Passcode"
              className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-base font-semibold text-white outline-none placeholder:text-zinc-600 focus:border-cyan-300/50"
            />

            <button
              type="button"
              onClick={submit}
              className="rounded-2xl border border-cyan-200/35 bg-cyan-400/15 px-6 py-3 text-sm font-black text-cyan-50 transition hover:border-cyan-100/70 hover:bg-cyan-400/20"
            >
              Unlock Console
            </button>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-400/25 bg-red-950/30 px-4 py-3 text-sm font-bold text-red-100">
              {error}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default function BattleTeacherConsole() {
  const pageActive = usePageActive();
  const { battleRows } = useBattleControl(pageActive, true);

  const [unlocked, setUnlocked] = useState(() => {
    return localStorage.getItem(TEACHER_UNLOCK_KEY) === "1";
  });

  const [selectedSessionKey, setSelectedSessionKey] = useState("");
  const [guildActionsMap, setGuildActionsMap] = useState<GuildActionMap>({});

  const activeRows = useMemo(() => {
    return battleRows.filter(
      (row: any) => String(row.status || "").toUpperCase() === "ACTIVE"
    );
  }, [battleRows]);

  const battleOptions = useMemo(() => {
    const bySession = new Map<string, any[]>();

    for (const row of activeRows) {
      const key = getRowSessionKey(row);
      if (!key) continue;

      if (!bySession.has(key)) {
        bySession.set(key, []);
      }

      bySession.get(key)!.push(row);
    }

    return Array.from(bySession.entries()).map(([sessionKey, rows]) => {
      const leader =
        rows.find((row: any) => {
          const leaderHomeroom = String(row.leaderHomeroom || "").trim();
          const homeroom = String(row.homeroom || "").trim();

          return !leaderHomeroom || leaderHomeroom === homeroom;
        }) || rows[0];

      const homerooms = Array.from(
        new Set(
          rows
            .map((row: any) => String(row.homeroom || "").trim())
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b, "en", { numeric: true }));

      return {
        sessionKey,
        leader,
        rows,
        homerooms,
        label: homerooms.join(" + "),
      };
    });
  }, [activeRows]);

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

  useEffect(() => {
    if (!selectedSessionKey || !primaryBattle?.round) {
      setGuildActionsMap({});
      return;
    }

    const currentRound = Number(primaryBattle.round);
    const q = query(collection(db, "guildActions"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const next: GuildActionMap = {};

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();

        if (String(data.sessionId || "") !== String(selectedSessionKey)) {
          return;
        }

        if (Number(data.round) !== currentRound) {
          return;
        }

        const homeroom = String(data.homeroom || "").trim();
        const guild = String(data.guild || "").trim();
        const action = String(data.action || "").trim().toUpperCase();

        if (!homeroom || !guild || !action) {
          return;
        }

        next[`${homeroom}_${guild}`] = action;
      });

      setGuildActionsMap(next);
    });

    return () => unsubscribe();
  }, [selectedSessionKey, primaryBattle?.round]);

  const bossKey = primaryBattle?.bossKey || "";
  const bossInstanceId = primaryBattle?.bossInstanceId || "";
  const { boss, bossErr } = useBossState(pageActive, bossKey, bossInstanceId);

  const meta = getBossMeta(boss?.bossKey || boss?.bossName || bossKey || "");

  const currentHP = Math.max(0, Number(boss?.currentHP || 0));
  const maxHP = Math.max(1, Number(boss?.maxHP || 1));
  const bossPct = pct(currentHP, maxHP);

  const totalGuildSlots =
    (selectedOption?.homerooms?.length || 0) * GUILDS.length;

  const submittedCount = selectedOption
    ? selectedOption.homerooms.reduce((sum: number, hr: string) => {
        return (
          sum +
          GUILDS.filter((guild) => {
            const action = guildActionsMap[`${hr}_${guild}`];
            return (
              action === "HEAL" || action === "ATTACK" || action === "STRIKE"
            );
          }).length
        );
      }, 0)
    : 0;

  if (!unlocked) {
    return <PasscodeGate onUnlock={() => setUnlocked(true)} />;
  }

  return (
    <div className="min-h-[100dvh] bg-[#05070d] text-zinc-100">
      <AppTopBar
        title="Battle · Teacher Console"
        activeView="battle"
        onNavigate={(next) => {
          if (next === "battle") {
            window.location.href = "/battle";
            return;
          }

          if (next === "dashboard") {
            window.location.href = "/";
            return;
          }

          const routes: Record<string, string> = {
            store: "/store",
            cards: "/cards",
            battle: "/battle",
          };

          window.location.href = routes[next] || "/";
        }}
      />

      <main className="mx-auto w-full max-w-[1500px] px-4 py-5">
        <section className="relative overflow-hidden rounded-[30px] border border-cyan-300/20 bg-[radial-gradient(circle_at_86%_15%,rgba(34,211,238,0.16),transparent_30%),linear-gradient(135deg,rgba(8,28,38,0.88),rgba(10,10,16,0.98))] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.38)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-200/80">
                Regular Battle Control
              </div>

              <h1 className="mt-2 text-4xl font-black tracking-[-0.05em] text-white">
                Teacher Battle Console
              </h1>

              <p className="mt-1 text-sm text-zinc-300">
                Manage live regular battles without touching the spreadsheet.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <a
                href="/battle"
                className="rounded-xl border border-white/15 bg-white/[0.05] px-4 py-2 text-sm font-bold text-white transition hover:border-white/30 hover:bg-white/[0.1]"
              >
                Open Student Battle
              </a>

              <a
                href="/bossdisplay"
                className="rounded-xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 text-sm font-bold text-cyan-100 transition hover:border-cyan-200/50 hover:bg-cyan-400/15"
              >
                Open Boss Display
              </a>

              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem(TEACHER_UNLOCK_KEY);
                  setUnlocked(false);
                }}
                className="rounded-xl border border-zinc-700 bg-black/30 px-4 py-2 text-sm font-bold text-zinc-300 transition hover:border-zinc-500"
              >
                Lock
              </button>
            </div>
          </div>
        </section>

        <div className="mt-5 grid gap-4 xl:grid-cols-[0.78fr_1.22fr]">
          <div className="space-y-4">
            <CollapsibleSection
              title="Battle Setup"
              subtitle={
                primaryBattle
                  ? `${selectedOption?.label || "Active battle"} · setup minimized`
                  : "Start/setup controls will live here next."
              }
              defaultOpen={!primaryBattle}
            >
              <div className="rounded-2xl border border-amber-300/20 bg-amber-950/15 p-4">
                <div className="text-sm font-black text-amber-100">
                  Setup panel placeholder
                </div>

                <p className="mt-2 text-sm leading-6 text-zinc-300">
                  This is where the safe setup controls go next: choose quest,
                  choose class/double class, confirm guilds, and start battle.
                  The page structure is now ready; the next step is adding Apps
                  Script actions so these buttons update Battle_Control safely.
                </p>
              </div>
            </CollapsibleSection>

            <section className="rounded-[24px] border border-zinc-800/70 bg-zinc-950/45 p-5 shadow-[0_18px_48px_rgba(0,0,0,0.28)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-300/75">
                    Live Battle Control
                  </div>

                  <h2 className="mt-1 text-2xl font-black tracking-[-0.04em] text-white">
                    Current Battle
                  </h2>
                </div>

                <div
                  className={[
                    "rounded-full border px-3 py-1 text-xs font-black",
                    primaryBattle
                      ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-200"
                      : "border-zinc-700 bg-black/30 text-zinc-400",
                  ].join(" ")}
                >
                  {primaryBattle ? "ACTIVE" : "NO ACTIVE BATTLE"}
                </div>
              </div>

              {battleOptions.length > 1 && (
                <div className="mt-4">
                  <div className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                    Select Battle
                  </div>

                  <select
                    value={selectedSessionKey}
                    onChange={(event) => setSelectedSessionKey(event.target.value)}
                    className="w-full rounded-xl border border-zinc-800/70 bg-black/45 px-3 py-3 text-sm font-bold text-zinc-100 outline-none focus:border-cyan-300/50"
                  >
                    {battleOptions.map((option) => (
                      <option key={option.sessionKey} value={option.sessionKey}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {!primaryBattle ? (
                <div className="mt-5 rounded-2xl border border-zinc-800/70 bg-black/25 p-5 text-sm text-zinc-400">
                  No active regular battle found in Battle_Control.
                </div>
              ) : (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-zinc-800/70 bg-black/25 p-4">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                      Class
                    </div>
                    <div className="mt-1 text-xl font-black text-white">
                      {selectedOption?.label || primaryBattle.homeroom}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-zinc-800/70 bg-black/25 p-4">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                      Round
                    </div>
                    <div className="mt-1 text-xl font-black text-white">
                      {primaryBattle.round || 1}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-zinc-800/70 bg-black/25 p-4">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                      Turn
                    </div>
                    <div className="mt-1 text-xl font-black text-cyan-100">
                      {String(primaryBattle.turn || "BOSS").toUpperCase()}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-zinc-800/70 bg-black/25 p-4">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                      Guild Attacks
                    </div>
                    <div className="mt-1 text-xl font-black text-emerald-100">
                      {String(primaryBattle.guildAttacks || "CLOSED").toUpperCase()}
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-5 grid gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  disabled
                  className="rounded-xl border border-zinc-800 bg-black/30 px-4 py-3 text-sm font-black text-zinc-500 opacity-70"
                >
                  Advance Round
                </button>

                <button
                  type="button"
                  disabled
                  className="rounded-xl border border-zinc-800 bg-black/30 px-4 py-3 text-sm font-black text-zinc-500 opacity-70"
                >
                  Pause Battle
                </button>

                <button
                  type="button"
                  disabled
                  className="rounded-xl border border-zinc-800 bg-black/30 px-4 py-3 text-sm font-black text-zinc-500 opacity-70"
                >
                  End Battle
                </button>
              </div>

              <div className="mt-3 text-xs leading-5 text-zinc-500">
                These buttons are intentionally disabled until we add server-side
                Apps Script actions. The console is reading live state first.
              </div>
            </section>

            <CollapsibleSection
              title="Emergency Tools"
              subtitle="Manual corrections and reset tools will live here."
              defaultOpen={false}
            >
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  "Force Advance Round",
                  "Clear Round",
                  "Unlock Round",
                  "Sync Battle",
                  "Edit Boss HP",
                  "Edit Guild HP",
                ].map((label) => (
                  <button
                    key={label}
                    type="button"
                    disabled
                    className="rounded-xl border border-zinc-800 bg-black/30 px-4 py-3 text-sm font-black text-zinc-500 opacity-70"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </CollapsibleSection>
          </div>

          <div className="space-y-4">
            <section className="rounded-[24px] border border-rose-300/15 bg-[linear-gradient(145deg,rgba(36,8,18,0.70),rgba(9,10,18,0.98))] p-5 shadow-[0_18px_48px_rgba(0,0,0,0.28)]">
              <div className="flex items-start gap-4">
                {meta?.logo ? (
                  <img
                    src={meta.logo}
                    alt=""
                    draggable={false}
                    className="h-16 w-16 shrink-0 object-contain drop-shadow-[0_10px_24px_rgba(0,0,0,0.45)]"
                  />
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-zinc-700 bg-black/30 text-2xl font-black text-zinc-500">
                    B
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-black uppercase tracking-[0.22em] text-rose-200/75">
                    Boss Status
                  </div>

                  <h2 className="mt-1 truncate text-3xl font-black tracking-[-0.05em] text-white">
                    {boss?.bossName || primaryBattle?.quest || "No Boss Loaded"}
                  </h2>

                  {bossErr && (
                    <div className="mt-2 text-sm font-bold text-red-200">
                      {bossErr}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-white/10 bg-black/25 p-4">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                      HP
                    </div>

                    <div className="mt-1 text-4xl font-black text-white">
                      {Math.round(currentHP)}
                      <span className="text-zinc-500">/{Math.round(maxHP)}</span>
                    </div>
                  </div>

                  <div className="text-2xl font-black text-rose-100">
                    {Math.round(bossPct)}%
                  </div>
                </div>

                <div className="mt-4 overflow-hidden rounded-full border border-zinc-700 bg-black/45 p-1">
                  <div
                    className={[
                      "h-5 rounded-full transition-all duration-700",
                      hpBarClass(bossPct),
                    ].join(" ")}
                    style={{ width: `${bossPct}%` }}
                  />
                </div>
              </div>
            </section>

            <section className="rounded-[24px] border border-cyan-300/15 bg-[linear-gradient(145deg,rgba(8,28,38,0.66),rgba(9,10,18,0.98))] p-5 shadow-[0_18px_48px_rgba(0,0,0,0.28)]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-300/75">
                    Guild Submission Status
                  </div>

                  <h2 className="mt-1 text-2xl font-black tracking-[-0.04em] text-white">
                    Waiting Room
                  </h2>
                </div>

                <div className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-sm font-black text-cyan-100">
                  {submittedCount} / {totalGuildSlots || 0} submitted
                </div>
              </div>

              {!selectedOption ? (
                <div className="mt-5 rounded-2xl border border-zinc-800/70 bg-black/25 p-5 text-sm text-zinc-400">
                  No active battle selected.
                </div>
              ) : (
                <div
                  className={[
                    "mt-5 grid gap-4",
                    selectedOption.homerooms.length > 1
                      ? "lg:grid-cols-2"
                      : "lg:grid-cols-1",
                  ].join(" ")}
                >
                  {selectedOption.homerooms.map((hr: string) => (
                    <div
                      key={hr}
                      className="rounded-2xl border border-zinc-800/70 bg-black/25 p-4"
                    >
                      <div className="mb-3 text-center text-lg font-black text-cyan-200">
                        {hr}
                      </div>

                      <div className="grid gap-2">
                        {GUILDS.map((guild) => {
                          const action =
                            guildActionsMap[`${hr}_${guild}`] || "WAITING";
                          const display = getActionDisplay(action);

                          return (
                            <div
                              key={`${hr}-${guild}`}
                              className={[
                                "flex items-center justify-between gap-3 rounded-xl border px-3 py-2",
                                display.className,
                              ].join(" ")}
                            >
                              <div className="min-w-0">
                                <div className="truncate text-sm font-black text-white">
                                  {guild}
                                </div>
                              </div>

                              <div className="shrink-0 text-xs font-black uppercase tracking-[0.12em]">
                                {display.icon} {display.label}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
