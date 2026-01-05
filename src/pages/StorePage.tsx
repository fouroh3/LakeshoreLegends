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
  type AttrKey,
  type AttrsBundle,
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

const pill =
  "inline-flex items-center gap-2 rounded-full border border-zinc-800/80 bg-black/20 px-3 py-1.5 text-xs text-white/80";

const attrCardBase =
  "relative rounded-2xl border border-zinc-800/80 bg-zinc-950/60 hover:bg-zinc-900 active:scale-[0.99] disabled:opacity-50 disabled:hover:bg-zinc-950/60 transition overflow-hidden";

const attrCardSelected =
  "border-cyan-400/45 bg-cyan-400/10 hover:bg-cyan-400/10 ring-1 ring-cyan-300/15";

function isSheetErrorLike(v: any) {
  const s = String(v ?? "")
    .trim()
    .toUpperCase();
  return (
    s === "#REF!" ||
    s === "#N/A" ||
    s === "#VALUE!" ||
    s === "#ERROR!" ||
    s === "#DIV/0!"
  );
}

function cleanText(v: any) {
  if (v == null) return "";
  const s = String(v)
    .replace(/\u00A0/g, " ")
    .trim();
  if (!s) return "";
  if (isSheetErrorLike(s)) return "";
  return s;
}

function fullName(s: Student) {
  const first = cleanText((s as any).first);
  const last = cleanText((s as any).last);
  const name = [last, first].filter(Boolean).join(", ");
  return name || cleanText((s as any).name) || "Unknown";
}

function normIdForConfirm(v: string) {
  return String(v ?? "")
    .replace(/\u00A0/g, " ")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, "")
    .trim()
    .toUpperCase();
}

const ATTRS: { key: AttrKey; title: string; icon: string }[] = [
  { key: "STR", title: "Strength", icon: "💪" },
  { key: "DEX", title: "Dexterity", icon: "🏹" },
  { key: "CON", title: "Constitution", icon: "🛡️" },
  { key: "INT", title: "Intelligence", icon: "🧠" },
  { key: "WIS", title: "Wisdom", icon: "🦉" },
  { key: "CHA", title: "Charisma", icon: "💬" },
];

