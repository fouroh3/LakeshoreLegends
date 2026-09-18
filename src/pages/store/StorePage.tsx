// src/pages/store/StorePage.tsx

import { useEffect, useMemo, useState } from "react";
import AppTopBar from "../../components/AppTopBar";
import type { Student } from "../../types";
import { loadCachedStudents, loadStudents } from "../../data";
import { normalizeSkillName } from "../../data/skillLibrary";
import {
  getStoreState,
  getXpSummary,
  spendXp,
  type AttrKey,
  type AttrsBundle,
  type StoreState,
  type XpSummary,
} from "../../xpApi";
import type { SkillSummary } from "../../skillApi";
import StoreHero from "./components/StoreHero";
import LegendSelectionPanel from "./components/LegendSelectionPanel";
import StoreSummaryPanel from "./components/StoreSummaryPanel";
import StoreModeTabs, { type StoreMode } from "./components/StoreModeTabs";
import AttributeGrid from "./components/AttributeGrid";
import SkillTrainingPanel from "./components/SkillTrainingPanel";
import PurchaseReviewPanel from "./components/PurchaseReviewPanel";
import { getGuildTheme, shellCardBase } from "./storeTheme";
import {
  cleanText,
  fullName,
  normIdForConfirm,
  rosterBaseAttr,
} from "./storeUtils";

type Props = {
  onBack?: () => void;
};

function skillsToOwnedIdSet(raw: unknown) {
  return new Set(
    String(raw ?? "")
      .split(/[;,|]/g)
      .map((skill) => normalizeSkillName(skill))
      .filter(Boolean)
  );
}

