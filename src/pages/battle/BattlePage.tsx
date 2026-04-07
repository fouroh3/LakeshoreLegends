// src/pages/battle/BattlePage.tsx

import { useEffect, useMemo, useState, useCallback } from "react";
import AppTopBar from "../../components/AppTopBar";
import CharacterProfileModal from "../../components/CharacterProfileModal";
import type { Student, Guild } from "../../types";
import { loadStudents } from "../../data";
import { submitBossDelta } from "../../bossApi";

import { usePageActive } from "./hooks/usePageActive";
import { useBattleControl } from "./hooks/useBattleControl";
import { useHpState } from "./hooks/useHpState";
import { useBossState } from "./hooks/useBossState";

import { HP_API_URL, GROUP_ACTION_KEY, MAX_HP } from "./battleConstants";
import {
  fullName,
  makeSubmitNonce,
  normId,
  skillsToArray,
  stripQuotes,
} from "./battleUtils";

import type { GroupAction } from "./battleTypes";

import BattleTopControls from "./components/BattleTopControls";
import StudentGrid from "./components/BattleStudentGrid";
import RightRail from "./components/RightRail";

type Props = { onBack: () => void };

const BOSS_COOLDOWN_MS = 3000;

function normalizeGuildKey(v: string) {
  return String(v || "")
    .trim()
    .toUpperCase();
}

