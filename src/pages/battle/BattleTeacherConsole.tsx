// src/pages/battle/BattleTeacherConsole.tsx

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { collection, onSnapshot, query } from "firebase/firestore";

import AppTopBar from "../../components/AppTopBar";
import { db } from "../../firebase";
import { getBossMeta } from "./battleBossMeta";
import {
  advanceRegularBattle,
  clearBattleTeacherToken,
  endRegularBattle,
  loginBattleTeacher,
  pauseRegularBattle,
  resumeRegularBattle,
  setRegularBattleTurn,
  syncRegularBattle,
} from "./battleTeacherApi";
import { useBattleControl } from "./hooks/useBattleControl";
import { useBossState } from "./hooks/useBossState";
import { usePageActive } from "./hooks/usePageActive";

const TEACHER_UNLOCK_KEY = "ll:battleTeacherUnlocked";

const GUILDS = [
  "Scouts",
  "Guardians",
  "Blades",
  "Shadows",
  "Scholars",
  "Diplomats",
];

type GuildActionMap = Record<string, string>;
type Notice = { type: "ok" | "err"; msg: string } | null;

function getRowSessionKey(row: any) {
  return (
    String(row?.activeBattleSessionId || "").trim() ||
    String(row?.sessionId || "").trim() ||
    String(row?.bossInstanceId || "").trim()
  );
}

function percent(current: number, max: number) {
  if (!max) return 0;
  return Math.max(0, Math.min(100, (current / max) * 100));
}

function hpBarClass(pct: number) {
  if (pct <= 20) {
    return "bg-red-500 shadow-[0_0_22px_rgba(239,68,68,0.45)]";
  }

  if (pct <= 60) {
    return "bg-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.32)]";
  }

  return "bg-emerald-400 shadow-[0_0_18px_rgba(74,222,128,0.28)]";
}

