// src/pages/admin/components/AbilitiesManagerPanel.tsx

import { useEffect, useMemo, useState } from "react";
import type { Student } from "../../../types";
import { skillLibrary } from "../../../data/skillLibrary";
import {
  adminPurchasedSkillsSnapshot,
  type AdminAbilitySnapshotResult,
  type AdminAbilityUpdateResult,
  type AdminSkillAdjustmentResult,
} from "../adminApi";
import type {
  AdminAttributeKey,
  AdminAttributeValues,
  AdminSkillMode,
} from "../adminConstants";
import {
  clean,
  fullName,
  normId,
  studentSort,
} from "../adminRosterUtils";

const ATTRIBUTE_META: Array<{
  key: AdminAttributeKey;
  label: string;
  short: string;
}> = [
  { key: "str", label: "Strength", short: "STR" },
  { key: "dex", label: "Dexterity", short: "DEX" },
  { key: "con", label: "Constitution", short: "CON" },
  { key: "int", label: "Intelligence", short: "INT" },
  { key: "wis", label: "Wisdom", short: "WIS" },
  { key: "cha", label: "Charisma", short: "CHA" },
];

const EMPTY_ATTRIBUTES: AdminAttributeValues = {
  str: 0,
  dex: 0,
  con: 0,
  int: 0,
  wis: 0,
  cha: 0,
};

function FieldLabel({ children }: { children: string }) {
  return (
    <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
      {children}
    </label>
  );
}

function normalizeAttributes(
  raw: Partial<AdminAttributeValues> | undefined
): AdminAttributeValues {
  return {
    str: Number(raw?.str ?? 0),
    dex: Number(raw?.dex ?? 0),
    con: Number(raw?.con ?? 0),
    int: Number(raw?.int ?? 0),
    wis: Number(raw?.wis ?? 0),
    cha: Number(raw?.cha ?? 0),
  };
}