function makeBossAttackLockKey(args: {
  bossInstanceId: string;
  round: number;
  guild: string;
}) {
  return [
    String(args.bossInstanceId || "").trim(),
    String(args.round || 0).trim(),
    normalizeGuildKey(args.guild),
  ].join("::");
}
async function submitHpBatch(args: {
  sessionId: string;
  note?: string;
  requestId: string;
  entries: Array<{ studentId: string; delta: number; note?: string }>;
}) {
  const res = await fetch(HP_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: "logbatch",
      sessionId: args.sessionId,
      note: args.note ?? "",
      requestId: args.requestId,
      entries: args.entries,
    }),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || `HP batch submit failed: ${res.status}`);
  }

  return data as {
    ok: true;
    count: number;
    results: Array<{
      studentId: string;
      baseHP: number;
      before: number;
      after: number;
      delta: number;
    }>;
  };
}

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
  const [profileStudent, setProfileStudent] = useState<Student | null>(null);

  const [activeHomeroom, setActiveHomeroom] = useState("");
  const [activeSessionId, setActiveSessionId] = useState("");

  const [guildAttacks, setGuildAttacks] = useState<"OPEN" | "CLOSED">("CLOSED");
  const [bossInstanceId, setBossInstanceId] = useState("");

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

  const [bossAttackLocks, setBossAttackLocks] = useState<Record<string, true>>(
    {}
  );

  const activeOptions = useMemo(() => {
    return battleRows
      .filter((r: any) => String(r.status).toUpperCase() === "ACTIVE")
      .slice()
      .sort((a: any, b: any) =>
        String(a.homeroom).localeCompare(String(b.homeroom), "en", {
          numeric: true,
        })
      );
  }, [battleRows]);

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

  useEffect(() => {
    if (!activeHomeroom) return;
    const stored = localStorage.getItem(
      `${GROUP_ACTION_KEY}:${activeHomeroom}`
    );
    if (stored === "ATTACK" || stored === "HEAL") {
      setGroupAction(stored);
    } else {
      setGroupAction("HEAL");
    }
  }, [activeHomeroom]);

  useEffect(() => {
    if (!activeHomeroom) return;
    localStorage.setItem(`${GROUP_ACTION_KEY}:${activeHomeroom}`, groupAction);
  }, [activeHomeroom, groupAction]);

  useEffect(() => {
    if (activeOptions.length === 0) {
      setActiveHomeroom("");
      setActiveSessionId("");
      return;
    }

    const keep = activeOptions.find((r: any) => r.homeroom === activeHomeroom);
    const pick = keep ?? activeOptions[0];

    if (pick.homeroom !== activeHomeroom) setActiveHomeroom(pick.homeroom);
    if ((pick as any).activeBattleSessionId !== activeSessionId) {
      setActiveSessionId((pick as any).activeBattleSessionId ?? "");
    }
  }, [activeOptions, activeHomeroom, activeSessionId]);

  const currentBattleRow = useMemo(
    () =>
      battleRows.find(
        (r: any) =>
          r.homeroom === activeHomeroom &&
          r.activeBattleSessionId === activeSessionId
      ) ?? null,
    [battleRows, activeHomeroom, activeSessionId]
  );

  const currentBossKey = useMemo(() => {
    return String((currentBattleRow as any)?.bossKey ?? "").trim();
  }, [currentBattleRow]);

  const currentQuestName = useMemo(() => {
    return String((currentBattleRow as any)?.quest ?? "").trim();
  }, [currentBattleRow]);

  useEffect(() => {
    const turn = String((currentBattleRow as any)?.turn ?? "").toUpperCase();
    const ga = turn === "GUILD" ? "OPEN" : "CLOSED";
    setGuildAttacks(ga);

    const instanceId = stripQuotes(
      (currentBattleRow as any)?.bossInstanceId ?? ""
    ).trim();

    setBossInstanceId(instanceId);
  }, [currentBattleRow]);

  const { boss, setBoss, bossErr, applyOptimisticBoss, clearBossPending } =
    useBossState(pageActive, currentBossKey, bossInstanceId);

  const activeRound = useMemo(() => {
    const n = Number((currentBattleRow as any)?.round ?? 1);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
  }, [currentBattleRow]);

  const activeGuild = useMemo(() => {
    if (guildFilter !== "ALL") return String(guildFilter);

    if (selectedIds.length > 0) {
      const selected = studentsInActiveHomeroomFrom(
        students,
        activeHomeroom,
        selectedIds
      );
      const guilds = Array.from(
        new Set(
          selected.map((s: any) => String(s.guild || "").trim()).filter(Boolean)
        )
      );
      if (guilds.length === 1) return guilds[0];
    }

    return "";
  }, [guildFilter, selectedIds, students, activeHomeroom]);

  const hasBossConfigured = Boolean(bossInstanceId);
  const guildAttacksOpen = guildAttacks === "OPEN";
  const studentAttackMode = !isTeacher && groupAction === "ATTACK";
  const studentHealMode = !isTeacher && groupAction === "HEAL";
  const studentControlsDisabled = studentAttackMode;

  useEffect(() => {
    setBossAttackLocks({});
  }, [bossInstanceId, activeRound, activeSessionId]);

  const studentsInActiveHomeroom = useMemo(() => {
    if (!activeHomeroom) return [];
    return students
      .filter((s) => (s.homeroom ?? "").trim() === activeHomeroom)
      .slice()
      .sort((a, b) => fullName(a).localeCompare(fullName(b)));
  }, [students, activeHomeroom]);

  const guildOptions = useMemo(() => {
    const set = new Set<Guild>();
    for (const s of studentsInActiveHomeroom) {
      if ((s as any).guild) set.add((s as any).guild);
    }
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
    setProfileStudent(null);
  }, [activeHomeroom]);

  const selectedStudents = useMemo(() => {
    if (selectedIds.length === 0) return [];
    const selected = new Set(selectedIds.map(normId));
    return studentsInActiveHomeroom.filter((s) => selected.has(normId(s.id)));
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

    // ✅ LIMIT GUARD
    if (selectedIds.length > 15) {
      setBanner({
        type: "err",
        msg: "Max 15 targets at once — split into 2 submissions.",
      });
      return;
    }

    if (!Number.isFinite(delta) || delta === 0) {
      setBanner({ type: "err", msg: "Pick a damage/heal amount." });
      return;
    }

    setSubmitting(true);

    const cleanSessionId = stripQuotes(activeSessionId).trim();
    const submitNonce = makeSubmitNonce();

    const snapshot = selectedIds.map((idRaw) => {
      const id = normId(idRaw);
      const hp = getDisplayHp(id);
      const before = hp.currentHP;
      const base = Math.min(MAX_HP, Math.max(1, hp.baseHP || MAX_HP));
      const after = Math.max(0, Math.min(base, before + delta));

      return {
        studentId: id,
        before,
        baseHP: base,
        after,
      };
    });

    try {
      // optimistic update
      for (const row of snapshot) {
        applyOptimisticHp(row.studentId, {
          studentId: row.studentId,
          baseHP: row.baseHP,
          currentHP: row.after,
        });
      }

      await submitHpBatch({
        sessionId: cleanSessionId,
        note: note.trim(),
        requestId: `${cleanSessionId}:batch:${submitNonce}`,
        entries: snapshot.map((row) => ({
          studentId: row.studentId,
          delta,
          note: note.trim(),
        })),
      });

      setBanner({
        type: "ok",
        msg: `Submitted ✅ (${snapshot.length} target${
          snapshot.length === 1 ? "" : "s"
        })`,
      });

      setSelectedIds([]);
      setNote("");
    } catch (e: any) {
      // rollback
      for (const row of snapshot) {
        clearPending(row.studentId);
        applyOptimisticHp(row.studentId, {
          studentId: row.studentId,
          baseHP: row.baseHP,
          currentHP: row.before,
        });
      }

      setBanner({
        type: "err",
        msg: e?.message || "Submit failed.",
      });
    } finally {
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

  const onSubmitBossAttack = useCallback(
    async ({ round, guild }: { round: number; guild: string }) => {
      setBossBanner(null);
      setBossSubmitErr(null);

      const cleanGuild = String(guild || "").trim();
      if (!cleanGuild) {
        setBossSubmitErr("Missing guild.");
        return;
      }

      const localKey = makeBossAttackLockKey({
        bossInstanceId,
        round,
        guild: cleanGuild,
      });

      if (bossAttackLocks[localKey]) {
        const msg = "This guild already attacked this round.";
        setBossSubmitErr(msg);
        setBossBanner({ type: "err", msg });
        return;
      }

      const now = Date.now();
      if (now < bossCooldownUntil) {
        setBossBanner({
          type: "err",
          msg: "Hold up… attack already submitted.",
        });
        return;
      }

      if (!bossInstanceId) {
        setBossSubmitErr("No boss configured for this battle yet.");
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

      if (!round || round <= 0) {
        setBossSubmitErr("Missing round.");
        return;
      }

      if (!isTeacher && studentAttackMode && !guildAttacksOpen) {
        try {
          const fresh = await refreshBattleControlOnce();
          const row =
            fresh.find(
              (r: any) =>
                r.homeroom === activeHomeroom &&
                r.activeBattleSessionId === activeSessionId
            ) ?? currentBattleRow;

          const reopened =
            String((row as any)?.turn ?? "").toUpperCase() === "GUILD";

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

      setBossAttackLocks((prev) => ({
        ...prev,
        [localKey]: true,
      }));

      setBossSubmitting(true);

      const previousHP = boss.currentHP;
      const deltaValue = -Math.abs(parsedDamage);
      const optimisticHP = Math.max(
        0,
        Math.min(boss.maxHP, boss.currentHP + deltaValue)
      );

      applyOptimisticBoss(boss.bossInstanceId, optimisticHP, boss.maxHP);
      setBoss((prev) => (prev ? { ...prev, currentHP: optimisticHP } : prev));

      try {
        const result = await submitBossDelta({
          bossInstanceId: boss.bossInstanceId,
          bossKey: boss.bossKey || currentBossKey,
          delta: deltaValue,
          source: bossNote.trim(),
          requestId: `${activeSessionId}:${
            boss.bossInstanceId
          }:${makeSubmitNonce()}`,
          round,
          guild: cleanGuild,
          homeroom: activeHomeroom,
          actionType: "ATTACK",
        });

        if ((result as any)?.deduped) {
          clearBossPending(boss.bossInstanceId);
          setBoss((prev) => (prev ? { ...prev, currentHP: previousHP } : prev));
          setBossSubmitErr(
            (result as any)?.reason || "This guild already attacked this round."
          );
          setBossBanner({
            type: "err",
            msg:
              (result as any)?.reason ||
              "This guild already attacked this round.",
          });
          return;
        }

        setBoss((prev) =>
          prev
            ? {
                ...prev,
                currentHP:
                  typeof (result as any)?.currentHP === "number"
                    ? (result as any).currentHP
                    : optimisticHP,
              }
            : prev
        );

        setBossBanner({ type: "ok", msg: "Boss hit submitted ✅" });
        setBossCooldownUntil(Date.now() + BOSS_COOLDOWN_MS);
        setBossNote("");
        setBossDamage("");
      } catch {
        clearBossPending(boss.bossInstanceId);
        setBoss((prev) => (prev ? { ...prev, currentHP: previousHP } : prev));

        setBossAttackLocks((prev) => {
          const next = { ...prev };
          delete next[localKey];
          return next;
        });

        setBossSubmitErr("Boss submit failed. Please try again.");
        setBossBanner({ type: "err", msg: "Boss submit failed." });
      } finally {
        setBossSubmitting(false);
      }
    },
    [
      bossCooldownUntil,
      bossInstanceId,
      bossAttackLocks,
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
      currentBossKey,
      setBoss,
      applyOptimisticBoss,
      clearBossPending,
    ]
  );

  const bossName =
    boss?.bossName?.trim() || currentQuestName || currentBossKey || "Boss";

  return (
    <div className="w-full min-h-[100dvh] overflow-hidden bg-[#05070d] text-zinc-100">
      <AppTopBar
        title="Battle Mode"
        activeView="battle"
        onNavigate={(next) => {
          if (next === "dashboard") {
            onBack();
            return;
          }

          const url = new URL(window.location.href);
          url.searchParams.set("view", next);
          window.location.href = url.toString();
        }}
      />

      <div className="min-h-[100dvh] flex flex-col">
        <div className="flex-1 overflow-auto">
          <div className="mx-auto w-full max-w-none px-3 py-2 sm:px-4 lg:px-6">
            {err && (
              <div className="mb-2 rounded-xl border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-200">
                {err}
              </div>
            )}

            <BattleTopControls
              isTeacher={isTeacher}
              activeOptions={activeOptions}
              activeHomeroom={activeHomeroom}
              setActiveHomeroom={(hr) => {
                const row = activeOptions.find((r: any) => r.homeroom === hr);
                setActiveHomeroom(hr);
                setActiveSessionId((row as any)?.activeBattleSessionId ?? "");
              }}
              guildFilter={guildFilter}
              setGuildFilter={setGuildFilter}
              guildOptions={guildOptions}
              selectedCount={selectedIds.length}
              multiSelect={multiSelect}
              setMultiSelect={setMultiSelect}
              clearSelection={() => setSelectedIds([])}
            />

            <div className="mt-2 rounded-2xl border border-zinc-900/60 bg-zinc-950/15 p-2">
              <div className="grid grid-cols-1 gap-2 lg:grid-cols-[minmax(0,1fr)_360px]">
                <StudentGrid
                  activeHomeroom={activeHomeroom}
                  guildFilter={guildFilter}
                  students={visibleStudents}
                  selectedIds={selectedIds}
                  toggleSelect={toggleSelect}
                  getDisplayHp={getDisplayHp}
                  onOpenProfile={(student: Student) =>
                    setProfileStudent(student)
                  }
                />

                <RightRail
                  hasBossConfigured={hasBossConfigured}
                  bossName={bossName}
                  bossKey={currentBossKey}
                  questName={currentQuestName}
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
                  activeRound={activeRound}
                  activeGuild={activeGuild}
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

      <CharacterProfileModal
        person={profileStudent}
        open={Boolean(profileStudent)}
        onClose={() => setProfileStudent(null)}
        allStudents={students}
      />
    </div>
  );
}

function studentsInActiveHomeroomFrom(
  students: Student[],
  activeHomeroom: string,
  selectedIds: string[]
) {
  const selected = new Set(selectedIds.map(normId));
  return students.filter(
    (s) =>
      (s.homeroom ?? "").trim() === activeHomeroom && selected.has(normId(s.id))
  );
}