export default function StorePage({ onBack }: Props) {
  const initialStudents = useMemo(() => loadCachedStudents() ?? [], []);
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [loading, setLoading] = useState(initialStudents.length === 0);
  const [err, setErr] = useState<string | null>(null);

  const [store, setStore] = useState<StoreState | null>(null);
  const [storeErr, setStoreErr] = useState<string | null>(null);

  const [hr, setHr] = useState("");
  const [guild, setGuild] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [storeMode, setStoreMode] = useState<StoreMode>("attributes");

  const [summary, setSummary] = useState<XpSummary | null>(null);
  const [serverAttrs, setServerAttrs] = useState<AttrsBundle | null>(null);

  const [pin, setPin] = useState("");
  const [confirmId, setConfirmId] = useState("");
  const [pendingPoints, setPendingPoints] = useState<Partial<Record<AttrKey, number>>>({});
  const [pendingSkillId, setPendingSkillId] = useState<string | null>(null);
  const [skillSummary, setSkillSummary] = useState<SkillSummary | null>(null);

  const [spending, setSpending] = useState(false);
  const [lastPurchaseCount, setLastPurchaseCount] = useState(0);
  const [, setSpendErr] = useState<string | null>(null);
  const [, setToast] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const data = await loadStudents({ force: true });
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

    const refreshStoreState = async () => {
      try {
        setStoreErr(null);
        const nextStore = await getStoreState();
        if (!alive) return;
        setStore(nextStore);
      } catch (e) {
        if (!alive) return;
        setStoreErr(e instanceof Error ? e.message : "Failed to load store state");
        setStore((prev) => prev ?? { storeLocked: true, xpPerPoint: 5, maxPointsPerOpen: 999 });
      }
    };

    void refreshStoreState();

    const onVis = () => {
      if (document.visibilityState === "visible") {
        void refreshStoreState();
      }
    };

    document.addEventListener("visibilitychange", onVis);

    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

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

  const ownedSkillIds = useMemo(() => {
    return skillsToOwnedIdSet((selected as Record<string, unknown> | null)?.skills);
  }, [selected]);

  useEffect(() => {
    setPin("");
    setConfirmId("");
    setPendingPoints({});
    setPendingSkillId(null);
    setSkillSummary(null);
    setSpendErr(null);
    setToast(null);
    setServerAttrs(null);
  }, [selectedId]);

  useEffect(() => {
    setPendingPoints({});
    setPendingSkillId(null);
    setLastPurchaseCount(0);
  }, [storeMode]);

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
  const totalPendingPoints = Object.values(pendingPoints).reduce(
    (sum, value) => sum + Number(value || 0),
    0
  );
  const pendingCost = totalPendingPoints * xpPerPoint;
  const withinWindow = totalPendingPoints < maxPoints;

  const canSelectAttribute =
    !!selected &&
    !storeLocked &&
    !spending &&
    !!pin.trim() &&
    confirmOk &&
    hasEnoughPoints &&
    withinWindow;

  const canConfirmPurchase =
    !!selected &&
    !storeLocked &&
    !spending &&
    !!pin.trim() &&
    confirmOk &&
    totalPendingPoints > 0 &&
    totalPendingPoints <= maxPoints &&
    pendingCost <= (summary?.balance ?? 0);

  function changePendingPoint(target: AttrKey, delta: number) {
    setPendingPoints((current) => {
      const currentTotal = Object.values(current).reduce(
        (sum, value) => sum + Number(value || 0),
        0
      );
      const currentValue = Number(current[target] || 0);
      const nextValue = Math.max(0, currentValue + delta);
      if (delta > 0 && currentTotal >= Math.min(pointsAvailable, maxPoints)) {
        return current;
      }
      const next = { ...current, [target]: nextValue };
      if (!nextValue) delete next[target];
      return next;
    });
  }

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
    if (!selected || totalPendingPoints < 1) return;
    if (storeLocked) return;

    setSpending(true);
    setSpendErr(null);

    try {
      if (!hasEnoughPoints)
        throw new Error("Not enough XP to buy a point yet.");
      if (!withinWindow) throw new Error("Spending is limited right now.");
      if (!pin.trim()) throw new Error("Enter the Store PIN.");
      if (!confirmOk) throw new Error("Confirm your StudentID to purchase.");

      const purchases = (Object.entries(pendingPoints) as Array<[AttrKey, number]>)
        .filter(([, points]) => points > 0)
        .map(([target, points]) => ({ target, points }));
      const requestId = `xp:${selectedStudentId}:cart:${Date.now()}:${Math.random()
        .toString(16)
        .slice(2)}`;

      const res = await spendXp({
          studentId: selectedStudentId,
          pin: pin.trim(),
          purchases,
          openNonce: store?.openNonce ?? "",
          requestId,
      });

      if (res?.summary) {
        setSummary(res.summary as XpSummary);
        setServerAttrs((res.summary as XpSummary).attrs ?? null);
      } else {
        const nextSummary = await getXpSummary(selectedStudentId);
        setSummary(nextSummary);
        setServerAttrs(nextSummary.attrs ?? null);
      }

      setToast(`✅ Purchased ${totalPendingPoints} attribute upgrade${totalPendingPoints === 1 ? "" : "s"}. XP and attributes updated.`);
      setPendingPoints({});
      setLastPurchaseCount(totalPendingPoints);

      window.setTimeout(() => {
        setLastPurchaseCount(0);
        setToast(null);
      }, 2200);
    } catch (e) {
      setSpendErr(e instanceof Error ? e.message : "Spend failed");
    } finally {
      setSpending(false);
    }
  }

  const noHomerooms = !loading && homerooms.length === 0;
  const combinedErr = err;

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#05070d] text-zinc-100">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.08),transparent_28%),radial-gradient(circle_at_78%_16%,rgba(99,102,241,0.08),transparent_22%),radial-gradient(circle_at_22%_30%,rgba(168,85,247,0.06),transparent_20%),linear-gradient(180deg,#04060b_0%,#070a11_55%,#04060b_100%)]" />
        <div className="absolute left-1/2 top-[100px] h-[320px] w-[1100px] -translate-x-1/2 rounded-full bg-cyan-500/[0.04] blur-3xl" />
        <div className="absolute left-[15%] top-[360px] h-[260px] w-[260px] rounded-full bg-violet-500/[0.04] blur-3xl" />
        <div className="absolute right-[12%] top-[320px] h-[300px] w-[300px] rounded-full bg-sky-500/[0.03] blur-3xl" />
      </div>

      <AppTopBar
        title="Legend Store"
        activeView="store"
        onNavigate={(next) => {
          if (next === "dashboard") {
            onBack?.();
            return;
          }

          const routes: Record<string, string> = {
            dashboard: "/",
            store: "/store",
            cards: "/cards",
            battle: "/battle",
          };

          window.location.href = routes[next] || "/";
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
              liveHp={null}
              liveMaxHp={null}
              guildTheme={guildTheme}
            />

            <section
              className={`${shellCardBase} ${guildTheme.border} ${guildTheme.tintBg} px-4 py-4 sm:px-5 ${guildTheme.shellGlow}`}
            >
              {!selected && (
                <div className="rounded-[22px] border border-white/[0.04] bg-[linear-gradient(180deg,rgba(18,22,32,0.58),rgba(9,11,17,0.70))] px-5 py-10 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_10px_24px_rgba(0,0,0,0.22)]">
                  <div className="mx-auto max-w-xl">
                    <div className="text-[11px] uppercase tracking-[0.24em] text-white/42">
                      Awaiting Legend
                    </div>
                    <div className="mt-2 text-2xl font-semibold tracking-tight text-white">
                      Select a student to enter the store.
                    </div>
                    <p className="mt-2 text-sm leading-6 text-white/58">
                      Once a legend is selected, their XP, confirmation fields,
                      upgrade choices, and purchase preview will appear here.
                    </p>
                  </div>
                </div>
              )}

              {selected && (
                <div className="space-y-3 xl:space-y-5">
                  <StoreModeTabs
                    mode={storeMode}
                    setMode={setStoreMode}
                    xpBalance={summary?.balance ?? null}
                    spendablePoints={summary?.spendablePoints ?? null}
                    skillTokens={skillSummary?.skillTokens ?? null}
                  />

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
                    pendingCount={storeMode === "attributes" ? totalPendingPoints : 0}
                    guildTheme={guildTheme}
                  />

                  {storeMode === "attributes" && (
                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_360px] xl:gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
                      <AttributeGrid
                        xpPerPoint={xpPerPoint}
                        storeLocked={storeLocked}
                        pin={pin}
                        confirmOk={confirmOk}
                        hasEnoughPoints={hasEnoughPoints}
                        canSelectAttribute={canSelectAttribute}
                        withinWindow={withinWindow}
                        pendingPoints={pendingPoints}
                        onAdd={(target) => changePendingPoint(target, 1)}
                        onRemove={(target) => changePendingPoint(target, -1)}
                        displayAttr={displayAttr}
                        guildTheme={guildTheme}
                      />

                      <PurchaseReviewPanel
                        pendingPoints={pendingPoints}
                        displayAttr={displayAttr}
                        xpPerPoint={xpPerPoint}
                        summaryBalance={summary?.balance ?? null}
                        canConfirm={canConfirmPurchase}
                        spending={spending}
                        lastPurchaseCount={lastPurchaseCount}
                        onConfirm={() => {
                          void confirmSpend();
                        }}
                        guildTheme={guildTheme}
                      />
                    </div>
                  )}

                  {storeMode === "skills" && (
                    <SkillTrainingPanel
                      studentId={selectedStudentId}
                      selectedSkillId={pendingSkillId}
                      setSelectedSkillId={setPendingSkillId}
                      ownedSkillIds={ownedSkillIds}
                      storeLocked={storeLocked}
                      pin={pin}
                      confirmOk={confirmOk}
                      onSummaryChange={setSkillSummary}
                      guildTheme={guildTheme}
                    />
                  )}
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
