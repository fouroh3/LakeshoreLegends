// src/pages/admin/AdminPage.tsx

import { useEffect, useMemo, useState } from "react";
import { loadStudents } from "../../data";
import type { Student } from "../../types";
import {
  adminAssignGuildBatch,
  adminImportStudents,
  type AdminImportedStudent,
} from "./adminApi";
import {
  clearBattleTeacherToken,
  getBattleTeacherToken,
  loginBattleTeacher,
} from "../battle/battleTeacherApi";

const GUILDS = [
  "Scouts",
  "Guardians",
  "Blades",
  "Shadows",
  "Scholars",
  "Diplomats",
];

type PasteFormat = "last-first-homeroom" | "first-last-homeroom" | "full-homeroom";

type ParsedStudent = AdminImportedStudent & {
  rowNumber: number;
  raw: string;
  previewId: string;
  error?: string;
};

function normId(value: unknown) {
  return String(value ?? "")
    .replace(/\u00A0/g, " ")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, "")
    .trim()
    .toUpperCase();
}

function clean(value: unknown) {
  return String(value ?? "")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function fullName(student: Student) {
  return [student.first, student.last].map(clean).filter(Boolean).join(" ");
}

function splitPasteLine(line: string) {
  const raw = String(line ?? "").trim();

  if (!raw) return [];
  if (raw.includes("\t")) return raw.split("\t").map(clean);
  if (raw.includes(",")) return raw.split(",").map(clean);

  return raw.split(/\s{2,}/g).map(clean);
}

function looksLikeHeader(line: string) {
  const s = line.toLowerCase();
  return (
    s.includes("first") ||
    s.includes("last") ||
    s.includes("homeroom") ||
    s.includes("class") ||
    s.includes("student")
  );
}

function existingMaxByHomeroom(students: Student[]) {
  const maxByHr = new Map<string, number>();

  for (const student of students) {
    const homeroom = clean(student.homeroom);
    const id = normId(student.id);
    const match = id.match(/^(8-\d+)-(\d+)$/);

    if (!homeroom || !match) continue;

    const n = Number(match[2]);
    if (!Number.isFinite(n)) continue;

    maxByHr.set(homeroom, Math.max(maxByHr.get(homeroom) ?? 0, n));
  }

  return maxByHr;
}

function buildPreviewId(homeroom: string, nextNumber: number) {
  return `${homeroom}-${String(nextNumber).padStart(3, "0")}`;
}

function parseStudentPaste(
  raw: string,
  format: PasteFormat,
  students: Student[]
): ParsedStudent[] {
  const lines = String(raw ?? "")
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean);

  const maxByHr = existingMaxByHomeroom(students);
  const nextByHr = new Map(maxByHr);
  const parsed: ParsedStudent[] = [];

  lines.forEach((line, index) => {
    if (index === 0 && looksLikeHeader(line)) return;

    const parts = splitPasteLine(line);
    let first = "";
    let last = "";
    let homeroom = "";
    let error = "";

    if (format === "last-first-homeroom") {
      last = clean(parts[0]);
      first = clean(parts[1]);
      homeroom = clean(parts[2]);
    }

    if (format === "first-last-homeroom") {
      first = clean(parts[0]);
      last = clean(parts[1]);
      homeroom = clean(parts[2]);
    }

    if (format === "full-homeroom") {
      const full = clean(parts[0]);
      homeroom = clean(parts[1]);
      const nameParts = full.split(" ").filter(Boolean);
      first = nameParts.slice(0, -1).join(" ");
      last = nameParts.slice(-1).join(" ");
    }

    if (!first || !last || !homeroom) {
      error = "Missing first name, last name, or homeroom.";
    }

    if (homeroom && !/^8-\d+$/.test(homeroom)) {
      error = "Homeroom should look like 8-1, 8-2, etc.";
    }

    const next = (nextByHr.get(homeroom) ?? 0) + 1;
    nextByHr.set(homeroom, next);

    parsed.push({
      rowNumber: index + 1,
      raw: line,
      first,
      last,
      homeroom,
      guild: "",
      previewId: homeroom ? buildPreviewId(homeroom, next) : "",
      error,
    });
  });

  return parsed;
}

