// src/pages/store/StorePage.tsx

import { useEffect, useMemo, useRef, useState } from "react";
import AppTopBar from "../../components/AppTopBar";
import type { Student } from "../../types";
import { loadStudents } from "../../data";
import { fetchHpMap } from "../../hpApi";
import {
  getApiVersions,
  getStoreState,
  getXpSummary,
  spendXp,
  type AttrKey,
  type AttrsBundle,
  type StoreState,
  type XpSummary,
} from "../../xpApi";
import StoreHero from "./components/StoreHero";
import LegendSelectionPanel from "./components/LegendSelectionPanel";
import StoreSummaryPanel from "./components/StoreSummaryPanel";
import AttributeGrid from "./components/AttributeGrid";
import PurchaseReviewPanel from "./components/PurchaseReviewPanel";
import { getGuildTheme, shellCardBase } from "./storeTheme";
import {
  cleanText,
  fullName,
  isTransientPurchaseError,
  normIdForConfirm,
  rosterBaseAttr,
  sleep,
} from "./storeUtils";

type Props = {
  onBack?: () => void;
};

type HpEntry = {
  baseHP: number;
  currentHP: number;
};

async function spendXpWithRetry(
  args: Parameters<typeof spendXp>[0],
  opts?: { retries?: number; baseDelayMs?: number }
) {
  const retries = opts?.retries ?? 3;
  const baseDelayMs = opts?.baseDelayMs ?? 250;
  let lastErr: unknown = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await spendXp(args);
    } catch (e) {
      lastErr = e;
      if (!isTransientPurchaseError(e) || attempt === retries) throw e;
      const jitter = Math.floor(Math.random() * baseDelayMs);
      const delay = baseDelayMs * (attempt + 1) + jitter;
      await sleep(delay);
    }
  }

  throw lastErr ?? new Error("Purchase failed");
}

export default function StorePage({ onBack }: Props) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [hpMap, setHpMap] = useState<Map<string, HpEntry>>(new Map());
  const [hpErr, setHpErr] = useState<string | null>(null);

  const [store, setStore] = useState<StoreState | null>(null);
  const [storeErr, setStoreErr] = useState<string | null>(null);

  const [hr, setHr] = useState("");
  const [guild, setGuild] = useState("");
  const [selectedId, setSelectedId] = useState("");

  const [summary, setSummary] = useState<XpSummary | null>(null);
  const [serverAttrs, setServerAttrs] = useState<AttrsBundle | null>(null);

  const [pin, setPin] = useState("");
  const [confirmId, setConfirmId] = useState("");
  const [pendingTarget, setPendingTarget] = useState<AttrKey | null>(null);

  const [spending, setSpending] = useState(false);
  const [lastPurchased, setLastPurchased] = useState<AttrKey | null>(null);
  const [, setSpendErr] = useState<string | null>(null);
  const [, setToast] = useState<string | null>(null);
  const lastHpVersionRef = useRef<string | null>(null);
  const lastXpVersionRef = useRef<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const data = await loadStudents();
        if (!alive) return;
        setStudents(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!alive) return;
        setErr(e instanceof Error ? e.message : "Failed to load students");
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

