// src/pages/admin/components/GuildManagerPanel.tsx

import {
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Student } from "../../../types";
import { ADMIN_GUILDS } from "../adminConstants";
import {
  clean,
  countByGuild,
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

function CountPill({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-100/80">
      {children}
    </span>
  );
}

type Props = {
  students: Student[];
  loading: boolean;
  busy: boolean;
  onAssign: (studentIds: string[], guild: string) => Promise<void>;
  onRefresh: () => Promise<void>;
};

export default function GuildManagerPanel({
  students,
  loading,
  busy,
  onAssign,
  onRefresh,
}: Props) {
  const [homeroomFilter, setHomeroomFilter] = useState("ALL");
  const [guildFilter, setGuildFilter] = useState("ALL");
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [targetGuild, setTargetGuild] = useState<string>(ADMIN_GUILDS[0]);

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

  const homeroomStudents = useMemo(
    () =>
      students.filter(
        (student) =>
          homeroomFilter === "ALL" ||
          clean(student.homeroom) === homeroomFilter
      ),
    [students, homeroomFilter]
  );

  const guildCounts = useMemo(
    () => countByGuild(homeroomStudents),
    [homeroomStudents]
  );

  const visibleStudents = useMemo(() => {
    const q = query.trim().toLowerCase();

    return homeroomStudents
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
          normId(student.id).toLowerCase().includes(q) ||
          clean(student.guild).toLowerCase().includes(q)
        );
      })
      .slice()
      .sort(studentSort);
  }, [homeroomStudents, guildFilter, query]);

  const selectedCount = selectedIds.length;

  const toggleStudent = (studentId: string) => {
    setSelectedIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const toggleVisibleStudents = () => {
    const visibleIds = visibleStudents
      .map((student) => normId(student.id))
      .filter(Boolean);

    const allSelected =
      visibleIds.length > 0 &&
      visibleIds.every((id) => selectedIds.includes(id));

    setSelectedIds((prev) => {
      if (allSelected) {
        return prev.filter((id) => !visibleIds.includes(id));
      }

      return Array.from(new Set([...prev, ...visibleIds]));
    });
  };

  const handleAssign = async () => {
    if (!selectedIds.length) return;

    const label = targetGuild || "Unassigned";
    const confirmed = window.confirm(
      `Move ${selectedIds.length} student${
        selectedIds.length === 1 ? "" : "s"
      } to ${label}?`
    );

    if (!confirmed) return;

    try {
      await onAssign(selectedIds, targetGuild);
      setSelectedIds([]);
    } catch {
      // Parent shows the error. Keep the selected students so the teacher can retry.
    }
  };

  return (
    <div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <FieldLabel>Homeroom</FieldLabel>
          <select
            value={homeroomFilter}
            onChange={(event) => {
              setHomeroomFilter(event.target.value);
              setSelectedIds([]);
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
          <FieldLabel>Current guild</FieldLabel>
          <select
            value={guildFilter}
            onChange={(event) => {
              setGuildFilter(event.target.value);
              setSelectedIds([]);
            }}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none"
          >
            <option value="ALL">All Guilds</option>
            <option value="UNASSIGNED">Unassigned</option>
            {ADMIN_GUILDS.map((guild) => (
              <option key={guild} value={guild}>
                {guild}
              </option>
            ))}
          </select>
        </div>

        <div>
          <FieldLabel>Search</FieldLabel>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name or student ID"
            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none placeholder:text-zinc-600"
          />
        </div>

        <div>
          <FieldLabel>Move selected to</FieldLabel>
          <select
            value={targetGuild}
            onChange={(event) => setTargetGuild(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none"
          >
            <option value="">Unassigned</option>
            {ADMIN_GUILDS.map((guild) => (
              <option key={guild} value={guild}>
                {guild}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {ADMIN_GUILDS.map((guild) => (
          <CountPill key={guild}>
            {guild}: {guildCounts.get(guild) ?? 0}
          </CountPill>
        ))}
        <CountPill>
          Unassigned: {guildCounts.get("Unassigned") ?? 0}
        </CountPill>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={toggleVisibleStudents}
          className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-zinc-200 hover:bg-white/[0.08]"
        >
          Select / Clear Visible
        </button>

        <button
          type="button"
          onClick={handleAssign}
          disabled={busy || selectedCount === 0}
          className="rounded-2xl bg-cyan-300 px-4 py-2 text-sm font-black uppercase tracking-[0.14em] text-zinc-950 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Move {selectedCount} to {targetGuild || "Unassigned"}
        </button>

        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="rounded-2xl border border-white/10 bg-black/30 px-4 py-2 text-sm font-bold text-zinc-200 hover:bg-white/[0.06] disabled:opacity-50"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className="mt-4 max-h-[650px] overflow-auto rounded-2xl border border-white/10 bg-black/25">
        <table className="w-full min-w-[780px] text-left text-sm">
          <thead className="sticky top-0 bg-zinc-950 text-[11px] uppercase tracking-[0.16em] text-zinc-500">
            <tr>
              <th className="w-12 px-3 py-2">Pick</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Student ID</th>
              <th className="px-3 py-2">Homeroom</th>
              <th className="px-3 py-2">Guild</th>
            </tr>
          </thead>
          <tbody>
            {visibleStudents.map((student) => {
              const studentId = normId(student.id);
              const checked = selectedIds.includes(studentId);

              return (
                <tr
                  key={studentId}
                  className="border-t border-white/5 hover:bg-white/[0.03]"
                >
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleStudent(studentId)}
                      className="h-4 w-4 accent-cyan-300"
                    />
                  </td>
                  <td className="px-3 py-2 font-semibold text-white">
                    {fullName(student) || "Unnamed Legend"}
                  </td>
                  <td className="px-3 py-2 font-mono text-cyan-100/90">
                    {studentId || "—"}
                  </td>
                  <td className="px-3 py-2 text-zinc-300">
                    {clean(student.homeroom) || "—"}
                  </td>
                  <td className="px-3 py-2 text-zinc-300">
                    {clean(student.guild) || "Unassigned"}
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