// Fallback base from roster (may be stale). Server attrs are preferred.
function rosterBaseAttr(s: Student, t: AttrKey) {
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

export default function StorePage({ onBack }: Props) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [store, setStore] = useState<StoreState | null>(null);
  const [storeErr, setStoreErr] = useState<string | null>(null);

  // HR → Guild → Student
  const [hr, setHr] = useState<string>("");
  const [guild, setGuild] = useState<string>("");
  const [selectedId, setSelectedId] = useState<string>("");

  const [summary, setSummary] = useState<XpSummary | null>(null);
  const [serverAttrs, setServerAttrs] = useState<AttrsBundle | null>(null);

  // Safety inputs
  const [pin, setPin] = useState("");
  const [confirmId, setConfirmId] = useState("");

  // Two-step purchase
  const [pendingTarget, setPendingTarget] = useState<AttrKey | null>(null);

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
        setStudents(Array.isArray(data) ? data : []);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message ?? "Failed to load students");
        setStudents([]);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Load store state (poll + cache-bust + keep last known)
  useEffect(() => {
    let alive = true;

    const tick = async () => {
      try {
        setStoreErr(null);
        const st = await getStoreState();
        if (!alive) return;
        setStore(st);
      } catch (e: any) {
        if (!alive) return;
        setStoreErr(e?.message ?? "Failed to load store state");
        // keep last known state; don't force "closed" on transient errors
        setStore(
          (prev) =>
            prev ?? { storeLocked: true, xpPerPoint: 5, maxPointsPerOpen: 999 }
        );
      }
    };

    tick(); // initial load
    const id = window.setInterval(tick, 5000);

    const onVis = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      alive = false;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const xpPerPoint = store?.xpPerPoint ?? 5;
  const storeLocked = store?.storeLocked ?? true;
  const maxPoints = store?.maxPointsPerOpen ?? 999;

  // Homerooms list
  const homerooms = useMemo(() => {
    const set = new Set<string>();
    for (const s of students) {
      const h = cleanText((s as any).homeroom);
      if (h) set.add(h);
    }
    return Array.from(set).sort((a, b) =>
      a.localeCompare(b, "en", { numeric: true })
    );
  }, [students]);

  // If HR changes: reset downstream steps
  useEffect(() => {
    setGuild("");
    setSelectedId("");
  }, [hr]);

  // Guild list for selected HR
  const guildsForHr = useMemo(() => {
    const set = new Set<string>();
    for (const s of students) {
      const h = cleanText((s as any).homeroom);
      if (!hr || h !== hr) continue;
      const g = cleanText((s as any).guild);
      if (g) set.add(g);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "en"));
  }, [students, hr]);

  // If guild changes: reset student
  useEffect(() => {
    setSelectedId("");
  }, [guild]);

  // Students list for HR (+ optional guild)
  const studentsForPick = useMemo(() => {
    return students
      .filter((s) => {
        const h = cleanText((s as any).homeroom);
        if (!hr) return false;
        if (h !== hr) return false;
        const g = cleanText((s as any).guild);
        if (guild && g !== guild) return false;
        return true;
      })
      .slice()
      .sort((a, b) => fullName(a).localeCompare(fullName(b), "en"));
  }, [students, hr, guild]);

  const selected = useMemo(
    () => students.find((s) => (s as any).id === selectedId) ?? null,
    [students, selectedId]
  );

  // Clear sensitive inputs when switching students
  useEffect(() => {
    setPin("");
    setConfirmId("");
    setPendingTarget(null);
    setSpendErr(null);
    setToast(null);
    setServerAttrs(null);
  }, [selectedId]);

  // Load XP summary (and attrs)
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!selectedId) {
        setSummary(null);
        setServerAttrs(null);
        return;
      }
      try {
        setSpendErr(null);
        const s = await getXpSummary(selectedId);
        if (!alive) return;
        setSummary(s);
        setServerAttrs(s.attrs ?? null);
      } catch (e: any) {
        if (!alive) return;
        setSpendErr(e?.message ?? "Failed to load XP summary");
        setSummary(null);
        setServerAttrs(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, [selectedId]);

  const confirmOk =
    !!selected &&
    normIdForConfirm(confirmId) ===
      normIdForConfirm(String((selected as any).id ?? ""));

  const pointsAvailable = summary?.spendablePoints ?? 0;
  const hasEnoughPoints = pointsAvailable >= 1;
  const withinWindow = 1 <= maxPoints;

  const canSelectAttribute =
    !!selected &&
    !storeLocked &&
    !spending &&
    !!pin.trim() &&
    confirmOk &&
    hasEnoughPoints &&
    withinWindow;

  const canConfirmPurchase = canSelectAttribute && !!pendingTarget;

  function displayAttr(t: AttrKey) {
    if (serverAttrs?.final?.[t] != null) return Number(serverAttrs.final[t]);
    if (selected) return rosterBaseAttr(selected, t);
    return 0;
  }

  const pendingMeta = useMemo(() => {
    if (!selected || !pendingTarget) return null;

    const current = displayAttr(pendingTarget);
    const next = current + 1;

    const costXp = xpPerPoint;
    const bal = summary?.balance ?? 0;
    const afterBal = bal - costXp;
    const afterPoints = Math.floor(Math.max(0, afterBal) / xpPerPoint);

    const title =
      ATTRS.find((a) => a.key === pendingTarget)?.title ?? pendingTarget;
    const icon = ATTRS.find((a) => a.key === pendingTarget)?.icon ?? "⭐";

    return { current, next, costXp, bal, afterBal, afterPoints, title, icon };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, pendingTarget, xpPerPoint, summary?.balance, serverAttrs]);

  async function confirmSpend() {
    if (!selected || !pendingTarget) return;
    if (storeLocked) return;

    setSpending(true);
    setSpendErr(null);
    try {
      if (!hasEnoughPoints)
        throw new Error("Not enough XP to buy a point yet.");
      if (!withinWindow) throw new Error("Spending is limited right now.");
      if (!pin.trim()) throw new Error("Enter the Store PIN.");
      if (!confirmOk) throw new Error("Confirm your StudentID to purchase.");

      const res = await spendXp({
        studentId: (selected as any).id,
        pin: pin.trim(),
        target: pendingTarget,
        points: 1,
      });

      if (res.attrs) setServerAttrs(res.attrs);

      const nextSummary =
        res.summary ?? (await getXpSummary((selected as any).id));
      setSummary(nextSummary);
      if (nextSummary.attrs) setServerAttrs(nextSummary.attrs);

      setToast(`✅ Purchased +1 ${pendingTarget}`);
      setTimeout(() => setToast(null), 1800);

      setPendingTarget(null);
    } catch (e: any) {
      setSpendErr(e?.message ?? "Spend failed");
    } finally {
      setSpending(false);
    }
  }

  const noHomerooms = !loading && homerooms.length === 0;

  const attrTileNumber = (key: AttrKey, isSelected: boolean) => {
    const current = displayAttr(key);
    const next = current + 1;

    if (!isSelected) {
      return (
        <div className="mt-3 flex items-center justify-center">
          <div className="text-4xl font-extrabold tabular-nums text-white leading-none">
            {current}
          </div>
        </div>
      );
    }

    return (
      <div className="mt-3 flex items-center justify-center gap-3">
        <div className="text-3xl font-extrabold tabular-nums text-white leading-none">
          {current}
        </div>
        <div className="text-3xl font-extrabold text-cyan-200 leading-none">
          →
        </div>
        <div className="text-4xl font-extrabold tabular-nums text-cyan-200 leading-none">
          {next}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen w-full bg-zinc-950 text-zinc-100">
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
              Attribute Store
            </h1>
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
          <section className={`${card} ${cardPad}`}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <div className="text-base font-semibold">How it works</div>
                <div className="text-sm text-white/70 mt-1">
                  Choose Homeroom → Guild → Student. Select an attribute to
                  preview, then confirm the purchase.
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className={pill}>
                  <span className="text-white/50">Store</span>{" "}
                  <span className="font-semibold">
                    {storeLocked ? "Closed" : "Open"}
                  </span>
                </span>
                <span className={pill}>
                  <span className="text-white/50">Cost</span>{" "}
                  <span className="font-semibold">{xpPerPoint} XP / point</span>
                </span>
                <span className={pill}>
                  <span className="text-white/50">Window limit</span>{" "}
                  <span className="font-semibold">{maxPoints} max</span>
                </span>
              </div>
            </div>

            <div className="mt-3 text-xs text-white/60">
              Purchases are logged so teachers can verify later.
            </div>

            {noHomerooms && (
              <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-100">
                No homerooms were found in the roster data. Check the published
                sheet/CSV for a valid <b>Homeroom</b> column.
              </div>
            )}
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] gap-4">
            {/* LEFT: HR → Guild → Student */}
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
                      disabled={homerooms.length === 0}
                    >
                      <option value="">Select…</option>
                      {homerooms.map((x) => (
                        <option key={x} value={x}>
                          {x}
                        </option>
                      ))}
                    </select>
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
                        <option key={(s as any).id} value={(s as any).id}>
                          {fullName(s)} • {(s as any).id}
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
                      ? `${cleanText((selected as any).homeroom)} • ${
                          (selected as any).id
                        } • ${cleanText((selected as any).guild)}`
                      : ""}
                  </div>
                </div>

                {loading && (
                  <div className="text-sm text-white/70">Loading…</div>
                )}
                {err && <div className="text-sm text-red-200">{err}</div>}
              </div>
            </section>

            {/* RIGHT: XP + select + confirm */}
            <section className={`${card} ${cardPad}`}>
              <div>
                <div className="text-base font-semibold">XP + Purchases</div>
                <div className="text-xs text-white/60">
                  Select an attribute, review, then confirm.
                </div>
              </div>

              {!selected && (
                <div className="mt-6 text-sm text-white/70">
                  Select a student on the left.
                </div>
              )}

              {selected && (
                <>
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

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-zinc-800/80 bg-black/20 px-3 py-2">
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

                    <div className="rounded-2xl border border-zinc-800/80 bg-black/20 px-3 py-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className={label}>Confirm StudentID</div>
                        <button
                          type="button"
                          className="text-[11px] text-cyan-200 hover:text-cyan-100"
                          onClick={() =>
                            setConfirmId(String((selected as any).id ?? ""))
                          }
                          disabled={storeLocked}
                        >
                          Tap to copy
                        </button>
                      </div>

                      <input
                        className={input + " mt-1"}
                        value={confirmId}
                        onChange={(e) => setConfirmId(e.target.value)}
                        placeholder={`Type: ${(selected as any).id}`}
                        disabled={storeLocked}
                      />

                      <div className="mt-2 text-[11px]">
                        {confirmOk ? (
                          <span className="text-cyan-200">
                            ✓ StudentID confirmed
                          </span>
                        ) : (
                          <span className="text-white/60">
                            Must match exactly before purchasing.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Step 1: Select attribute */}
                  <div className="mt-5">
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <div className={label}>Step 1</div>
                        <div className="text-sm font-semibold">
                          Select an attribute (+1)
                        </div>
                      </div>
                      <div className="text-xs text-white/60">
                        Cost: {xpPerPoint} XP
                      </div>
                    </div>

                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {ATTRS.map(({ key, title, icon }) => {
                        const isSelected = pendingTarget === key;

                        return (
                          <button
                            key={key}
                            className={[
                              attrCardBase,
                              "p-4 text-center",
                              isSelected ? attrCardSelected : "",
                              isSelected ? "z-0" : "z-0", // keep tiles from stacking above Step 2
                            ].join(" ")}
                            disabled={!canSelectAttribute}
                            onClick={() =>
                              setPendingTarget((prev) =>
                                prev === key ? null : key
                              )
                            }
                            title={
                              canSelectAttribute
                                ? isSelected
                                  ? "Selected (tap again to unselect)"
                                  : `Select ${title}`
                                : "Need store open + PIN + confirm + enough XP"
                            }
                          >
                            <div className="flex items-center justify-center">
                              <span className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-zinc-700/70 bg-zinc-900/60 text-base">
                                {icon}
                              </span>
                            </div>

                            <div className="mt-3 text-[15px] font-semibold leading-tight text-white">
                              {title}
                            </div>

                            {attrTileNumber(key, isSelected)}

                            <div className="mt-2 text-[11px] text-white/50">
                              {isSelected
                                ? "Tap again to unselect"
                                : "Tap to preview"}
                            </div>

                            {isSelected && (
                              <div className="mt-2 text-[11px] text-cyan-200/80">
                                Selected
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-3 text-xs text-white/60">
                      {storeLocked
                        ? "Store is closed."
                        : !pin.trim()
                        ? "Enter the Store PIN to unlock selection."
                        : !confirmOk
                        ? "Confirm your StudentID to unlock selection."
                        : !hasEnoughPoints
                        ? `Not enough XP. You need ${xpPerPoint} XP for 1 point.`
                        : !withinWindow
                        ? "Purchases are limited right now."
                        : pendingTarget
                        ? "Great — now review and confirm below."
                        : "Select an attribute to preview the purchase."}
                    </div>
                  </div>

                  {/* Step 2: Review + confirm */}
                  <div
                    className={[
                      "mt-6 pt-4 border-t border-zinc-800/60",
                      "relative z-10", // <-- ensures this block stays above tile shadows
                    ].join(" ")}
                  >
                    <div className={label}>Step 2</div>
                    <div className="text-sm font-semibold">Review purchase</div>

                    {!pendingMeta && (
                      <div className="mt-2 rounded-2xl border border-zinc-800/80 bg-black/30 px-3 py-3 text-sm text-white/70">
                        Choose an attribute above to see what will change.
                      </div>
                    )}

                    {pendingMeta && (
                      <div className="mt-2 rounded-2xl border border-zinc-800/80 bg-black/30 px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-zinc-700/70 bg-zinc-900/60 text-base">
                              {pendingMeta.icon}
                            </span>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold truncate">
                                +1 {pendingMeta.title}
                              </div>
                              <div className="text-xs text-white/60">
                                {pendingMeta.current} → {pendingMeta.next}
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className={label}>Cost</div>
                            <div className="text-sm font-semibold tabular-nums">
                              {pendingMeta.costXp} XP
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
                          <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 px-3 py-2 text-center">
                            <div className={label}>XP now</div>
                            <div className="text-sm font-semibold tabular-nums">
                              {pendingMeta.bal}
                            </div>
                          </div>
                          <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 px-3 py-2 text-center">
                            <div className={label}>XP after</div>
                            <div className="text-sm font-semibold tabular-nums">
                              {pendingMeta.afterBal}
                            </div>
                          </div>
                          <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 px-3 py-2 text-center">
                            <div className={label}>Points now</div>
                            <div className="text-sm font-semibold tabular-nums">
                              {pointsAvailable}
                            </div>
                          </div>
                          <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 px-3 py-2 text-center">
                            <div className={label}>Points after</div>
                            <div className="text-sm font-semibold tabular-nums">
                              {pendingMeta.afterPoints}
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-end">
                          <button
                            className={btn}
                            type="button"
                            onClick={() => setPendingTarget(null)}
                            disabled={spending}
                          >
                            Cancel
                          </button>
                          <button
                            className={[
                              btn,
                              canConfirmPurchase
                                ? "border-cyan-400/30 bg-cyan-400/10 hover:bg-cyan-400/15 text-cyan-100"
                                : "",
                            ].join(" ")}
                            type="button"
                            onClick={confirmSpend}
                            disabled={!canConfirmPurchase}
                          >
                            {spending ? "Purchasing…" : "Confirm Purchase"}
                          </button>
                        </div>
                      </div>
                    )}

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
