// src/pages/StorePage.tsx
import { useEffect, useMemo, useState } from "react";
import type { Student } from "../types";
import { loadStudents } from "../data";
import {
  getStoreState,
  getXpSummary,
  spendXp,
  type StoreState,
  type XpSummary,
} from "../xpApi";

type Props = { onBack?: () => void };

const card =
  "rounded-2xl border border-zinc-800/80 bg-zinc-950/60 shadow-sm backdrop-blur";
const cardPad = "px-4 py-3";
const label = "text-[11px] uppercase tracking-wide text-white/50";

const input =
  "w-full rounded-xl bg-black/40 border border-zinc-800/80 px-3 py-2 text-sm text-white outline-none focus:border-white/25";

const select =
  "w-full rounded-xl bg-black/40 border border-zinc-800/80 px-3 py-2 text-sm text-white outline-none focus:border-white/25 pr-10 appearance-none";

const btn =
  "rounded-xl border border-zinc-800/80 bg-zinc-950/60 px-3 py-2 text-sm text-white hover:bg-zinc-900 active:scale-[0.99] disabled:opacity-50 disabled:hover:bg-zinc-950/60";

const buyCard =
  "rounded-2xl border border-zinc-800/80 bg-zinc-950/60 hover:bg-zinc-900 active:scale-[0.99] disabled:opacity-50 disabled:hover:bg-zinc-950/60";

function fullName(s: Student) {
  const first = (s.first ?? "").trim();
  const last = (s.last ?? "").trim();
  return [last, first].filter(Boolean).join(", ");
}

function normIdForConfirm(v: string) {
  return String(v ?? "")
    .replace(/\u00A0/g, " ")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, "")
    .trim()
    .toUpperCase();
}

type AttrKey = "STR" | "DEX" | "CON" | "INT" | "WIS" | "CHA";

const ATTRS: { key: AttrKey; title: string; icon: string }[] = [
  { key: "STR", title: "Strength", icon: "💪" },
  { key: "DEX", title: "Dexterity", icon: "🏹" },
  { key: "CON", title: "Constitution", icon: "🛡️" },
  { key: "INT", title: "Intelligence", icon: "🧠" },
  { key: "WIS", title: "Wisdom", icon: "🦉" },
  { key: "CHA", title: "Charisma", icon: "💬" },
];

function attrValFor(s: Student, t: AttrKey) {
  const anyS: any = s as any;
  const map: Record<AttrKey, string> = {
    STR: "str",
    DEX: "dex",
    CON: "con",
    INT: "int",
    WIS: "wis",
    CHA: "cha",
  };
  return Number(anyS?.[map[t]] ?? 0);
}

/** Dashboard-like emoji badge */
function StatBadge({
  icon,
  title,
  className = "",
}: {
  icon: string;
  title?: string;
  className?: string;
}) {
  return (
    <span
      title={title}
      className={[
        "inline-flex items-center justify-center",
        "h-8 w-8 rounded-full",
        "border border-zinc-700/70 bg-zinc-900/60",
        "text-base leading-none",
        "shadow-sm",
        className,
      ].join(" ")}
    >
      {icon}
    </span>
  );
}