useEffect(() => {
  let alive = true;

  const tick = async (force = false) => {
    try {
      const versions = await getApiVersions();

      const hpChanged =
        force ||
        lastHpVersionRef.current === null ||
        versions.hpLastWriteIso !== lastHpVersionRef.current;

      const xpChanged =
        force ||
        lastXpVersionRef.current === null ||
        versions.xpLastWriteIso !== lastXpVersionRef.current;

      if (hpChanged) {
        try {
          setHpErr(null);
          const nextHp = await fetchHpMap();
          if (!alive) return;
          setHpMap(nextHp);
          lastHpVersionRef.current = versions.hpLastWriteIso;
        } catch (e) {
          if (!alive) return;
          setHpErr(e instanceof Error ? e.message : "Failed to load HP state");
        }
      }

      if (xpChanged) {
        try {
          setStoreErr(null);
          const nextStore = await getStoreState();
          if (!alive) return;
          setStore(nextStore);
          lastXpVersionRef.current = versions.xpLastWriteIso;

          if (selectedId) {
            const nextSummary = await getXpSummary(selectedId);
            if (!alive) return;
            setSummary(nextSummary);
            setServerAttrs(nextSummary.attrs ?? null);
          }
        } catch (e) {
          if (!alive) return;
          setStoreErr(
            e instanceof Error ? e.message : "Failed to load store state"
          );
          setStore(
            (prev) =>
              prev ?? {
                storeLocked: true,
                xpPerPoint: 5,
                maxPointsPerOpen: 999,
              }
          );
        }
      }
    } catch (e) {
      if (!alive) return;
      setStoreErr(e instanceof Error ? e.message : "Failed to load API state");
    }
  };

  void tick(true);

  const id = window.setInterval(() => {
    void tick(false);
  }, 5000);

  const onVis = () => {
    if (document.visibilityState === "visible") {
      void tick(true);
    }
  };

  document.addEventListener("visibilitychange", onVis);

  return () => {
    alive = false;
    window.clearInterval(id);
    document.removeEventListener("visibilitychange", onVis);
  };
}, [selectedId]);

  const xpPerPoint = store?.xpPerPoint ?? 5;
  const storeLocked = store?.storeLocked ?? true;
  const maxPoints = store?.maxPointsPerOpen ?? 999;

  const homerooms = useMemo(() => {
    const set = new Set<string>();
    for (const s of students) {
      const h = cleanText((s as Record<string, unknown>).homeroom);
      if (h) set.add(h);
    }
    return Array.from(set).sort((a, b) =>
      a.localeCompare(b, "en", { numeric: true })
    );
  }, [students]);

  useEffect(() => {
    setGuild("");
    setSelectedId("");
  }, [hr]);

  const guildsForHr = useMemo(() => {
    const set = new Set<string>();
    for (const s of students) {
      const h = cleanText((s as Record<string, unknown>).homeroom);
      if (!hr || h !== hr) continue;
      const g = cleanText((s as Record<string, unknown>).guild);
      if (g) set.add(g);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "en"));
  }, [students, hr]);

  useEffect(() => {
    setSelectedId("");
  }, [guild]);

  const studentsForPick = useMemo(() => {
    return students
      .filter((s) => {
        const h = cleanText((s as Record<string, unknown>).homeroom);
        if (!hr || h !== hr) return false;
        const g = cleanText((s as Record<string, unknown>).guild);
        if (guild && g !== guild) return false;
        return true;
      })
      .slice()
      .sort((a, b) => fullName(a).localeCompare(fullName(b), "en"));
  }, [students, hr, guild]);

  const selected = useMemo(() => {
    return (
      students.find(
        (s) => String((s as Record<string, unknown>).id ?? "") === selectedId
      ) ?? null
    );
  }, [students, selectedId]);

  const selectedStudentId = selected
    ? String((selected as Record<string, unknown>).id ?? "")
    : "";

  const selectedGuild = cleanText(
    selected ? (selected as Record<string, unknown>).guild : guild
  );

  const guildTheme = useMemo(
    () => getGuildTheme(selectedGuild),
    [selectedGuild]
  );

  const liveHpState = useMemo(() => {
    if (!selectedStudentId) return null;
    return hpMap.get(normIdForConfirm(selectedStudentId)) ?? null;
  }, [hpMap, selectedStudentId]);

  useEffect(() => {
    setPin("");
    setConfirmId("");
    setPendingTarget(null);
    setSpendErr(null);
    setToast(null);
    setServerAttrs(null);
  }, [selectedId]);

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
      } catch (e) {
        if (!alive) return;
        setSpendErr(
          e instanceof Error ? e.message : "Failed to load XP summary"
        );
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
    normIdForConfirm(confirmId) === normIdForConfirm(selectedStudentId);

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
    if (serverAttrs?.final?.[t] != null) {
      return Number(serverAttrs.final[t]);
    }

    if (selected) {
      return rosterBaseAttr(selected, t);
    }

    return 0;
  }

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

      const requestId = `xp:${selectedStudentId}:${pendingTarget}:${Date.now()}:${Math.random()
        .toString(16)
        .slice(2)}`;

      const res = await spendXpWithRetry(
        {
          studentId: selectedStudentId,
          pin: pin.trim(),
          target: pendingTarget,
          points: 1,
          openNonce: store?.openNonce ?? "",
          requestId,
        },
        { retries: 3, baseDelayMs: 250 }
      );

            const purchasedTarget = pendingTarget;
      const beforeAttr = Number(
        res?.beforeAttr ?? displayAttr(purchasedTarget)
      );
      const afterAttr = Number(res?.afterAttr ?? beforeAttr + 1);

      setServerAttrs((prev) => ({
        ...(prev ?? {}),
        final: {
          ...(prev?.final ?? {}),
          [purchasedTarget]: afterAttr,
        },
      }));

      if (res?.summary) {
        setSummary(res.summary as XpSummary);
      } else {
        const nextSummary = await getXpSummary(selectedStudentId);
        setSummary(nextSummary);
      }

      setToast(
        `✅ Purchased +1 ${purchasedTarget}: ${beforeAttr} → ${afterAttr}. XP updated.`
      );

      setPendingTarget(purchasedTarget);
      setLastPurchased(purchasedTarget);

      window.setTimeout(() => {
        setLastPurchased(null);
        setToast(null);
      }, 2200);
    } catch (e) {
      setSpendErr(e instanceof Error ? e.message : "Spend failed");
    } finally {
      setSpending(false);
    }
  }

  const noHomerooms = !loading && homerooms.length === 0;
  const combinedErr = err ?? hpErr;

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#05070d] text-zinc-100">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.08),transparent_28%),radial-gradient(circle_at_78%_16%,rgba(99,102,241,0.08),transparent_22%),radial-gradient(circle_at_22%_30%,rgba(168,85,247,0.06),transparent_20%),linear-gradient(180deg,#04060b_0%,#070a11_55%,#04060b_100%)]" />
        <div className="absolute left-1/2 top-[100px] h-[320px] w-[1100px] -translate-x-1/2 rounded-full bg-cyan-500/[0.04] blur-3xl" />
        <div className="absolute left-[15%] top-[360px] h-[260px] w-[260px] rounded-full bg-violet-500/[0.04] blur-3xl" />
        <div className="absolute right-[12%] top-[320px] h-[300px] w-[300px] rounded-full bg-sky-500/[0.03] blur-3xl" />
      </div>

      <AppTopBar
        title="Attribute Store"
        activeView="store"
        onNavigate={(next) => {
          if (next === "dashboard") {
            onBack?.();
            return;
          }

          const url = new URL(window.location.href);
          url.searchParams.set("view", next);
          window.location.href = url.toString();
        }}
      />

      <main className="relative z-[1] px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1680px] space-y-5">
          <StoreHero
            guildShellGlow={guildTheme.shellGlow}
            guildTintBg={guildTheme.tintBg}
            rosterCount={students.length}
            storeErr={storeErr}
            noHomerooms={noHomerooms}
          />

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
            <LegendSelectionPanel
              homerooms={homerooms}
              hr={hr}
              setHr={setHr}
              guildsForHr={guildsForHr}
              guild={guild}
              setGuild={setGuild}
              studentsForPick={studentsForPick}
              selectedId={selectedId}
              setSelectedId={setSelectedId}
              selected={selected}
              summaryBalance={summary?.balance ?? null}
              summarySpendable={summary?.spendablePoints ?? null}
              storeLocked={storeLocked}
              loading={loading}
              err={combinedErr}
              liveHp={liveHpState?.currentHP ?? null}
              liveMaxHp={liveHpState?.baseHP ?? null}
              guildTheme={guildTheme}
            />

            <section
              className={`${shellCardBase} ${guildTheme.border} ${guildTheme.tintBg} px-4 py-4 sm:px-5 ${guildTheme.shellGlow}`}
            >
              {!selected && (
                <div className="rounded-[22px] border border-white/[0.04] bg-[linear-gradient(180deg,rgba(18,22,32,0.58),rgba(9,11,17,0.70))] px-5 py-10 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_10px_24px_rgba(0,0,0,0.22)]">
                  <div className="mx-auto max-w-xl">
                    <div className="text-[11px] uppercase tracking-[0.24em] text-white/42">
                      Awaiting Target
                    </div>
                    <div className="mt-2 text-2xl font-semibold tracking-tight text-white">
                      Select a student to enter the store.
                    </div>
                    <p className="mt-2 text-sm leading-6 text-white/58">
                      Once a legend is selected, their XP, confirmation fields,
                      preview cards, and purchase controls will come online.
                    </p>
                  </div>
                </div>
              )}

              {selected && (
                <div className="space-y-3 xl:space-y-5">
                  <StoreSummaryPanel
                    xpPerPoint={xpPerPoint}
                    maxPoints={maxPoints}
                    summaryBalance={summary?.balance ?? null}
                    summarySpendable={summary?.spendablePoints ?? null}
                    pin={pin}
                    setPin={setPin}
                    confirmId={confirmId}
                    setConfirmId={setConfirmId}
                    selectedStudentId={selectedStudentId}
                    confirmOk={confirmOk}
                    storeLocked={storeLocked}
                    hasEnoughPoints={hasEnoughPoints}
                    pendingTarget={pendingTarget}
                    guildTheme={guildTheme}
                  />

                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_360px] xl:gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
                    <AttributeGrid
                      xpPerPoint={xpPerPoint}
                      storeLocked={storeLocked}
                      pin={pin}
                      confirmOk={confirmOk}
                      hasEnoughPoints={hasEnoughPoints}
                      canSelectAttribute={canSelectAttribute}
                      withinWindow={withinWindow}
                      pendingTarget={pendingTarget}
                      setPendingTarget={setPendingTarget}
                      displayAttr={displayAttr}
                      guildTheme={guildTheme}
                    />

                    <PurchaseReviewPanel
                      pendingTarget={pendingTarget}
                      displayAttr={displayAttr}
                      xpPerPoint={xpPerPoint}
                      summaryBalance={summary?.balance ?? null}
                      canConfirm={canConfirmPurchase}
                      spending={spending}
                      lastPurchased={lastPurchased}
                      onConfirm={() => {
                        void confirmSpend();
                      }}
                      guildTheme={guildTheme}
                    />
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>

      <footer className="h-6" />
    </div>
  );
}
