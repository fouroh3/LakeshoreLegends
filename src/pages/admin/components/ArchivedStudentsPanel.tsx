// src/pages/admin/components/ArchivedStudentsPanel.tsx

import { useEffect, useMemo, useState } from "react";
import { ArchiveRestore, RefreshCw, Search, Trash2 } from "lucide-react";
import {
  adminArchivedStudents,
  adminDeleteArchivedStudent,
  adminRestoreStudent,
  type AdminArchivedStudentRow,
} from "../adminApi";

export default function ArchivedStudentsPanel({
  refreshKey,
  onRosterChanged,
}: {
  refreshKey: number;
  onRosterChanged: () => Promise<void>;
}) {
  const [rows, setRows] = useState<AdminArchivedStudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await adminArchivedStudents();
      setRows(result.rows || []);
    } catch (err: any) {
      setError(err?.message || "Could not load archived students.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setNotice("");
    void load();
  }, [refreshKey]);

  useEffect(() => {
    if (!notice) return;

    const timer = window.setTimeout(() => {
      setNotice("");
    }, 4000);

    return () => window.clearTimeout(timer);
  }, [notice]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      `${row.studentName} ${row.studentId} ${row.homeroom} ${row.guild}`
        .toLowerCase()
        .includes(q)
    );
  }, [query, rows]);

  const restore = async (row: AdminArchivedStudentRow) => {
    const confirmed = window.confirm(
      `Restore ${row.studentName || row.studentId} to ${row.homeroom}? Their saved roster values and HP state will be restored.`
    );
    if (!confirmed) return;

    setBusyId(row.studentId);
    setError("");
    setNotice("");
    try {
      await adminRestoreStudent({ studentId: row.studentId });
      setNotice(`Restored ${row.studentName || row.studentId}.`);
      await Promise.all([load(), onRosterChanged()]);
    } catch (err: any) {
      setError(err?.message || "Restore failed.");
    } finally {
      setBusyId("");
    }
  };

  const permanentlyDelete = async (row: AdminArchivedStudentRow) => {
    const answer = window.prompt(
      `PERMANENT DELETE\n\nThis erases ${row.studentName || row.studentId}'s stored game data and transaction records. The StudentID remains permanently reserved.\n\nType DELETE to continue.`
    );
    if (answer !== "DELETE") return;

    const reason = window.prompt("Reason for permanent deletion:", "Roster cleanup");
    if (!reason?.trim()) return;

    setBusyId(row.studentId);
    setError("");
    setNotice("");
    try {
      const result = await adminDeleteArchivedStudent({
        studentId: row.studentId,
        reason: reason.trim(),
      });
      setNotice(
        result.mediaCleanupRequired
          ? `Stored data for ${row.studentName || row.studentId} was deleted, but one or more managed image files could not be removed automatically. Check Image Storage in System.`
          : `Permanently deleted stored data for ${row.studentName || row.studentId}.`
      );
      await load();
    } catch (err: any) {
      setError(err?.message || "Permanent deletion failed.");
    } finally {
      setBusyId("");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-black text-white">Archived Students</div>
          <div className="mt-1 text-xs leading-5 text-zinc-500">
            Archived students are removed from the active game but remain recoverable until you permanently delete their data.
          </div>
        </div>
        <div className="flex gap-2">
          <div className="relative min-w-[250px] flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search archived students"
              className="w-full rounded-2xl border border-white/10 bg-black/35 py-2.5 pl-9 pr-3 text-sm text-white outline-none placeholder:text-zinc-600"
            />
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="rounded-2xl border border-white/10 bg-white/[0.04] p-2.5 text-zinc-300 disabled:opacity-50"
            aria-label="Refresh archived students"
          >
            <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-300/20 bg-red-950/25 px-4 py-3 text-sm font-semibold text-red-100">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.07] px-4 py-3 text-sm font-semibold text-emerald-100">
          {notice}
        </div>
      )}

      <div className="overflow-hidden rounded-[22px] border border-white/10 bg-black/20">
        <div className="max-h-[380px] overflow-auto">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="sticky top-0 bg-zinc-950 text-[11px] uppercase tracking-[0.15em] text-zinc-500">
              <tr>
                <th className="px-3 py-3">Student</th>
                <th className="px-3 py-3">Student ID</th>
                <th className="px-3 py-3">Homeroom</th>
                <th className="px-3 py-3">Archived</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={row.studentId} className="border-t border-white/5">
                  <td className="px-3 py-3">
                    <div className="font-semibold text-white">{row.studentName || "Archived Student"}</div>
                    <div className="mt-0.5 text-xs text-zinc-600">{row.guild || "No guild"}</div>
                  </td>
                  <td className="px-3 py-3 font-mono text-cyan-100/80">{row.studentId}</td>
                  <td className="px-3 py-3 text-zinc-300">{row.homeroom}</td>
                  <td className="px-3 py-3 text-xs text-zinc-500">
                    {row.archivedAt ? new Date(row.archivedAt).toLocaleString() : "—"}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => void restore(row)}
                        disabled={busyId === row.studentId}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-bold text-emerald-100 disabled:opacity-40"
                      >
                        <ArchiveRestore size={14} /> Restore
                      </button>
                      <button
                        type="button"
                        onClick={() => void permanentlyDelete(row)}
                        disabled={busyId === row.studentId}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-red-300/20 bg-red-950/25 px-3 py-1.5 text-xs font-bold text-red-100 disabled:opacity-40"
                      >
                        <Trash2 size={14} /> Delete Data
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && visible.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-10 text-center text-sm text-zinc-600">
                    No archived students.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