export default function StorePage({ onBack }: Props) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [store, setStore] = useState<StoreState | null>(null);
  const [storeErr, setStoreErr] = useState<string | null>(null);

  // Dropdown selector
  const [hr, setHr] = useState<string>("");
  const [guild, setGuild] = useState<string>("");
  const [selectedId, setSelectedId] = useState<string>("");

  const [summary, setSummary] = useState<XpSummary | null>(null);

  // prevent sticky PIN + wrong-student spend
  const [pin, setPin] = useState("");
  const [confirmId, setConfirmId] = useState("");

  const [spending, setSpending] = useState(false);
  const [spendErr, setSpendErr] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Load students
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const data = await loadStudents();
        if (!alive) return;
        setStudents(data);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message ?? "Failed to load students");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Load store state
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setStoreErr(null);
        const st = await getStoreState();
        if (!alive) return;
        setStore(st);
      } catch (e: any) {
        if (!alive) return;
        setStoreErr(e?.message ?? "Failed to load store state");
        setStore((prev) => prev ?? { storeLocked: true, xpPerPoint: 5 });
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const xpPerPoint = store?.xpPerPoint ?? 5;
  const storeLocked = store?.storeLocked ?? true;
  const maxPoints = store?.maxPointsPerOpen ?? 999;

  // Homerooms list
  const homerooms = useMemo(() => {
    const set = new Set<string>();
    for (const s of students) if (s.homeroom) set.add(String(s.homeroom));
    return Array.from(set).sort((a, b) =>
      a.localeCompare(b, "en", { numeric: true })
    );
  }, [students]);

  // When HR changes, reset guild + student
  useEffect(() => {
    setGuild("");
    setSelectedId("");
  }, [hr]);

  // Guild list based on HR
  const guildsForHr = useMemo(() => {
    const set = new Set<string>();
    for (const s of students) {
      if (!hr || String(s.homeroom) !== hr) continue;
      const g = String((s as any).guild ?? "");
      if (g) set.add(g);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "en"));
  }, [students, hr]);

  // When guild changes, reset student
  useEffect(() => {
    setSelectedId("");
  }, [guild]);

  // Students for selected HR+Guild
  const studentsForPick = useMemo(() => {
    return students
      .filter((s) => {
        if (!hr) return false;
        if (String(s.homeroom) !== hr) return false;
        if (guild && String((s as any).guild ?? "") !== guild) return false;
        return true;
      })
      .slice()
      .sort((a, b) => fullName(a).localeCompare(fullName(b), "en"));
  }, [students, hr, guild]);

  const selected = useMemo(
    () => students.find((s) => s.id === selectedId) ?? null,
    [students, selectedId]
  );

  // clear sensitive inputs when switching students
  useEffect(() => {
    setPin("");
    setConfirmId("");
    setSpendErr(null);
    setToast(null);
  }, [selectedId]);

  // Load XP summary
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!selectedId) {
        setSummary(null);
        return;
      }
      try {
        setSpendErr(null);
        const s = await getXpSummary(selectedId);
        if (!alive) return;
        setSummary(s);
      } catch (e: any) {
        if (!alive) return;
        setSpendErr(e?.message ?? "Failed to load XP summary");
        setSummary(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, [selectedId]);

  const confirmOk =
    !!selected &&
    normIdForConfirm(confirmId) === normIdForConfirm(String(selected.id ?? ""));

  async function doSpend(target: AttrKey) {
    if (!selected) return;
    if (storeLocked) return;

    setSpending(true);
    setSpendErr(null);
    try {
      const pointsAvailable = summary?.spendablePoints ?? 0;
      if (pointsAvailable < 1)
        throw new Error("Not enough XP to buy a point yet.");
      if (1 > maxPoints) throw new Error("Spending is limited right now.");
      if (!pin.trim()) throw new Error("Enter the Store PIN.");
      if (!confirmOk) throw new Error("Confirm your StudentID to purchase.");

      const res = await spendXp({
        studentId: selected.id,
        pin: pin.trim(),
        target,
        points: 1,
      });

      const next = res.summary ?? (await getXpSummary(selected.id));
      setSummary(next);

      setToast(`✅ Purchased +1 ${target}`);
      setTimeout(() => setToast(null), 1800);
    } catch (e: any) {
      setSpendErr(e?.message ?? "Spend failed");
    } finally {
      setSpending(false);
    }
  }

  // UI helpers for disabling
  const canSpend =
    !storeLocked &&
    !spending &&
    (summary?.spendablePoints ?? 0) >= 1 &&
    !!pin.trim() &&
    confirmOk;

  return (
    <div className="min-h-screen w-full bg-zinc-950 text-zinc-100">
      {/* Top bar */}
      <header className="sticky top-0 z-20 backdrop-blur bg-zinc-950/70 border-b border-zinc-800">
        <div className="w-full px-6 py-4 flex items-center gap-4">
          <button
            className={btn}
            onClick={onBack ?? (() => (window.location.search = ""))}
          >
            ← Back
          </button>

          <div className="flex-1">
            <h1 className="text-lg sm:text-xl font-bold tracking-wide">
              XP Store
            </h1>
            <div className="text-xs text-white/60 mt-0.5">
              {storeLocked ? "Store Closed" : "Store Open"}
              {store?.windowLabel ? ` • ${store.windowLabel}` : ""}
              {` • ${xpPerPoint} XP = 1 Attribute Point`}
              {storeErr ? " • (status may be delayed)" : ""}
            </div>
          </div>

          <div className="text-right">
            <div className={label}>Status</div>
            <div
              className={`text-sm font-semibold ${
                storeLocked ? "text-white/70" : "text-cyan-200"
              }`}
            >
              {storeLocked ? "LOCKED" : "OPEN"}
            </div>
          </div>
        </div>

        {storeErr && (
          <div className="w-full px-6 pb-4">
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-100">
              Store status couldn’t be refreshed right now. Showing last known
              state (default: Closed). Details: {storeErr}
            </div>
          </div>
        )}
      </header>

      <main className="w-full max-w-none px-4 sm:px-6 lg:px-8 py-4">
        <div className="mx-auto max-w-6xl space-y-4">
          {/* ✅ FULL-WIDTH HOW IT WORKS (moved to top) */}
          <section className={`${card} ${cardPad}`}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <div className="text-base font-semibold">How it works</div>
                <div className="text-sm text-white/70 mt-1">
                  When the store is{" "}
                  <span className="font-semibold text-white">open</span>, enter
                  the PIN and confirm your StudentID to spend XP.
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <div className="rounded-xl border border-zinc-800/80 bg-black/20 px-3 py-2 text-sm">
                  <div className={label}>Store</div>
                  <div className="font-semibold">
                    {storeLocked ? "Closed" : "Open"}
                  </div>
                </div>
                <div className="rounded-xl border border-zinc-800/80 bg-black/20 px-3 py-2 text-sm">
                  <div className={label}>Cost</div>
                  <div className="font-semibold">{xpPerPoint} XP / point</div>
                </div>
                <div className="rounded-xl border border-zinc-800/80 bg-black/20 px-3 py-2 text-sm">
                  <div className={label}>Window limit</div>
                  <div className="font-semibold">{maxPoints} max</div>
                </div>
              </div>
            </div>

            <div className="mt-3 text-xs text-white/60">
              Purchases are logged so teachers can verify later.
            </div>
          </section>

          {/* ✅ MAIN 2-COLUMN LAYOUT */}
          <div className="grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] gap-4">
            {/* Left: dropdown picker */}
            <section className={`${card} ${cardPad}`}>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <div className="text-base font-semibold">
                    Choose your character
                  </div>
                  <div className="text-xs text-white/60">
                    Homeroom → Guild → Student
                  </div>
                </div>
                <div className="text-xs text-white/60">
                  {students.length} students
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <div>
                  <div className={label}>Homeroom</div>
                  <div className="relative mt-1">
                    <select
                      className={select}
                      value={hr}
                      onChange={(e) => setHr(e.target.value)}
                    >
                      <option value="">Select…</option>
                      {homerooms.map((x) => (
                        <option key={x} value={x}>
                          {x}
                        </option>
                      ))}
                    </select>
                    {/* inset chevron */}
                    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/50">
                      ▾
                    </div>
                  </div>
                </div>

                <div>
                  <div className={label}>Guild</div>
                  <div className="relative mt-1">
                    <select
                      className={select}
                      value={guild}
                      onChange={(e) => setGuild(e.target.value)}
                      disabled={!hr}
                    >
                      <option value="">
                        {hr ? "All guilds" : "Select homeroom first"}
                      </option>
                      {guildsForHr.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/50">
                      ▾
                    </div>
                  </div>
                </div>

                <div>
                  <div className={label}>Student</div>
                  <div className="relative mt-1">
                    <select
                      className={select}
                      value={selectedId}
                      onChange={(e) => setSelectedId(e.target.value)}
                      disabled={!hr}
                    >
                      <option value="">
                        {hr ? "Select…" : "Select homeroom first"}
                      </option>
                      {studentsForPick.map((s) => (
                        <option key={s.id} value={s.id}>
                          {fullName(s)} • {s.id}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/50">
                      ▾
                    </div>
                  </div>
                </div>

                <div className="mt-2 rounded-xl border border-zinc-800/80 bg-black/20 px-3 py-2">
                  <div className={label}>Selected</div>
                  <div className="mt-1 text-sm font-semibold truncate">
                    {selected ? fullName(selected) : "—"}
                  </div>
                  <div className="text-xs text-white/60 truncate">
                    {selected
                      ? `${selected.homeroom} • ${selected.id} • ${String(
                          (selected as any).guild ?? ""
                        )}`
                      : ""}
                  </div>
                </div>

                {loading && (
                  <div className="text-sm text-white/70">Loading…</div>
                )}
                {err && <div className="text-sm text-red-200">{err}</div>}
              </div>
            </section>

            {/* Right: XP + buy + recent */}
            <section className={`${card} ${cardPad}`}>
              <div>
                <div className="text-base font-semibold">XP + Purchases</div>
                <div className="text-xs text-white/60">
                  Buy +1 attribute for {xpPerPoint} XP.
                </div>
              </div>

              {!selected && (
                <div className="mt-6 text-sm text-white/70">
                  Select your character on the left.
                </div>
              )}

              {selected && (
                <>
                  {/* XP boxes (centered) */}
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-zinc-800/80 bg-black/20 px-3 py-2 text-center">
                      <div className={label}>XP Balance</div>
                      <div className="text-2xl font-bold mt-0.5 tabular-nums">
                        {summary?.balance ?? "—"}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-zinc-800/80 bg-black/20 px-3 py-2 text-center">
                      <div className={label}>Points Available</div>
                      <div className="text-2xl font-bold mt-0.5 tabular-nums">
                        {summary?.spendablePoints ?? "—"}
                      </div>
                    </div>
                  </div>

                  {/* Current attributes */}
                  <div className="mt-4">
                    <div className={label}>Current Attributes</div>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {ATTRS.map(({ key, title, icon }) => (
                        <div
                          key={key}
                          className="rounded-2xl border border-zinc-800/80 bg-black/20 px-3 py-2 text-center"
                        >
                          <div className="flex items-center justify-center gap-2 text-xs text-white/70">
                            <StatBadge
                              icon={icon}
                              title={title}
                              className="h-7 w-7 text-sm"
                            />
                            <span className="truncate">{title}</span>
                          </div>
                          <div className="text-lg font-bold mt-1 tabular-nums">
                            {attrValFor(selected, key)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* PIN */}
                  <div className="mt-4 rounded-2xl border border-zinc-800/80 bg-black/20 px-3 py-2">
                    <div className={label}>Store PIN</div>
                    <input
                      className={input + " mt-1"}
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      placeholder={
                        storeLocked
                          ? "Store is closed"
                          : "Enter PIN shown by teacher"
                      }
                      disabled={storeLocked}
                    />
                    <div className="mt-2 text-[11px] text-white/60">
                      {storeLocked
                        ? "Store closed: you can view XP but cannot spend it."
                        : "Store open: enter the PIN to unlock purchases."}
                    </div>
                  </div>

                  {/* Confirm StudentID */}
                  <div className="mt-3 rounded-2xl border border-zinc-800/80 bg-black/20 px-3 py-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className={label}>Confirm StudentID</div>
                      <button
                        type="button"
                        className="text-[11px] text-cyan-200 hover:text-cyan-100"
                        onClick={() => setConfirmId(String(selected.id ?? ""))}
                        disabled={storeLocked}
                      >
                        Tap to copy
                      </button>
                    </div>

                    <input
                      className={input + " mt-1"}
                      value={confirmId}
                      onChange={(e) => setConfirmId(e.target.value)}
                      placeholder={`Type: ${selected.id}`}
                      disabled={storeLocked}
                    />

                    <div className="mt-2 text-[11px]">
                      {confirmOk ? (
                        <span className="text-cyan-200">
                          ✓ StudentID confirmed
                        </span>
                      ) : (
                        <span className="text-white/60">
                          Must match exactly before purchase buttons unlock.
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Buy grid */}
                  <div className="mt-5">
                    <div className={label}>Buy +1 attribute</div>
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {ATTRS.map(({ key, title, icon }) => {
                        const current = attrValFor(selected, key);
                        const next = current + 1;

                        return (
                          <button
                            key={key}
                            className={`${buyCard} p-4 text-center`}
                            disabled={!canSpend}
                            onClick={() => doSpend(key)}
                            title={
                              canSpend
                                ? `Buy +1 ${title}`
                                : "Need store open + PIN + confirm + enough XP"
                            }
                          >
                            {/* Icon row (Placement A) */}
                            <div className="flex items-center justify-center">
                              <StatBadge icon={icon} title={title} />
                            </div>

                            <div className="mt-3 text-[15px] font-semibold leading-tight text-white">
                              {title}
                            </div>

                            <div className="mt-1 text-sm text-white/60">
                              Cost: {xpPerPoint} XP
                            </div>

                            <div className="mt-1 text-sm text-white/70 tabular-nums">
                              {current} → {next}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {spendErr && (
                      <div className="mt-3 text-sm text-red-200">
                        {spendErr}
                      </div>
                    )}

                    {toast && (
                      <div className="mt-3 rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-100">
                        {toast}
                      </div>
                    )}
                  </div>

                  {/* Recent activity */}
                  <div className="mt-6">
                    <div className={label}>Recent activity</div>
                    <div className="mt-2 space-y-2">
                      {(summary?.recent ?? []).slice(0, 8).map((r, idx) => (
                        <div
                          key={idx}
                          className="rounded-xl border border-zinc-800/80 bg-black/20 px-3 py-2 text-sm"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="font-semibold min-w-0 truncate">
                              {r.type === "SPEND"
                                ? `Spent ${r.xp} XP`
                                : `Earned ${r.xp} XP`}
                              {r.target ? ` → ${r.target}` : ""}
                            </div>
                            <div className="text-[11px] text-white/60 whitespace-nowrap">
                              {r.timestamp}
                            </div>
                          </div>
                          {r.note && (
                            <div className="text-xs text-white/60 mt-1">
                              {r.note}
                            </div>
                          )}
                        </div>
                      ))}
                      {(summary?.recent?.length ?? 0) === 0 && (
                        <div className="text-sm text-white/60">
                          No transactions yet.
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </section>
          </div>
        </div>
      </main>

      <footer className="h-6" />
    </div>
  );
}
