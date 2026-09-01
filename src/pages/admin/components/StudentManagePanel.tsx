// src/pages/admin/components/StudentManagePanel.tsx

import { useMemo, useState } from "react";
import { ArrowRightLeft } from "lucide-react";
import type { Student } from "../../../types";
import type {
  AdminArchiveStudentResult,
  AdminMoveStudentResult,
  AdminUpdateStudentResult,
} from "../adminApi";
import { ADMIN_GUILDS, ADMIN_HOMEROOMS } from "../adminConstants";
import {
  clean,
  fullName,
  normId,
  studentSort,
} from "../adminRosterUtils";

function FieldLabel({ children }: { children: string }) {
  return (
    <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
      {children}
    </label>
  );
}

type Props = {
  students: Student[];
  busy: boolean;
  onUpdate: (args: {
    studentId: string;
    first: string;
    last: string;
  }) => Promise<AdminUpdateStudentResult>;
  onMove: (args: {
    studentId: string;
    homeroom: string;
    reason: string;
  }) => Promise<AdminMoveStudentResult>;
  onArchive: (args: {
    studentId: string;
    reason: string;
  }) => Promise<AdminArchiveStudentResult>;
};

export default function StudentManagePanel({
  students,
  busy,
  onUpdate,
  onMove,
  onArchive,
}: Props) {
  const [homeroomFilter, setHomeroomFilter] = useState("ALL");
  const [guildFilter, setGuildFilter] = useState("ALL");
  const [query, setQuery] = useState("");

  const [editingId, setEditingId] = useState("");
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");

  const [movingId, setMovingId] = useState("");
  const [moveHomeroom, setMoveHomeroom] = useState("");
  const [moveReason, setMoveReason] = useState("");

  const [archivingId, setArchivingId] = useState("");
  const [archiveReason, setArchiveReason] = useState("");

  const homerooms = useMemo(() => {
    const set = new Set<string>();
    students.forEach((student) => {
      const value = clean(student.homeroom);
      if (value) set.add(value);
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
          homeroomFilter === "ALL" || clean(student.homeroom) === homeroomFilter
      )
      .filter((student) => {
        const guild = clean(student.guild);
        if (guildFilter === "ALL") return true;
        if (guildFilter === "UNASSIGNED") return !guild;
        return guild === guildFilter;
      })
      .filter((student) => {
        if (!q) return true;
        return (
          fullName(student).toLowerCase().includes(q) ||
          normId(student.id).toLowerCase().includes(q)
        );
      })
      .slice()
      .sort(studentSort);
  }, [students, homeroomFilter, guildFilter, query]);

  const editingStudent = students.find(
    (student) => normId(student.id) === editingId
  );
  const movingStudent = students.find(
    (student) => normId(student.id) === movingId
  );
  const archivingStudent = students.find(
    (student) => normId(student.id) === archivingId
  );

  const closeActions = () => {
    setEditingId("");
    setMovingId("");
    setMoveHomeroom("");
    setMoveReason("");
    setArchivingId("");
    setArchiveReason("");
  };

  const beginEdit = (student: Student) => {
    closeActions();
    setEditingId(normId(student.id));
    setFirst(String(student.first || "").trim());
    setLast(String(student.last || "").trim());
  };

  const saveEdit = async () => {
    if (!editingId || !first.trim() || !last.trim()) return;

    try {
      await onUpdate({
        studentId: editingId,
        first: first.trim(),
        last: last.trim(),
      });
      setEditingId("");
      setFirst("");
      setLast("");
    } catch {
      // Parent displays the error and the edit remains open for retry.
    }
  };

  const beginMove = (student: Student) => {
    closeActions();
    setMovingId(normId(student.id));
    setMoveHomeroom("");
  };

  const moveStudent = async () => {
    if (!movingStudent || !moveHomeroom || !moveReason.trim()) return;
    if (moveHomeroom === clean(movingStudent.homeroom)) return;

    const confirmed = window.confirm(
      `Move ${fullName(movingStudent)} from ${clean(movingStudent.homeroom)} to ${moveHomeroom}? A new StudentID will be created and their game state will migrate automatically.`
    );
    if (!confirmed) return;

    try {
      await onMove({
        studentId: normId(movingStudent.id),
        homeroom: moveHomeroom,
        reason: moveReason.trim(),
      });
      setMovingId("");
      setMoveHomeroom("");
      setMoveReason("");
    } catch {
      // Parent displays error and move form remains open.
    }
  };

  const beginArchive = (student: Student) => {
    closeActions();
    setArchivingId(normId(student.id));
    setArchiveReason("");
  };

  const archiveStudent = async () => {
    if (!archivingId || !archiveReason.trim() || !archivingStudent) return;

    const confirmed = window.confirm(
      `Archive ${fullName(archivingStudent)}? They will disappear from the active roster, but their history will be preserved.`
    );

    if (!confirmed) return;

    try {
      await onArchive({
        studentId: archivingId,
        reason: archiveReason.trim(),
      });
      setArchivingId("");
      setArchiveReason("");
    } catch {
      // Parent displays the error and the archive form remains open for retry.
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <FieldLabel>Homeroom</FieldLabel>
          <select
            value={homeroomFilter}
            onChange={(event) => setHomeroomFilter(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none"
          >
            <option value="ALL">All Homerooms</option>
            {homerooms.map((homeroom) => (
              <option key={homeroom} value={homeroom}>{homeroom}</option>
            ))}
          </select>
        </div>

        <div>
          <FieldLabel>Guild</FieldLabel>
          <select
            value={guildFilter}
            onChange={(event) => setGuildFilter(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none"
          >
            <option value="ALL">All Guilds</option>
            <option value="UNASSIGNED">Unassigned</option>
            {ADMIN_GUILDS.map((guild) => (
              <option key={guild} value={guild}>{guild}</option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <FieldLabel>Search</FieldLabel>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name or student ID"
            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none placeholder:text-zinc-600"
          />
        </div>
      </div>

      {editingStudent && (
        <div className="rounded-[24px] border border-cyan-300/20 bg-cyan-950/10 p-4">
          <div className="mb-3 text-sm font-black text-cyan-100">
            Edit {fullName(editingStudent)}
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_180px_180px_auto] md:items-end">
            <div>
              <FieldLabel>First name</FieldLabel>
              <input
                value={first}
                onChange={(event) => setFirst(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none"
              />
            </div>
            <div>
              <FieldLabel>Last name</FieldLabel>
              <input
                value={last}
                onChange={(event) => setLast(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none"
              />
            </div>
            <div>
              <FieldLabel>Student ID</FieldLabel>
              <div className="mt-2 rounded-2xl border border-white/10 bg-black/25 px-3 py-3 font-mono text-sm text-zinc-300">
                {normId(editingStudent.id)}
              </div>
            </div>
            <div>
              <FieldLabel>Homeroom</FieldLabel>
              <div className="mt-2 rounded-2xl border border-white/10 bg-black/25 px-3 py-3 text-sm text-zinc-300">
                {clean(editingStudent.homeroom)}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={saveEdit}
                disabled={busy || !first.trim() || !last.trim()}
                className="rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-black text-zinc-950 disabled:opacity-50"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setEditingId("")}
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold text-zinc-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {movingStudent && (
        <div className="rounded-[24px] border border-violet-300/20 bg-violet-950/15 p-4">
          <div className="flex items-center gap-2 text-sm font-black text-violet-100">
            <ArrowRightLeft size={17} /> Move {fullName(movingStudent)} to another homeroom
          </div>
          <p className="mt-1 text-xs leading-5 text-zinc-400">
            Their current StudentID is tied to {clean(movingStudent.homeroom)}. Global Manager will create the next safe ID in the destination class and migrate HP, XP, Skill Tokens, skills, cards, companion data, bonuses, and history automatically. The old ID stays reserved.
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-[220px_minmax(0,1fr)_auto_auto] md:items-end">
            <div>
              <FieldLabel>New homeroom</FieldLabel>
              <select
                value={moveHomeroom}
                onChange={(event) => setMoveHomeroom(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none"
              >
                <option value="">Choose...</option>
                {ADMIN_HOMEROOMS.filter(
                  (homeroom) => homeroom !== clean(movingStudent.homeroom)
                ).map((homeroom) => (
                  <option key={homeroom} value={homeroom}>{homeroom}</option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel>Reason</FieldLabel>
              <input
                value={moveReason}
                onChange={(event) => setMoveReason(event.target.value)}
                placeholder="Schedule change, roster correction..."
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none placeholder:text-zinc-600"
              />
            </div>
            <button
              type="button"
              onClick={moveStudent}
              disabled={busy || !moveHomeroom || !moveReason.trim()}
              className="rounded-2xl bg-violet-300 px-4 py-3 text-sm font-black text-zinc-950 disabled:opacity-50"
            >
              Move Student
            </button>
            <button
              type="button"
              onClick={() => setMovingId("")}
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold text-zinc-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {archivingStudent && (
        <div className="rounded-[24px] border border-red-300/20 bg-red-950/15 p-4">
          <div className="text-sm font-black text-red-100">
            Archive {fullName(archivingStudent)}
          </div>
          <p className="mt-1 text-xs leading-5 text-zinc-400">
            This removes the student from the active class roster without reusing their StudentID. XP, skills, cards, and transaction history remain preserved.
          </p>
          <div className="mt-3 flex flex-col gap-3 md:flex-row">
            <input
              value={archiveReason}
              onChange={(event) => setArchiveReason(event.target.value)}
              placeholder="Reason: moved schools, roster correction..."
              className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none placeholder:text-zinc-600"
            />
            <button
              type="button"
              onClick={archiveStudent}
              disabled={busy || !archiveReason.trim()}
              className="rounded-2xl bg-red-300 px-4 py-3 text-sm font-black text-zinc-950 disabled:opacity-50"
            >
              Archive Student
            </button>
            <button
              type="button"
              onClick={() => {
                setArchivingId("");
                setArchiveReason("");
              }}
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold text-zinc-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="max-h-[620px] overflow-auto rounded-2xl border border-white/10 bg-black/25">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="sticky top-0 bg-zinc-950 text-[11px] uppercase tracking-[0.16em] text-zinc-500">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Student ID</th>
              <th className="px-3 py-2">Homeroom</th>
              <th className="px-3 py-2">Guild</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleStudents.map((student) => {
              const studentId = normId(student.id);
              return (
                <tr key={studentId} className="border-t border-white/5 hover:bg-white/[0.03]">
                  <td className="px-3 py-2 font-semibold text-white">{fullName(student)}</td>
                  <td className="px-3 py-2 font-mono text-cyan-100/90">{studentId}</td>
                  <td className="px-3 py-2 text-zinc-300">{clean(student.homeroom)}</td>
                  <td className="px-3 py-2 text-zinc-300">{clean(student.guild) || "Unassigned"}</td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => beginEdit(student)}
                        className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-bold text-cyan-100"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => beginMove(student)}
                        className="rounded-xl border border-violet-300/20 bg-violet-300/10 px-3 py-1.5 text-xs font-bold text-violet-100"
                      >
                        Move
                      </button>
                      <button
                        type="button"
                        onClick={() => beginArchive(student)}
                        className="rounded-xl border border-red-300/20 bg-red-950/25 px-3 py-1.5 text-xs font-bold text-red-100"
                      >
                        Archive
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {visibleStudents.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-10 text-center text-zinc-500">
                  No students match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
