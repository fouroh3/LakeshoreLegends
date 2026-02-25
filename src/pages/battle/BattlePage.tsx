// src/pages/battle/BattlePage.tsx
import { useEffect, useMemo, useState, useCallback } from "react";
import type { Student, Guild } from "../../types";
import { loadStudents } from "../../data";
import { submitHpDelta } from "../../hpApi";
import { submitBossDelta } from "../../bossApi";

import { usePageActive } from "./hooks/usePageActive";
import { useBattleControl } from "./hooks/useBattleControl";
import { useHpState } from "./hooks/useHpState";
import { useBossState } from "./hooks/useBossState";
import { useGuildTotals } from "./hooks/useGuildTotals";

import { GROUP_ACTION_KEY, MAX_HP } from "./battleConstants";
import {
  fullName,
  makeSubmitNonce,
  normId,
  prettifyBossKey,
  skillsToArray,
  stripQuotes,
} from "./battleUtils";

import type { GroupAction } from "./battleTypes";

import BattleHeader from "./components/BattleHeader";
import BattleTopControls from "./components/BattleTopControls";
import StudentGrid from "./components/StudentGrid";
import RightRail from "./components/RightRail";

type Props = { onBack: () => void };

const BOSS_COOLDOWN_MS = 3000;

export default function BattlePage({ onBack }: Props) {
  const pageActive = usePageActive();

  const isTeacher = useMemo(() => {
    const sp = new URLSearchParams(window.location.search);
    return sp.get("teacher") === "1";
  }, []);

  const { battleRows, refreshOnce: refreshBattleControlOnce } =
    useBattleControl(pageActive, isTeacher);

  const { getDisplayHp, applyOptimisticHp, clearPending } =
    useHpState(pageActive);

  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [activeHomeroom, setActiveHomeroom] = useState("");
  const [activeSessionId, setActiveSessionId] = useState("");

  const [guildAttacks, setGuildAttacks] = useState<"OPEN" | "CLOSED">("CLOSED");
  const [bossKey, setBossKey] = useState("");
  const [bossInstanceId, setBossInstanceId] = useState("");

  const { boss, setBoss, bossErr, applyOptimisticBoss, clearBossPending } =
    useBossState(pageActive, bossKey, bossInstanceId);

  const [guildFilter, setGuildFilter] = useState<Guild | "ALL">("ALL");
  const [multiSelect, setMultiSelect] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [groupAction, setGroupAction] = useState<GroupAction>("HEAL");

  const [delta, setDelta] = useState(-1);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState<{
    type: "ok" | "err";
    msg: string;
  } | null>(null);

  const [bossNote, setBossNote] = useState("");
  const [bossDamage, setBossDamage] = useState("");
  const [bossSubmitting, setBossSubmitting] = useState(false);
  const [bossSubmitErr, setBossSubmitErr] = useState<string | null>(null);

  const [bossBanner, setBossBanner] = useState<{
    type: "ok" | "err";
    msg: string;
  } | null>(null);
  const [bossCooldownUntil, setBossCooldownUntil] = useState<number>(0);

  // ✅ Guild totals
  const { top: guildTotals, err: guildTotalsErr } = useGuildTotals(
    pageActive,
    activeSessionId
  );

  // students load once
  useEffect(() => {
    (async () => {
      try {
        const data = await loadStudents();
        setStudents(data);
      } catch (e: any) {
        setErr(e?.message || "Failed to load students.");
      } finally {
        setLoadingStudents(false);
      }
    })();
  }, []);

  // persist groupAction per homeroom
  useEffect(() => {
    if (!activeHomeroom) return;
    const stored = localStorage.getItem(
      `${GROUP_ACTION_KEY}:${activeHomeroom}`
    );
    if (stored === "ATTACK" || stored === "HEAL") setGroupAction(stored);
    else setGroupAction("HEAL");
  }, [activeHomeroom]);

  useEffect(() => {
    if (!activeHomeroom) return;
    localStorage.setItem(`${GROUP_ACTION_KEY}:${activeHomeroom}`, groupAction);
  }, [activeHomeroom, groupAction]);

  const activeOptions = useMemo(() => {
    return battleRows
      .filter((r) => String(r.status).toUpperCase() === "ACTIVE")
      .slice()
      .sort((a, b) =>
        a.homeroom.localeCompare(b.homeroom, "en", { numeric: true })
      );
  }, [battleRows]);

  useEffect(() => {
    const actives = activeOptions;
    if (actives.length === 0) {
      setActiveHomeroom("");
      setActiveSessionId("");
      return;
    }
    const keep = actives.find((r) => r.homeroom === activeHomeroom);
    const pick = keep ?? actives[0];
    setActiveHomeroom(pick.homeroom);
    setActiveSessionId(pick.sessionId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOptions.length]);

  const currentBattleRow = useMemo(
    () =>
      battleRows.find(
        (r) => r.homeroom === activeHomeroom && r.sessionId === activeSessionId
      ) ?? null,
    [battleRows, activeHomeroom, activeSessionId]
  );

  useEffect(() => {
    const ga =
      String(currentBattleRow?.guildAttacks ?? "").toUpperCase() === "OPEN"
        ? "OPEN"
        : "CLOSED";
    setGuildAttacks(ga);
    setBossKey(stripQuotes(currentBattleRow?.bossKey ?? "").trim());
    setBossInstanceId(
      stripQuotes(currentBattleRow?.bossInstanceId ?? "").trim() ||
        stripQuotes(currentBattleRow?.sessionId ?? "").trim()
    );
  }, [currentBattleRow]);

  const hasBossConfigured = Boolean(bossKey);
  const guildAttacksOpen = guildAttacks === "OPEN";
  const studentAttackMode = !isTeacher && groupAction === "ATTACK";
  const studentHealMode = !isTeacher && groupAction === "HEAL";
  const studentControlsDisabled = studentAttackMode;

  const studentsInActiveHomeroom = useMemo(() => {
    if (!activeHomeroom) return [];
    return students
      .filter((s) => (s.homeroom ?? "").trim() === activeHomeroom)
      .slice()
      .sort((a, b) => fullName(a).localeCompare(fullName(b)));
  }, [students, activeHomeroom]);

  const guildOptions = useMemo(() => {
    const set = new Set<Guild>();
    for (const s of studentsInActiveHomeroom)
      if ((s as any).guild) set.add((s as any).guild);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [studentsInActiveHomeroom]);

  const visibleStudents = useMemo(() => {
    if (guildFilter === "ALL") return studentsInActiveHomeroom;
    return studentsInActiveHomeroom.filter((s: any) => s.guild === guildFilter);
  }, [studentsInActiveHomeroom, guildFilter]);

  const toggleSelect = useCallback(
    (idRaw: string) => {
      const id = normId(idRaw);

      if (!multiSelect) {
        setSelectedIds([id]);
        return;
      }
      setSelectedIds((prev) => {
        const has = prev.some((x) => normId(x) === id);
        if (has) return prev.filter((x) => normId(x) !== id);
        return [...prev, id];
      });
    },
    [multiSelect]
  );

  useEffect(() => {
    const setVisible = new Set(visibleStudents.map((s) => normId(s.id)));
    setSelectedIds((prev) => prev.filter((id) => setVisible.has(normId(id))));
  }, [visibleStudents]);

  // reset minor UI on homeroom change
  useEffect(() => {
    setSelectedIds([]);
    setBanner(null);
    setNote("");
    setDelta(-1);

    setBossBanner(null);
    setBossSubmitErr(null);
    setBossDamage("");
    setBossNote("");
    setBossCooldownUntil(0);
  }, [activeHomeroom]);

  const selectedStudents = useMemo(() => {
    if (selectedIds.length === 0) return [];
    const set = new Set(selectedIds.map(normId));
    return studentsInActiveHomeroom.filter((s) => set.has(normId(s.id)));
  }, [studentsInActiveHomeroom, selectedIds]);

  const selectedSkills = useMemo(() => {
    if (selectedStudents.length !== 1) return [];
    return skillsToArray(selectedStudents[0].skills);
  }, [selectedStudents]);

  const onSubmit = useCallback(async () => {
    if (submitting) return;
    setBanner(null);

    if (!activeHomeroom || !activeSessionId) {
      setBanner({ type: "err", msg: "Pick an ACTIVE homeroom." });
      return;
    }
    if (studentAttackMode) {
      setBanner({
        type: "err",
        msg: "Group Action is ATTACK. Student heal/damage is disabled.",
      });
      return;
    }
    if (selectedIds.length === 0) {
      setBanner({ type: "err", msg: "Select at least 1 student." });
      return;
    }
    if (!Number.isFinite(delta) || delta === 0) {
      setBanner({ type: "err", msg: "Pick a damage/heal amount." });
      return;
    }

    setSubmitting(true);

    let ok = 0;
    let fail = 0;

    const cleanSessionId = stripQuotes(activeSessionId).trim();
    const submitNonce = makeSubmitNonce();

    try {
      for (const idRaw of selectedIds) {
        const id = normId(idRaw);
        const hp = getDisplayHp(id);

        const before = hp.currentHP;
        const base = Math.min(MAX_HP, Math.max(1, hp.baseHP || MAX_HP));
        const after = Math.max(0, Math.min(base, before + delta));

        applyOptimisticHp(id, {
          studentId: id,
          baseHP: base,
          currentHP: after,
        });

        try {
          const requestId = `${cleanSessionId}:${id}:${submitNonce}`;
          await submitHpDelta({
            studentId: id,
            delta,
            note: note.trim(),
            sessionId: cleanSessionId,
            requestId,
          });
          ok++;
        } catch {
          clearPending(id);
          applyOptimisticHp(id, {
            studentId: id,
            baseHP: base,
            currentHP: before,
          });
          fail++;
        }
      }

      setBanner(
        fail === 0
          ? {
              type: "ok",
              msg: `Submitted ✅ (${ok} target${ok === 1 ? "" : "s"})`,
            }
          : { type: "err", msg: `Partial: ${ok} ok, ${fail} failed.` }
      );
      setSelectedIds([]);
    } finally {
      setNote("");
      setSubmitting(false);
    }
  }, [
    submitting,
    activeHomeroom,
    activeSessionId,
    studentAttackMode,
    selectedIds,
    delta,
    getDisplayHp,
    applyOptimisticHp,
    clearPending,
    note,
  ]);

  const onSubmitBossAttack = useCallback(async () => {
    setBossBanner(null);

    const now = Date.now();
    if (now < bossCooldownUntil) {
      setBossBanner({ type: "err", msg: "Hold up… attack already submitted." });
      return;
    }

    if (!bossKey || !bossInstanceId) {
      setBossSubmitErr(
        "No boss configured for this battle yet. Set BossKey in Battle_Control …"
      );
      return;
    }
    if (bossSubmitting) return;

    const parsedDamage = Number.parseInt(bossDamage, 10);
    if (!Number.isFinite(parsedDamage) || parsedDamage <= 0) {
      setBossSubmitErr("Enter a valid Guild Total Attack amount.");
      return;
    }
    if (studentHealMode) {
      setBossSubmitErr(
        "Group Action is HEAL. Switch to ATTACK to damage the boss."
      );
      return;
    }

    if (!isTeacher && studentAttackMode && !guildAttacksOpen) {
      try {
        const fresh = await refreshBattleControlOnce();
        const row =
          fresh.find(
            (r) =>
              r.homeroom === activeHomeroom && r.sessionId === activeSessionId
          ) ?? currentBattleRow;
        const reopened =
          String(row?.guildAttacks ?? "").toUpperCase() === "OPEN";
        if (!reopened) {
          setBossSubmitErr("Guild attacks are CLOSED");
          return;
        }
      } catch {
        setBossSubmitErr("Guild attacks are CLOSED");
        return;
      }
    }

    if (!boss) {
      setBossSubmitErr("Boss state is still loading. Please try again.");
      return;
    }

    setBossSubmitting(true);
    setBossSubmitErr(null);

    const deltaValue = -Math.abs(parsedDamage);
    const optimisticHP = Math.max(
      0,
      Math.min(boss.maxHP, boss.currentHP + deltaValue)
    );

    applyOptimisticBoss(boss.bossInstanceId, optimisticHP, boss.maxHP);
    setBoss({ ...boss, currentHP: optimisticHP });

    try {
      await submitBossDelta({
        bossInstanceId: boss.bossInstanceId,
        bossKey: boss.bossKey,
        delta: deltaValue,
        source: bossNote.trim(),
        requestId: `${activeSessionId}:${
          boss.bossInstanceId
        }:${makeSubmitNonce()}`,
      });

      setBossBanner({ type: "ok", msg: "Boss hit submitted ✅" });
      setBossCooldownUntil(Date.now() + BOSS_COOLDOWN_MS);

      setBossNote("");
      setBossDamage("");
    } catch {
      clearBossPending(boss.bossInstanceId);
      setBossSubmitErr("Boss submit failed. Please try again.");
      setBossBanner({ type: "err", msg: "Boss submit failed." });
    } finally {
      setBossSubmitting(false);
    }
  }, [
    bossCooldownUntil,
    bossKey,
    bossInstanceId,
    bossSubmitting,
    bossDamage,
    studentHealMode,
    isTeacher,
    studentAttackMode,
    guildAttacksOpen,
    refreshBattleControlOnce,
    activeHomeroom,
    activeSessionId,
    currentBattleRow,
    boss,
    bossNote,
    setBoss,
    applyOptimisticBoss,
    clearBossPending,
  ]);

  const bossName = boss?.bossName?.trim() || prettifyBossKey(bossKey || "Boss");

  return (
    <div className="w-full h-[100dvh] overflow-hidden">
      <div className="h-[100dvh] flex flex-col overflow-hidden">
        <BattleHeader onBack={onBack} />

        <div className="flex-1 min-h-0 overflow-auto">
          <div className="w-full max-w-none px-3 sm:px-4 lg:px-6 py-2">
            {err && (
              <div className="mb-2 rounded-xl border border-red-900/50 bg-red-950/40 px-3 py-2 text-red-200 text-sm">
                {err}
              </div>
            )}

            <BattleTopControls
              isTeacher={isTeacher}
              activeOptions={activeOptions}
              activeHomeroom={activeHomeroom}
              setActiveHomeroom={(hr) => {
                const row = activeOptions.find((r) => r.homeroom === hr);
                setActiveHomeroom(hr);
                setActiveSessionId(row?.sessionId ?? "");
              }}
              guildFilter={guildFilter}
              setGuildFilter={setGuildFilter}
              guildOptions={guildOptions}
              selectedCount={selectedIds.length}
              multiSelect={multiSelect}
              setMultiSelect={setMultiSelect}
              clearSelection={() => setSelectedIds([])}
              // ✅ REMOVED: groupAction + setGroupAction (now RightRail only)
            />

            <div className="mt-2 rounded-2xl border border-zinc-900/60 bg-zinc-950/15 p-2">
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-2">
                <StudentGrid
                  activeHomeroom={activeHomeroom}
                  guildFilter={guildFilter}
                  students={visibleStudents}
                  selectedIds={selectedIds}
                  toggleSelect={toggleSelect}
                  getDisplayHp={getDisplayHp}
                />

                <RightRail
                  hasBossConfigured={hasBossConfigured}
                  bossName={bossName}
                  boss={boss}
                  bossErr={bossErr}
                  bossSubmitting={bossSubmitting}
                  bossDamage={bossDamage}
                  setBossDamage={setBossDamage}
                  bossNote={bossNote}
                  setBossNote={setBossNote}
                  onSubmitBossAttack={onSubmitBossAttack}
                  bossSubmitErr={bossSubmitErr}
                  bossBanner={bossBanner}
                  bossCooldownUntil={bossCooldownUntil}
                  studentHealMode={studentHealMode}
                  studentAttackMode={studentAttackMode}
                  guildAttacksOpen={guildAttacksOpen}
                  isTeacher={isTeacher}
                  selectedCount={selectedIds.length}
                  studentControlsDisabled={studentControlsDisabled}
                  delta={delta}
                  setDelta={setDelta}
                  note={note}
                  setNote={setNote}
                  selectedStudents={selectedStudents}
                  selectedSkills={selectedSkills}
                  submitting={submitting}
                  onSubmit={onSubmit}
                  banner={banner}
                  groupAction={groupAction}
                  setGroupAction={setGroupAction}
                  guildTotals={guildTotals}
                  guildTotalsErr={guildTotalsErr}
                />
              </div>
            </div>

            {!loadingStudents && !err && students.length === 0 && (
              <div className="mt-2 text-xs text-zinc-500">
                No students loaded.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