function studentSort(a: Student, b: Student) {
  const hr = clean(a.homeroom).localeCompare(clean(b.homeroom), "en", {
    numeric: true,
  });

  if (hr !== 0) return hr;

  const guild = clean(a.guild).localeCompare(clean(b.guild), "en");
  if (guild !== 0) return guild;

  return `${a.last} ${a.first}`.localeCompare(`${b.last} ${b.first}`, "en");
}

function countByGuild(students: Student[]) {
  const counts = new Map<string, number>();

  for (const student of students) {
    const guild = clean(student.guild) || "Unassigned";
    counts.set(guild, (counts.get(guild) ?? 0) + 1);
  }

  return counts;
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-100/80">
      {children}
    </span>
  );
}

function Section({
  title,
  kicker,
  children,
}: {
  title: string;
  kicker: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-zinc-950/70 p-5 shadow-[0_20px_70px_rgba(0,0,0,0.35)] backdrop-blur-xl">
      <div className="mb-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200/70">
          {kicker}
        </div>
        <h2 className="mt-1 text-2xl font-black tracking-tight text-white">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

export default function AdminPage() {
  const [unlocked, setUnlocked] = useState(() => Boolean(getBattleTeacherToken()));
  const [passcode, setPasscode] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const [homeroomFilter, setHomeroomFilter] = useState("ALL");
  const [guildFilter, setGuildFilter] = useState("ALL");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [targetGuild, setTargetGuild] = useState(GUILDS[0]);

  const [pasteFormat, setPasteFormat] = useState<PasteFormat>("last-first-homeroom");
  const [pasteText, setPasteText] = useState("");

  const reloadStudents = async () => {
    setLoading(true);
    try {
      const data = await loadStudents();
      setStudents(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setNotice({ type: "err", msg: err?.message || "Failed to load students." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (unlocked) reloadStudents();
  }, [unlocked]);

  const homerooms = useMemo(() => {
    const set = new Set<string>();
    students.forEach((student) => {
      const homeroom = clean(student.homeroom);
      if (homeroom) set.add(homeroom);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
  }, [students]);

  const visibleStudents = useMemo(() => {
    return students
      .filter((student) => homeroomFilter === "ALL" || clean(student.homeroom) === homeroomFilter)
      .filter((student) => guildFilter === "ALL" || clean(student.guild) === guildFilter)
      .slice()
      .sort(studentSort);
  }, [students, homeroomFilter, guildFilter]);

  const guildCounts = useMemo(() => countByGuild(visibleStudents), [visibleStudents]);

  const parsedStudents = useMemo(
    () => parseStudentPaste(pasteText, pasteFormat, students),
    [pasteText, pasteFormat, students]
  );

  const importableStudents = parsedStudents.filter((row) => !row.error);
  const hasPasteErrors = parsedStudents.some((row) => row.error);

  const selectedCount = selectedIds.length;

  const toggleStudent = (studentId: string) => {
    setSelectedIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const toggleVisibleStudents = () => {
    const visibleIds = visibleStudents.map((student) => normId(student.id)).filter(Boolean);
    const allSelected = visibleIds.every((id) => selectedIds.includes(id));

    setSelectedIds((prev) => {
      if (allSelected) return prev.filter((id) => !visibleIds.includes(id));
      return Array.from(new Set([...prev, ...visibleIds]));
    });
  };

  const handleLogin = async () => {
    setNotice(null);
    setBusy(true);

    try {
      await loginBattleTeacher(passcode);
      setUnlocked(true);
      setPasscode("");
      setNotice({ type: "ok", msg: "Teacher admin unlocked." });
    } catch (err: any) {
      setNotice({ type: "err", msg: err?.message || "Unlock failed." });
    } finally {
      setBusy(false);
    }
  };

  const handleLock = () => {
    clearBattleTeacherToken();
    setUnlocked(false);
    setStudents([]);
    setSelectedIds([]);
    setNotice(null);
  };

  const handleAssignGuild = async () => {
    if (!selectedIds.length) {
      setNotice({ type: "err", msg: "Select at least one student first." });
      return;
    }

    setBusy(true);
    setNotice(null);

    try {
      const result = await adminAssignGuildBatch({
        studentIds: selectedIds,
        guild: targetGuild,
      });

      setNotice({
        type: "ok",
        msg: `Updated ${result.updated ?? selectedIds.length} student${selectedIds.length === 1 ? "" : "s"} to ${targetGuild}.`,
      });
      setSelectedIds([]);
      await reloadStudents();
    } catch (err: any) {
      setNotice({ type: "err", msg: err?.message || "Guild assignment failed." });
    } finally {
      setBusy(false);
    }
  };

  const handleImportStudents = async () => {
    if (!importableStudents.length) {
      setNotice({ type: "err", msg: "Paste at least one valid student row first." });
      return;
    }

    if (hasPasteErrors) {
      setNotice({ type: "err", msg: "Fix the highlighted paste rows before importing." });
      return;
    }

    setBusy(true);
    setNotice(null);

    try {
      const result = await adminImportStudents(
        importableStudents.map((row) => ({
          first: row.first,
          last: row.last,
          homeroom: row.homeroom,
          guild: row.guild || "",
        }))
      );

      setNotice({
        type: "ok",
        msg: `Imported ${result.imported ?? importableStudents.length} student${importableStudents.length === 1 ? "" : "s"}.`,
      });
      setPasteText("");
      await reloadStudents();
    } catch (err: any) {
      setNotice({ type: "err", msg: err?.message || "Student import failed." });
    } finally {
      setBusy(false);
    }
  };

  if (!unlocked) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_42%),#070707] px-4 py-8 text-zinc-100">
        <div className="mx-auto max-w-xl rounded-[32px] border border-white/10 bg-zinc-950/80 p-6 shadow-2xl backdrop-blur-xl">
          <div className="mb-6">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-200/70">
              Teacher Admin
            </div>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-white">
              Global Manager
            </h1>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Manage students, guilds, imports, and future global tools without touching the spreadsheet.
            </p>
          </div>

          {notice && (
            <div
              className={[
                "mb-4 rounded-2xl border px-4 py-3 text-sm",
                notice.type === "ok"
                  ? "border-emerald-400/20 bg-emerald-950/30 text-emerald-100"
                  : "border-red-400/20 bg-red-950/30 text-red-100",
              ].join(" ")}
            >
              {notice.msg}
            </div>
          )}

          <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Teacher passcode
          </label>
          <input
            type="password"
            value={passcode}
            onChange={(event) => setPasscode(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") handleLogin();
            }}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none ring-cyan-300/30 placeholder:text-zinc-600 focus:ring-2"
            placeholder="Enter teacher password"
          />

          <button
            type="button"
            onClick={handleLogin}
            disabled={busy || !passcode.trim()}
            className="mt-4 w-full rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-black uppercase tracking-[0.16em] text-zinc-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Unlocking..." : "Unlock Admin"}
          </button>

          <a
            href="/"
            className="mt-4 block text-center text-sm font-semibold text-cyan-200/80 hover:text-cyan-100"
          >
            Back to dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.10),transparent_42%),#070707] px-3 py-5 text-zinc-100 sm:px-5">
      <div className="mx-auto max-w-[1700px]">
        <header className="mb-5 rounded-[30px] border border-white/10 bg-zinc-950/70 p-5 shadow-[0_20px_70px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-200/70">
                Teacher Admin
              </div>
              <h1 className="mt-1 text-3xl font-black tracking-tight text-white sm:text-4xl">
                Global Manager
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
                First build: paste students in bulk, preview the generated IDs, and manage guild assignments without editing the spreadsheet directly.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <a
                href="/"
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-zinc-200 hover:bg-white/[0.08]"
              >
                Dashboard
              </a>
              <a
                href="/battle/teacher"
                className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm font-bold text-cyan-100 hover:bg-cyan-300/15"
              >
                Live Battle Console
              </a>
              <button
                type="button"
                onClick={handleLock}
                className="rounded-2xl border border-red-300/20 bg-red-950/30 px-4 py-2 text-sm font-bold text-red-100 hover:bg-red-950/50"
              >
                Lock
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Pill>{students.length} students loaded</Pill>
            <Pill>{homerooms.length} homerooms</Pill>
            <Pill>{selectedCount} selected</Pill>
            {loading && <Pill>Refreshing roster</Pill>}
          </div>
        </header>

        {notice && (
          <div
            className={[
              "mb-5 rounded-2xl border px-4 py-3 text-sm font-medium",
              notice.type === "ok"
                ? "border-emerald-400/20 bg-emerald-950/30 text-emerald-100"
                : "border-red-400/20 bg-red-950/30 text-red-100",
            ].join(" ")}
          >
            {notice.msg}
          </div>
        )}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)]">
          <Section title="Bulk Paste Students" kicker="Student Import">
            <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    Paste format
                  </label>
                  <select
                    value={pasteFormat}
                    onChange={(event) => setPasteFormat(event.target.value as PasteFormat)}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none"
                  >
                    <option value="last-first-homeroom">Last, First, Homeroom</option>
                    <option value="first-last-homeroom">First, Last, Homeroom</option>
                    <option value="full-homeroom">Full Name, Homeroom</option>
                  </select>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/25 p-4 text-xs leading-5 text-zinc-400">
                  Copy directly from a spreadsheet. Tabs, commas, and obvious headers are okay.
                  <div className="mt-3 rounded-xl bg-black/40 p-3 font-mono text-[11px] text-zinc-300">
                    Smith&nbsp;&nbsp;Ava&nbsp;&nbsp;8-1<br />
                    Johnson&nbsp;&nbsp;Liam&nbsp;&nbsp;8-1<br />
                    Patel&nbsp;&nbsp;Maya&nbsp;&nbsp;8-2
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleImportStudents}
                  disabled={busy || importableStudents.length === 0 || hasPasteErrors}
                  className="w-full rounded-2xl bg-emerald-300 px-4 py-3 text-sm font-black uppercase tracking-[0.16em] text-zinc-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy ? "Working..." : `Import ${importableStudents.length} Student${importableStudents.length === 1 ? "" : "s"}`}
                </button>
              </div>

              <div className="space-y-3">
                <textarea
                  value={pasteText}
                  onChange={(event) => setPasteText(event.target.value)}
                  className="min-h-[180px] w-full rounded-2xl border border-white/10 bg-black/40 p-4 font-mono text-sm leading-6 text-white outline-none ring-cyan-300/30 placeholder:text-zinc-600 focus:ring-2"
                  placeholder="Paste student rows here..."
                />

                <div className="max-h-[360px] overflow-auto rounded-2xl border border-white/10 bg-black/25">
                  <table className="w-full min-w-[720px] text-left text-sm">
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
                          <td colSpan={5} className="px-3 py-8 text-center text-zinc-500">
                            Paste rows above to preview generated IDs.
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
          </Section>

          <Section title="Assign / Manage Guilds" kicker="Guild Manager">
            <div className="mb-4 grid gap-3 sm:grid-cols-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  Homeroom
                </label>
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
                <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  Current guild
                </label>
                <select
                  value={guildFilter}
                  onChange={(event) => {
                    setGuildFilter(event.target.value);
                    setSelectedIds([]);
                  }}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none"
                >
                  <option value="ALL">All Guilds</option>
                  {GUILDS.map((guild) => (
                    <option key={guild} value={guild}>
                      {guild}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  Move selected to
                </label>
                <select
                  value={targetGuild}
                  onChange={(event) => setTargetGuild(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none"
                >
                  {GUILDS.map((guild) => (
                    <option key={guild} value={guild}>
                      {guild}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              {GUILDS.map((guild) => (
                <Pill key={guild}>{guild}: {guildCounts.get(guild) ?? 0}</Pill>
              ))}
              <Pill>Unassigned: {guildCounts.get("Unassigned") ?? 0}</Pill>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={toggleVisibleStudents}
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-zinc-200 hover:bg-white/[0.08]"
              >
                Select / Clear Visible
              </button>
              <button
                type="button"
                onClick={handleAssignGuild}
                disabled={busy || selectedCount === 0}
                className="rounded-2xl bg-cyan-300 px-4 py-2 text-sm font-black uppercase tracking-[0.14em] text-zinc-950 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Move {selectedCount} to {targetGuild}
              </button>
              <button
                type="button"
                onClick={reloadStudents}
                disabled={loading}
                className="rounded-2xl border border-white/10 bg-black/30 px-4 py-2 text-sm font-bold text-zinc-200 hover:bg-white/[0.06] disabled:opacity-50"
              >
                Refresh
              </button>
            </div>

            <div className="max-h-[620px] overflow-auto rounded-2xl border border-white/10 bg-black/25">
              <table className="w-full min-w-[760px] text-left text-sm">
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
                      <td colSpan={5} className="px-3 py-8 text-center text-zinc-500">
                        No students match the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