function actionDisplay(actionRaw: string) {
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

function go(next: string) {
  const routes: Record<string, string> = {
    dashboard: "/",
    store: "/store",
    cards: "/cards",
    battle: "/battle",
  };

  window.location.href = routes[next] || "/";
}

function CompactSection({
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
    <section className="rounded-[18px] border border-zinc-800/70 bg-zinc-950/45 shadow-[0_14px_34px_rgba(0,0,0,0.22)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="min-w-0">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300/75">
            {title}
          </div>

          {subtitle ? (
            <div className="mt-0.5 truncate text-xs text-zinc-400">
              {subtitle}
            </div>
          ) : null}
        </div>

        <div className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-black text-zinc-200">
          {open ? "Collapse" : "Expand"}
        </div>
      </button>

      {open ? (
        <div className="border-t border-zinc-800/70 p-4">{children}</div>
      ) : null}
    </section>
  );
}

function PasscodeGate({ onUnlock }: { onUnlock: () => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy) return;

    const passcode = value.trim();
    if (!passcode) {
      setError("Enter the teacher passcode.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      await loginBattleTeacher(passcode);
      localStorage.setItem(TEACHER_UNLOCK_KEY, "1");
      onUnlock();
    } catch (caught: any) {
      setError(caught?.message || "Teacher login failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-[100dvh] bg-[#05070d] text-zinc-100">
      <AppTopBar
        title="Battle Teacher Console"
        activeView="battle"
        onNavigate={go}
      />

      <main className="mx-auto flex min-h-[calc(100dvh-84px)] w-full max-w-[720px] items-center px-4 py-8">
        <section className="w-full overflow-hidden rounded-[28px] border border-cyan-300/20 bg-[radial-gradient(circle_at_85%_15%,rgba(34,211,238,0.16),transparent_32%),linear-gradient(135deg,rgba(8,23,34,0.92),rgba(8,10,18,0.98))] p-7 shadow-[0_24px_70px_rgba(0,0,0,0.45)]">
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
                if (event.key === "Enter") void submit();
              }}
              type="password"
              autoFocus
              placeholder="Passcode"
              className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-base font-semibold text-white outline-none placeholder:text-zinc-600 focus:border-cyan-300/50"
            />

            <button
              type="button"
              disabled={busy}
              onClick={() => void submit()}
              className="rounded-2xl border border-cyan-200/35 bg-cyan-400/15 px-6 py-3 text-sm font-black text-cyan-50 transition hover:border-cyan-100/70 hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Unlocking…" : "Unlock Console"}
            </button>
          </div>

          {error ? (
            <div className="mt-4 rounded-xl border border-red-400/25 bg-red-950/30 px-4 py-3 text-sm font-bold text-red-100">
              {error}
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}

export default function BattleTeacherConsole() {
  const pageActive = usePageActive();
  const { battleRows, refreshOnce } = useBattleControl(pageActive, true);

  const [unlocked, setUnlocked] = useState(
    () => localStorage.getItem(TEACHER_UNLOCK_KEY) === "1"
  );
  const [selectedSessionKey, setSelectedSessionKey] = useState("");
  const [guildActionsMap, setGuildActionsMap] = useState<GuildActionMap>({});
  const [notice, setNotice] = useState<Notice>(null);
  const [busyAction, setBusyAction] = useState("");

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
      if (!bySession.has(key)) bySession.set(key, []);
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

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 4500);
    return () => window.clearTimeout(timer);
  }, [notice]);

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
        if (String(data.sessionId || "") !== String(selectedSessionKey)) return;
        if (Number(data.round) !== currentRound) return;

        const homeroom = String(data.homeroom || "").trim();
        const guild = String(data.guild || "").trim();
        const action = String(data.action || "").trim().toUpperCase();

        if (!homeroom || !guild || !action) return;
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
  const bossPct = percent(currentHP, maxHP);

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

  const completionPct = totalGuildSlots
    ? percent(submittedCount, totalGuildSlots)
    : 0;

  const hasBattle = Boolean(selectedSessionKey && primaryBattle);
  const isActionBusy = Boolean(busyAction);

  async function runTeacherAction(label: string, fn: () => Promise<any>) {
    if (busyAction) return;

    setBusyAction(label);
    setNotice(null);

    try {
      await fn();
      await refreshOnce();
      setNotice({ type: "ok", msg: `${label} complete.` });
    } catch (caught: any) {
      setNotice({ type: "err", msg: caught?.message || `${label} failed.` });
    } finally {
      setBusyAction("");
    }
  }

  if (!unlocked) {
    return <PasscodeGate onUnlock={() => setUnlocked(true)} />;
  }

  return (
    <div className="min-h-[100dvh] bg-[#05070d] text-zinc-100">
      <main className="mx-auto w-full max-w-[1700px] px-3 py-3 sm:px-4">
        <section className="rounded-[22px] border border-cyan-300/20 bg-[radial-gradient(circle_at_90%_20%,rgba(34,211,238,0.13),transparent_25%),linear-gradient(135deg,rgba(8,28,38,0.82),rgba(10,10,16,0.98))] px-4 py-3 shadow-[0_14px_38px_rgba(0,0,0,0.32)]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="text-[10px] font-black uppercase tracking-[0.23em] text-cyan-200/80">
                Regular Battle Control
              </div>

              <h1 className="mt-1 truncate text-3xl font-black tracking-[-0.05em] text-white lg:text-4xl">
                Teacher Battle Console
              </h1>
            </div>

            <div className="flex flex-wrap gap-2">
              <a
                href="/"
                className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-zinc-200 transition hover:border-white/25"
              >
                Dashboard
              </a>

              <a
                href="/battle"
                className="rounded-xl border border-white/15 bg-white/[0.05] px-4 py-2 text-sm font-bold text-white transition hover:border-white/30 hover:bg-white/[0.1]"
              >
                Student Battle
              </a>

              <a
                href="/bossdisplay"
                className="rounded-xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 text-sm font-bold text-cyan-100 transition hover:border-cyan-200/50 hover:bg-cyan-400/15"
              >
                Boss Display
              </a>

              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem(TEACHER_UNLOCK_KEY);
                  clearBattleTeacherToken();
                  setUnlocked(false);
                }}
                className="rounded-xl border border-zinc-700 bg-black/30 px-4 py-2 text-sm font-bold text-zinc-300 transition hover:border-zinc-500"
              >
                Lock
              </button>
            </div>
          </div>
        </section>

        {notice ? (
          <div
            className={[
              "mt-3 rounded-xl border px-4 py-2 text-sm font-bold",
              notice.type === "ok"
                ? "border-emerald-400/25 bg-emerald-950/30 text-emerald-100"
                : "border-red-400/25 bg-red-950/30 text-red-100",
            ].join(" ")}
          >
            {notice.msg}
          </div>
        ) : null}

        <section className="mt-3 grid gap-3 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[18px] border border-rose-300/15 bg-[linear-gradient(145deg,rgba(36,8,18,0.62),rgba(9,10,18,0.98))] p-4 shadow-[0_14px_34px_rgba(0,0,0,0.22)]">
            <div className="flex items-center gap-4">
              {meta?.logo ? (
                <img
                  src={meta.logo}
                  alt=""
                  draggable={false}
                  className="h-14 w-14 shrink-0 object-contain drop-shadow-[0_10px_24px_rgba(0,0,0,0.45)]"
                />
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-zinc-700 bg-black/30 text-xl font-black text-zinc-500">
                  B
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-200/75">
                      Boss Status
                    </div>
                    <div className="mt-0.5 truncate text-2xl font-black tracking-[-0.04em] text-white">
                      {boss?.bossName || primaryBattle?.quest || "No Boss Loaded"}
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <div className="text-3xl font-black text-white tabular-nums">
                      {Math.round(currentHP)}
                      <span className="text-base text-zinc-500">
                        /{Math.round(maxHP)}
                      </span>
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-[0.14em] text-rose-200/70">
                      {Math.round(bossPct)}% HP
                    </div>
                  </div>
                </div>

                <div className="mt-3 overflow-hidden rounded-full border border-zinc-700 bg-black/45 p-1">
                  <div
                    className={[
                      "h-4 rounded-full transition-all duration-700",
                      hpBarClass(bossPct),
                    ].join(" ")}
                    style={{ width: `${bossPct}%` }}
                  />
                </div>

                {bossErr ? (
                  <div className="mt-2 text-xs font-bold text-red-200">
                    {bossErr}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="rounded-[18px] border border-cyan-300/15 bg-[linear-gradient(145deg,rgba(8,28,38,0.62),rgba(9,10,18,0.98))] p-4 shadow-[0_14px_34px_rgba(0,0,0,0.22)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300/75">
                  Submissions
                </div>
                <div className="mt-0.5 text-2xl font-black tracking-[-0.04em] text-white">
                  {submittedCount} / {totalGuildSlots || 0}
                </div>
              </div>

              <div className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-sm font-black text-cyan-100">
                {Math.round(completionPct)}% Ready
              </div>
            </div>

            <div className="mt-3 overflow-hidden rounded-full border border-zinc-700 bg-black/45 p-1">
              <div
                className="h-4 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.30)] transition-all duration-500"
                style={{ width: `${completionPct}%` }}
              />
            </div>
          </div>
        </section>

        <div className="mt-3 grid gap-3 xl:grid-cols-[0.74fr_1.26fr]">
          <div className="space-y-3">
            <CompactSection
              title="Battle Setup"
              subtitle={
                primaryBattle
                  ? `${selectedOption?.label || "Active battle"} · setup minimized`
                  : "Start/setup controls will live here next."
              }
              defaultOpen={!primaryBattle}
            >
              <div className="rounded-2xl border border-amber-300/20 bg-amber-950/15 p-4 text-sm leading-6 text-zinc-300">
                Safe setup controls go here next: choose quest, choose
                class/double class, confirm guilds, and start battle through
                Apps Script instead of direct sheet editing.
              </div>
            </CompactSection>

            <section className="rounded-[18px] border border-zinc-800/70 bg-zinc-950/45 p-4 shadow-[0_14px_34px_rgba(0,0,0,0.22)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300/75">
                    Live Battle Control
                  </div>
                  <div className="mt-0.5 text-xl font-black tracking-[-0.03em] text-white">
                    Current Battle
                  </div>
                </div>

                <div
                  className={[
                    "rounded-full border px-3 py-1 text-[11px] font-black",
                    primaryBattle
                      ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-200"
                      : "border-zinc-700 bg-black/30 text-zinc-400",
                  ].join(" ")}
                >
                  {primaryBattle ? "ACTIVE" : "NO ACTIVE"}
                </div>
              </div>

              {battleOptions.length > 1 ? (
                <div className="mt-3">
                  <div className="mb-1 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">
                    Select Battle
                  </div>
                  <select
                    value={selectedSessionKey}
                    onChange={(event) => setSelectedSessionKey(event.target.value)}
                    className="w-full rounded-xl border border-zinc-800/70 bg-black/45 px-3 py-2 text-sm font-bold text-zinc-100 outline-none focus:border-cyan-300/50"
                  >
                    {battleOptions.map((option) => (
                      <option key={option.sessionKey} value={option.sessionKey}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              {!primaryBattle ? (
                <div className="mt-3 rounded-xl border border-zinc-800/70 bg-black/25 p-4 text-sm text-zinc-400">
                  No active regular battle found in Battle_Control.
                </div>
              ) : (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {[
                    ["Class", selectedOption?.label || primaryBattle.homeroom],
                    ["Round", primaryBattle.round || 1],
                    ["Turn", String(primaryBattle.turn || "BOSS").toUpperCase()],
                    [
                      "Guild Attacks",
                      String(primaryBattle.guildAttacks || "CLOSED").toUpperCase(),
                    ],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-xl border border-zinc-800/70 bg-black/25 p-3"
                    >
                      <div className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-500">
                        {label}
                      </div>
                      <div className="mt-1 truncate text-base font-black text-white">
                        {value}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={!hasBattle || isActionBusy}
                  onClick={() =>
                    void runTeacherAction("Advance Round", () =>
                      advanceRegularBattle({
                        sessionId: selectedSessionKey,
                        turn: "GUILD",
                      })
                    )
                  }
                  className="rounded-xl border border-cyan-300/25 bg-cyan-400/10 px-3 py-2 text-xs font-black text-cyan-100 transition hover:border-cyan-200/60 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:bg-black/30 disabled:text-zinc-500 disabled:opacity-70"
                >
                  {busyAction === "Advance Round" ? "Advancing…" : "Advance Round"}
                </button>

                <button
                  type="button"
                  disabled={!hasBattle || isActionBusy}
                  onClick={() =>
                    void runTeacherAction("Boss Turn", () =>
                      setRegularBattleTurn({
                        sessionId: selectedSessionKey,
                        turn: "BOSS",
                      })
                    )
                  }
                  className="rounded-xl border border-amber-300/25 bg-amber-400/10 px-3 py-2 text-xs font-black text-amber-100 transition hover:border-amber-200/60 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:bg-black/30 disabled:text-zinc-500 disabled:opacity-70"
                >
                  Boss Turn
                </button>

                <button
                  type="button"
                  disabled={!hasBattle || isActionBusy}
                  onClick={() =>
                    void runTeacherAction("Guild Turn", () =>
                      setRegularBattleTurn({
                        sessionId: selectedSessionKey,
                        turn: "GUILD",
                      })
                    )
                  }
                  className="rounded-xl border border-emerald-300/25 bg-emerald-400/10 px-3 py-2 text-xs font-black text-emerald-100 transition hover:border-emerald-200/60 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:bg-black/30 disabled:text-zinc-500 disabled:opacity-70"
                >
                  Guild Turn
                </button>

                <button
                  type="button"
                  disabled={!hasBattle || isActionBusy}
                  onClick={() =>
                    void runTeacherAction("Sync Battle", () => syncRegularBattle())
                  }
                  className="rounded-xl border border-violet-300/25 bg-violet-400/10 px-3 py-2 text-xs font-black text-violet-100 transition hover:border-violet-200/60 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:bg-black/30 disabled:text-zinc-500 disabled:opacity-70"
                >
                  Sync Battle
                </button>
              </div>
            </section>

            <CompactSection
              title="Emergency Tools"
              subtitle="Manual corrections and reset tools."
              defaultOpen={false}
            >
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={!hasBattle || isActionBusy}
                  onClick={() =>
                    void runTeacherAction("Pause Battle", () =>
                      pauseRegularBattle(selectedSessionKey)
                    )
                  }
                  className="rounded-xl border border-amber-300/25 bg-amber-400/10 px-3 py-2 text-xs font-black text-amber-100 transition hover:border-amber-200/60 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:bg-black/30 disabled:text-zinc-500 disabled:opacity-70"
                >
                  Pause Battle
                </button>

                <button
                  type="button"
                  disabled={!hasBattle || isActionBusy}
                  onClick={() =>
                    void runTeacherAction("Resume Battle", () =>
                      resumeRegularBattle(selectedSessionKey)
                    )
                  }
                  className="rounded-xl border border-emerald-300/25 bg-emerald-400/10 px-3 py-2 text-xs font-black text-emerald-100 transition hover:border-emerald-200/60 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:bg-black/30 disabled:text-zinc-500 disabled:opacity-70"
                >
                  Resume Battle
                </button>

                <button
                  type="button"
                  disabled={!hasBattle || isActionBusy}
                  onClick={() => {
                    const ok = window.confirm(
                      "End this battle and clear it from Battle_Control?"
                    );
                    if (!ok) return;
                    void runTeacherAction("End Battle", () =>
                      endRegularBattle(selectedSessionKey)
                    );
                  }}
                  className="rounded-xl border border-red-300/25 bg-red-500/10 px-3 py-2 text-xs font-black text-red-100 transition hover:border-red-200/60 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:bg-black/30 disabled:text-zinc-500 disabled:opacity-70"
                >
                  End Battle
                </button>

                <button
                  type="button"
                  disabled={!hasBattle || isActionBusy}
                  onClick={() =>
                    void runTeacherAction("Force Advance", () =>
                      advanceRegularBattle({
                        sessionId: selectedSessionKey,
                        turn: "GUILD",
                      })
                    )
                  }
                  className="rounded-xl border border-zinc-700 bg-black/30 px-3 py-2 text-xs font-black text-zinc-300 transition hover:border-zinc-500 disabled:cursor-not-allowed disabled:text-zinc-500 disabled:opacity-70"
                >
                  Force Advance
                </button>

                <button
                  type="button"
                  disabled
                  className="rounded-xl border border-zinc-800 bg-black/30 px-3 py-2 text-xs font-black text-zinc-500 opacity-70"
                >
                  Edit Boss HP
                </button>

                <button
                  type="button"
                  disabled
                  className="rounded-xl border border-zinc-800 bg-black/30 px-3 py-2 text-xs font-black text-zinc-500 opacity-70"
                >
                  Edit Guild HP
                </button>
              </div>
            </CompactSection>
          </div>

          <section className="rounded-[18px] border border-cyan-300/15 bg-[linear-gradient(145deg,rgba(8,28,38,0.58),rgba(9,10,18,0.98))] p-4 shadow-[0_14px_34px_rgba(0,0,0,0.22)]">
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300/75">
                  Guild Submission Status
                </div>
                <div className="mt-0.5 text-xl font-black tracking-[-0.03em] text-white">
                  Waiting Room
                </div>
              </div>

              <div className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-xs font-black text-cyan-100">
                {submittedCount} / {totalGuildSlots || 0}
              </div>
            </div>

            {!selectedOption ? (
              <div className="mt-3 rounded-xl border border-zinc-800/70 bg-black/25 p-4 text-sm text-zinc-400">
                No active battle selected.
              </div>
            ) : (
              <div
                className={[
                  "mt-3 grid gap-3",
                  selectedOption.homerooms.length > 1
                    ? "lg:grid-cols-2"
                    : "lg:grid-cols-1",
                ].join(" ")}
              >
                {selectedOption.homerooms.map((hr: string) => (
                  <div
                    key={hr}
                    className="rounded-2xl border border-zinc-800/70 bg-black/25 p-3"
                  >
                    <div className="mb-2 text-center text-base font-black text-cyan-200">
                      {hr}
                    </div>

                    <div className="grid gap-1.5">
                      {GUILDS.map((guild) => {
                        const action =
                          guildActionsMap[`${hr}_${guild}`] || "WAITING";
                        const display = actionDisplay(action);

                        return (
                          <div
                            key={`${hr}-${guild}`}
                            className={[
                              "flex items-center justify-between gap-3 rounded-lg border px-3 py-1.5",
                              display.className,
                            ].join(" ")}
                          >
                            <div className="truncate text-sm font-black text-white">
                              {guild}
                            </div>

                            <div className="shrink-0 text-[10px] font-black uppercase tracking-[0.1em]">
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
      </main>
    </div>
  );
}