function normalizeSkills(values: string[] | undefined) {
  const seen = new Set<string>();

  return (Array.isArray(values) ? values : [])
    .map((value) => String(value || "").trim())
    .filter((value) => {
      const key = value.toLowerCase();
      if (!value || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.localeCompare(b));
}

type Props = {
  students: Student[];
  busy: boolean;
  onSave: (args: {
    studentId: string;
    baseAttributes: AdminAttributeValues;
    bonusAttributes: AdminAttributeValues;
    rosterSkills: string[];
    reason: string;
  }) => Promise<AdminAbilityUpdateResult>;
  onAdjustSkill: (args: {
    studentId: string;
    mode: AdminSkillMode;
    skillName: string;
    reason: string;
  }) => Promise<AdminSkillAdjustmentResult>;
};

export default function AbilitiesManagerPanel({
  students,
  busy,
  onSave,
  onAdjustSkill,
}: Props) {
  const [homeroomFilter, setHomeroomFilter] = useState("ALL");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [snapshot, setSnapshot] = useState<AdminAbilitySnapshotResult | null>(
    null
  );
  const [purchasedSkillsById, setPurchasedSkillsById] = useState<Record<string, string[]>>({});
  const [baseAttributes, setBaseAttributes] =
    useState<AdminAttributeValues>(EMPTY_ATTRIBUTES);
  const [bonusAttributes, setBonusAttributes] =
    useState<AdminAttributeValues>(EMPTY_ATTRIBUTES);
  const [rosterSkills, setRosterSkills] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const [grantSkill, setGrantSkill] = useState("");
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [error, setError] = useState("");

  const homerooms = useMemo(() => {
    const set = new Set<string>();
    students.forEach((student) => {
      const homeroom = clean(student.homeroom);
      if (homeroom) set.add(homeroom);
    });

    return Array.from(set).sort((a, b) =>
      a.localeCompare(b, "en", { numeric: true })
    );
  }, [students]);

  const visibleStudents = useMemo(() => {
    const q = query.trim().toLowerCase();

    return students
      .filter(
        (student) =>
          homeroomFilter === "ALL" ||
          clean(student.homeroom) === homeroomFilter
      )
      .filter((student) => {
        if (!q) return true;

        return (
          fullName(student).toLowerCase().includes(q) ||
          normId(student.id).toLowerCase().includes(q) ||
          clean(student.guild).toLowerCase().includes(q)
        );
      })
      .slice()
      .sort(studentSort);
  }, [students, homeroomFilter, query]);

  const selectedStudent = useMemo(
    () => students.find((student) => normId(student.id) === normId(selectedId)),
    [students, selectedId]
  );

  const applySnapshot = (next: AdminAbilitySnapshotResult) => {
    setSnapshot(next);
    setBaseAttributes(normalizeAttributes(next.baseAttributes));
    setBonusAttributes(normalizeAttributes(next.bonusAttributes));
    setRosterSkills(normalizeSkills(next.rosterSkills));
    setGrantSkill("");
  };

  const snapshotFromStudent = (student: Student): AdminAbilitySnapshotResult => {
    const studentId = normId(student.id);
    const base = student.baseAttributes
      ? normalizeAttributes(student.baseAttributes)
      : {
          str: Number(student.str || 0),
          dex: Number(student.dex || 0),
          con: Number(student.con || 0),
          int: Number(student.int || 0),
          wis: Number(student.wis || 0),
          cha: Number(student.cha || 0),
        };
    const bonus = student.bonusAttributes
      ? normalizeAttributes(student.bonusAttributes)
      : { ...EMPTY_ATTRIBUTES };
    const roster = Array.isArray(student.skills)
      ? student.skills
      : String(student.skills || "")
          .split(/[;,|]/g)
          .map((value) => value.trim())
          .filter(Boolean);

    return {
      ok: true,
      studentId,
      studentName: fullName(student),
      baseAttributes: base,
      bonusAttributes: bonus,
      rosterSkills: normalizeSkills(roster),
      purchasedSkills: normalizeSkills(purchasedSkillsById[studentId]),
    };
  };

  const selectStudent = (student: Student) => {
    const studentId = normId(student.id);
    setSelectedId(studentId);
    setError("");
    applySnapshot(snapshotFromStudent(student));
  };

  const loadPurchasedSkills = async () => {
    setSkillsLoading(true);

    try {
      const result = await adminPurchasedSkillsSnapshot();
      const next: Record<string, string[]> = {};

      (result.purchasedSkills || []).forEach((row) => {
        const studentId = normId(row.studentId);
        if (studentId) next[studentId] = normalizeSkills(row.skills);
      });

      setPurchasedSkillsById(next);
      setSnapshot((current) =>
        current
          ? {
              ...current,
              purchasedSkills: normalizeSkills(next[normId(current.studentId)]),
            }
          : current
      );
    } catch (err: any) {
      setError(err?.message || "Could not refresh purchased/granted skills.");
    } finally {
      setSkillsLoading(false);
    }
  };

  useEffect(() => {
    void loadPurchasedSkills();
  }, []);

  const purchasedSkills = normalizeSkills(snapshot?.purchasedSkills);
  const effectiveSkillKeys = new Set(
    [...rosterSkills, ...purchasedSkills].map((skill) => skill.toLowerCase())
  );
  const availableGrantSkills = skillLibrary.filter(
    (skill) => !effectiveSkillKeys.has(skill.name.toLowerCase())
  );

  const toggleRosterSkill = (skillName: string) => {
    setRosterSkills((prev) => {
      const exists = prev.some(
        (skill) => skill.toLowerCase() === skillName.toLowerCase()
      );

      if (exists) {
        return prev.filter(
          (skill) => skill.toLowerCase() !== skillName.toLowerCase()
        );
      }

      return [...prev, skillName].sort((a, b) => a.localeCompare(b));
    });
  };

  const setAttribute = (
    group: "base" | "bonus",
    key: AdminAttributeKey,
    value: string
  ) => {
    const parsed = Math.max(-99, Math.min(99, Math.round(Number(value) || 0)));

    if (group === "base") {
      setBaseAttributes((prev) => ({ ...prev, [key]: parsed }));
    } else {
      setBonusAttributes((prev) => ({ ...prev, [key]: parsed }));
    }
  };

  const handleSave = async () => {
    if (!selectedId || !reason.trim()) return;

    const confirmed = window.confirm(
      `Save attributes and roster skills for ${
        selectedStudent ? fullName(selectedStudent) : selectedId
      }?`
    );
    if (!confirmed) return;

    try {
      const result = await onSave({
        studentId: selectedId,
        baseAttributes,
        bonusAttributes,
        rosterSkills,
        reason: reason.trim(),
      });
      applySnapshot(result);
      setPurchasedSkillsById((prev) => ({
        ...prev,
        [normId(result.studentId)]: normalizeSkills(result.purchasedSkills),
      }));
      setReason("");
    } catch {
      // Parent displays the write failure; keep edits for retry.
    }
  };

  const handleSkillAdjustment = async (
    mode: AdminSkillMode,
    skillName: string
  ) => {
    if (!selectedId || !skillName || !reason.trim()) return;

    const confirmed = window.confirm(
      `${mode === "GRANT" ? "Grant" : "Revoke"} ${skillName} ${
        mode === "GRANT" ? "to" : "from"
      } ${selectedStudent ? fullName(selectedStudent) : selectedId}?`
    );
    if (!confirmed) return;

    try {
      const result = await onAdjustSkill({
        studentId: selectedId,
        mode,
        skillName,
        reason: reason.trim(),
      });
      applySnapshot(result);
      setPurchasedSkillsById((prev) => ({
        ...prev,
        [normId(result.studentId)]: normalizeSkills(result.purchasedSkills),
      }));
      setReason("");
    } catch {
      // Parent displays the write failure.
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
        <div>
          <FieldLabel>Homeroom</FieldLabel>
          <select
            value={homeroomFilter}
            onChange={(event) => {
              setHomeroomFilter(event.target.value);
              setSelectedId("");
              setSnapshot(null);
            }}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none"
          >
            <option value="ALL">All Homerooms</option>
            {homerooms.map((homeroom) => (
              <option key={homeroom} value={homeroom}>
                {homeroom}
              </option>
            ))}
          </select>
        </div>

        <div>
          <FieldLabel>Search</FieldLabel>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name, student ID, or guild"
            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none placeholder:text-zinc-600"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-[24px] border border-white/10 bg-black/25">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
          <div>
            <div className="text-sm font-black text-white">Students</div>
            <div className="mt-0.5 text-xs text-zinc-500">
              Click a student to edit attributes and skills.
            </div>
          </div>
          <div className="flex items-center gap-2">
            {skillsLoading && (
              <div className="text-[11px] font-semibold text-zinc-500">Syncing granted skills…</div>
            )}
            <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-cyan-100/80">
              {visibleStudents.length} shown
            </div>
          </div>
        </div>

        <div className="max-h-[320px] overflow-auto">
          {visibleStudents.map((student) => {
            const studentId = normId(student.id);
            const selected = studentId === normId(selectedId);

            return (
              <button
                key={studentId}
                type="button"
                onClick={() => selectStudent(student)}
                className={[
                  "grid w-full grid-cols-[minmax(0,1fr)_100px_130px] items-center gap-3 border-t border-white/5 px-4 py-3 text-left transition first:border-t-0",
                  selected
                    ? "bg-cyan-300/[0.09] text-white"
                    : "hover:bg-white/[0.035]",
                ].join(" ")}
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-white">
                    {fullName(student) || "Unnamed Legend"}
                  </div>
                  <div className="mt-0.5 truncate font-mono text-[11px] text-cyan-100/60">
                    {studentId}
                  </div>
                </div>
                <div className="text-sm text-zinc-400">
                  {clean(student.homeroom) || "—"}
                </div>
                <div className="truncate text-sm text-zinc-400">
                  {clean(student.guild) || "Unassigned"}
                </div>
              </button>
            );
          })}

          {visibleStudents.length === 0 && (
            <div className="px-5 py-10 text-center text-sm text-zinc-500">
              No students match the current filters.
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-300/20 bg-red-950/25 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      )}

      {!selectedId ? (
        <div className="rounded-[24px] border border-dashed border-white/10 bg-black/20 px-5 py-12 text-center text-sm text-zinc-500">
          Select a student from the roster above to edit attributes and skills.
        </div>
      ) : snapshot ? (
        <>
          <div className="rounded-[24px] border border-white/10 bg-black/25 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-lg font-black text-white">
                  {selectedStudent ? fullName(selectedStudent) : snapshot.studentName}
                </div>
                <div className="mt-1 font-mono text-xs text-cyan-100/70">
                  {snapshot.studentId}
                </div>
              </div>
              <div className="text-xs text-zinc-500">
                Base = class roster value · Bonus = purchased/admin bonus · Total = Base + Bonus
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
              {ATTRIBUTE_META.map((attribute) => {
                const base = baseAttributes[attribute.key];
                const bonus = bonusAttributes[attribute.key];

                return (
                  <div
                    key={attribute.key}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-200/60">
                          {attribute.short}
                        </div>
                        <div className="font-bold text-white">{attribute.label}</div>
                      </div>
                      <div className="rounded-xl bg-cyan-300/10 px-2.5 py-1 text-lg font-black text-cyan-100">
                        {base + bonus}
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <label className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">
                        Base
                        <input
                          type="number"
                          min={-99}
                          max={99}
                          value={base}
                          onChange={(event) =>
                            setAttribute("base", attribute.key, event.target.value)
                          }
                          className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-2 py-2 text-center text-sm font-bold text-white outline-none"
                        />
                      </label>
                      <label className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">
                        Bonus
                        <input
                          type="number"
                          min={-99}
                          max={99}
                          value={bonus}
                          onChange={(event) =>
                            setAttribute("bonus", attribute.key, event.target.value)
                          }
                          className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-2 py-2 text-center text-sm font-bold text-white outline-none"
                        />
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(340px,0.8fr)]">
            <div className="rounded-[24px] border border-white/10 bg-black/25 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-black text-white">Roster Skills</div>
                  <div className="mt-1 text-xs text-zinc-500">
                    These are stored on the student’s class roster and can be freely corrected here.
                  </div>
                </div>
                <div className="text-xs font-semibold text-cyan-100/70">
                  {rosterSkills.length} selected
                </div>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {skillLibrary.map((skill) => {
                  const checked = rosterSkills.some(
                    (value) => value.toLowerCase() === skill.name.toLowerCase()
                  );
                  const purchased = purchasedSkills.some(
                    (value) => value.toLowerCase() === skill.name.toLowerCase()
                  );

                  return (
                    <label
                      key={skill.id}
                      className={[
                        "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition",
                        checked
                          ? "border-cyan-300/25 bg-cyan-300/10 text-cyan-50"
                          : "border-white/8 bg-white/[0.025] text-zinc-300",
                      ].join(" ")}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleRosterSkill(skill.name)}
                      />
                      <span className="min-w-0 flex-1">{skill.name}</span>
                      {purchased && (
                        <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-amber-200/70">
                          also purchased
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-black/25 p-4">
              <div className="font-black text-white">Purchased / Granted Skills</div>
              <div className="mt-1 text-xs leading-5 text-zinc-500">
                These come from Skill Store purchases or teacher grants. Revoking one does not refund a Skill Token.
              </div>

              <div className="mt-4 flex min-h-[48px] flex-wrap gap-2">
                {purchasedSkills.length ? (
                  purchasedSkills.map((skill) => (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => handleSkillAdjustment("REVOKE", skill)}
                      disabled={busy || !reason.trim()}
                      title={
                        reason.trim()
                          ? `Revoke ${skill}`
                          : "Enter a reason before revoking a skill"
                      }
                      className="rounded-full border border-amber-300/20 bg-amber-300/8 px-3 py-1.5 text-xs font-semibold text-amber-100 transition hover:bg-red-400/10 hover:text-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {skill} ×
                    </button>
                  ))
                ) : (
                  <div className="text-sm text-zinc-600">No purchased or teacher-granted skills.</div>
                )}
              </div>

              <div className="mt-4 border-t border-white/8 pt-4">
                <FieldLabel>Grant skill</FieldLabel>
                <div className="mt-2 flex gap-2">
                  <select
                    value={grantSkill}
                    onChange={(event) => setGrantSkill(event.target.value)}
                    className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white outline-none"
                  >
                    <option value="">Choose skill...</option>
                    {availableGrantSkills.map((skill) => (
                      <option key={skill.id} value={skill.name}>
                        {skill.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleSkillAdjustment("GRANT", grantSkill)}
                    disabled={busy || !grantSkill || !reason.trim()}
                    className="rounded-xl bg-amber-300 px-3 py-2.5 text-xs font-black uppercase tracking-[0.12em] text-zinc-950 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Grant
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-black/25 p-4">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <div>
                <FieldLabel>Reason / audit note</FieldLabel>
                <input
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Correction, starting setup, accommodation, reward..."
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none placeholder:text-zinc-600"
                />
                <div className="mt-2 text-xs text-zinc-600">
                  Required for saving attributes/roster skills and for granting or revoking a purchased skill.
                </div>
              </div>
              <button
                type="button"
                onClick={handleSave}
                disabled={busy || !reason.trim()}
                className="rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-zinc-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? "Saving..." : "Save Attributes & Roster Skills"}
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
