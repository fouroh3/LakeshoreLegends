// src/pages/admin/components/StudentImportPanel.tsx

import { useMemo, useState } from "react";
import type { Student } from "../../../types";
import type { AdminImportedStudent } from "../adminApi";
import {
  ADMIN_HOMEROOMS,
  type PasteFormat,
} from "../adminConstants";
import { parseStudentPaste } from "../adminRosterUtils";

function FieldLabel({ children }: { children: string }) {
  return (
    <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
      {children}
    </label>
  );
}

type Props = {
  students: Student[];
  reservedStudentIds?: string[];
  busy: boolean;
  onImport: (students: AdminImportedStudent[]) => Promise<void>;
};

export default function StudentImportPanel({
  students,
  reservedStudentIds = [],
  busy,
  onImport,
}: Props) {
  const [pasteFormat, setPasteFormat] = useState<PasteFormat>("last-first");
  const [defaultHomeroom, setDefaultHomeroom] = useState("");
  const [pasteText, setPasteText] = useState("");

  const parsedStudents = useMemo(
    () =>
      parseStudentPaste({
        raw: pasteText,
        format: pasteFormat,
        defaultHomeroom,
        students,
        reservedStudentIds,
      }),
    [pasteText, pasteFormat, defaultHomeroom, students, reservedStudentIds]
  );

  const importableStudents = parsedStudents.filter((row) => !row.error);
  const hasErrors = parsedStudents.some((row) => row.error);

  const handleImport = async () => {
    if (!importableStudents.length || hasErrors) return;

    try {
      await onImport(
        importableStudents.map((row) => ({
          first: row.first,
          last: row.last,
          homeroom: row.homeroom,
          guild: row.guild || "",
        }))
      );

      setPasteText("");
    } catch {
      // Parent shows the error. Keep the pasted roster so the teacher can retry.
    }
  };

  const formatHint =
    pasteFormat === "last-first"
      ? "Smith    Ava"
      : pasteFormat === "first-last"
      ? "Ava    Smith"
      : "Ava Smith";

  return (
    <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
      <div className="space-y-4">
        <div>
          <FieldLabel>Name format</FieldLabel>
          <select
            value={pasteFormat}
            onChange={(event) => setPasteFormat(event.target.value as PasteFormat)}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none"
          >
            <option value="last-first">Last, First</option>
            <option value="first-last">First, Last</option>
            <option value="full-name">Full Name</option>
          </select>
        </div>

        <div>
          <FieldLabel>Homeroom</FieldLabel>
          <select
            value={defaultHomeroom}
            onChange={(event) => setDefaultHomeroom(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none"
          >
            <option value="">Use homeroom from pasted rows</option>
            {ADMIN_HOMEROOMS.map((homeroom) => (
              <option key={homeroom} value={homeroom}>
                Put all pasted students in {homeroom}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/25 p-4 text-xs leading-5 text-zinc-400">
          Copy names straight from a spreadsheet and paste them here. If everyone is in the same class, choose the homeroom above and you only need to copy the name columns.
          <div className="mt-3 rounded-xl bg-black/40 p-3 font-mono text-[11px] text-zinc-300">
            {formatHint}
            <br />
            {pasteFormat === "last-first"
              ? "Johnson    Liam"
              : pasteFormat === "first-last"
              ? "Liam    Johnson"
              : "Liam Johnson"}
          </div>
          {!defaultHomeroom && (
            <div className="mt-3 text-cyan-100/80">
              No homeroom selected: include the homeroom as the last pasted column.
            </div>
          )}
          {reservedStudentIds.length > 0 && (
            <div className="mt-3 text-zinc-500">
              Archived StudentIDs stay reserved automatically and will never be reused by this importer.
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleImport}
          disabled={busy || importableStudents.length === 0 || hasErrors}
          className="w-full rounded-2xl bg-emerald-300 px-4 py-3 text-sm font-black uppercase tracking-[0.16em] text-zinc-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy
            ? "Working..."
            : `Import ${importableStudents.length} Student${
                importableStudents.length === 1 ? "" : "s"
              }`}
        </button>
      </div>

      <div className="space-y-3">
        <textarea
          value={pasteText}
          onChange={(event) => setPasteText(event.target.value)}
          className="min-h-[210px] w-full rounded-2xl border border-white/10 bg-black/40 p-4 font-mono text-sm leading-6 text-white outline-none ring-cyan-300/30 placeholder:text-zinc-600 focus:ring-2"
          placeholder="Paste student names here..."
        />

        <div className="max-h-[430px] overflow-auto rounded-2xl border border-white/10 bg-black/25">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="sticky top-0 bg-zinc-950 text-[11px] uppercase tracking-[0.16em] text-zinc-500">
              <tr>
                <th className="px-3 py-2">Preview ID</th>
                <th className="px-3 py-2">First</th>
                <th className="px-3 py-2">Last</th>
                <th className="px-3 py-2">Homeroom</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {parsedStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-10 text-center text-zinc-500">
                    Paste names above to preview exactly who will be imported.
                  </td>
                </tr>
              ) : (
                parsedStudents.map((row) => (
                  <tr
                    key={`${row.rowNumber}-${row.raw}`}
                    className="border-t border-white/5"
                  >
                    <td className="px-3 py-2 font-mono text-cyan-100">
                      {row.previewId || "—"}
                    </td>
                    <td className="px-3 py-2 text-zinc-200">{row.first || "—"}</td>
                    <td className="px-3 py-2 text-zinc-200">{row.last || "—"}</td>
                    <td className="px-3 py-2 text-zinc-300">{row.homeroom || "—"}</td>
                    <td className="px-3 py-2">
                      {row.error ? (
                        <span className="text-red-200">{row.error}</span>
                      ) : (
                        <span className="text-emerald-200">Ready</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
