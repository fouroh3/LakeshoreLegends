// src/pages/admin/AdminPage.tsx

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { loadStudents } from "../../data";
import type { Student } from "../../types";
import {
  adminAdjustCurrency,
  adminAssignGuildBatch,
  adminImportStudents,
  type AdminCurrencyAdjustmentResult,
  type AdminImportedStudent,
} from "./adminApi";
import {
  clearBattleTeacherToken,
  getBattleTeacherToken,
  loginBattleTeacher,
} from "../battle/battleTeacherApi";
import {
  type AdminCurrency,
  type AdminCurrencyMode,
  type AdminSection,
} from "./adminConstants";
import { normId } from "./adminRosterUtils";
import StudentImportPanel from "./components/StudentImportPanel";
import GuildManagerPanel from "./components/GuildManagerPanel";
import CurrencyManagerPanel from "./components/CurrencyManagerPanel";

function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-100/80">
      {children}
    </span>
  );
}

function SectionButton({
  active,
  title,
  detail,
  onClick,
}: {
  active: boolean;
  title: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-2xl border px-4 py-3 text-left transition",
        active
          ? "border-cyan-300/30 bg-cyan-300/10 shadow-[0_0_24px_rgba(34,211,238,0.08)]"
          : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]",
      ].join(" ")}
    >
      <div className={active ? "font-black text-cyan-100" : "font-bold text-white"}>
        {title}
      </div>
      <div className="mt-1 text-xs leading-5 text-zinc-500">{detail}</div>
    </button>
  );
}

function AdminPanel({
  kicker,
  title,
  description,
  children,
}: {
  kicker: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[30px] border border-white/10 bg-zinc-950/70 p-5 shadow-[0_20px_70px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-6">
      <div className="mb-5">
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200/70">
          {kicker}
        </div>
        <h2 className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">
          {title}
        </h2>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-zinc-400">
          {description}
        </p>
      </div>
      {children}
    </section>
  );
}

function importedRecordToStudent(record: {
  studentId: string;
  first: string;
  last: string;
  homeroom: string;
  guild: string;
}): Student {
  return {
    id: record.studentId,
    first: record.first,
    last: record.last,
    homeroom: record.homeroom,
    guild: record.guild,
    str: 0,
    dex: 0,
    con: 0,
    int: 0,
    wis: 0,
    cha: 0,
    skills: [],
    inventory: [],
    baseHP: 20,
    currentHP: 20,
  };
}

export default function AdminPage() {
  const [unlocked, setUnlocked] = useState(() =>
    Boolean(getBattleTeacherToken())
  );
  const [passcode, setPasscode] = useState("");
  const [section, setSection] = useState<AdminSection>("students");
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{
    type: "ok" | "err";
    msg: string;
  } | null>(null);

  const reloadStudents = async () => {
    setLoading(true);

    try {
      const data = await loadStudents();
      setStudents(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setNotice({
        type: "err",
        msg: err?.message || "Failed to load students.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (unlocked) {
      reloadStudents();
    }
  }, [unlocked]);

  const homeroomCount = useMemo(() => {
    const homerooms = new Set(
      students
        .map((student) => String(student.homeroom || "").trim())
        .filter(Boolean)
    );

    return homerooms.size;
  }, [students]);

  const unassignedCount = useMemo(
    () => students.filter((student) => !String(student.guild || "").trim()).length,
    [students]
  );

  const handleLogin = async () => {
    setNotice(null);
    setBusy(true);

    try {
      await loginBattleTeacher(passcode);
      setUnlocked(true);
      setPasscode("");
      setNotice({ type: "ok", msg: "Teacher admin unlocked." });
    } catch (err: any) {
      setNotice({
        type: "err",
        msg: err?.message || "Unlock failed.",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleLock = () => {
    clearBattleTeacherToken();
    setUnlocked(false);
    setStudents([]);
    setNotice(null);
  };

  const handleImport = async (rows: AdminImportedStudent[]) => {
    if (!rows.length) return;

    const confirmed = window.confirm(
      `Import ${rows.length} student${rows.length === 1 ? "" : "s"}?`
    );

    if (!confirmed) return;

    setBusy(true);
    setNotice(null);

    try {
      const result = await adminImportStudents(rows);
      const imported = Array.isArray(result.students) ? result.students : [];

      if (imported.length) {
        setStudents((prev) => {
          const existingIds = new Set(prev.map((student) => normId(student.id)));
          const additions = imported
            .filter((record) => !existingIds.has(normId(record.studentId)))
            .map(importedRecordToStudent);

          return [...prev, ...additions];
        });
      }

      setNotice({
        type: "ok",
        msg: `Imported ${result.imported ?? rows.length} student${
          (result.imported ?? rows.length) === 1 ? "" : "s"
        }. HP, XP, and Skill Token state were initialized automatically.`,
      });
    } catch (err: any) {
      setNotice({
        type: "err",
        msg: err?.message || "Student import failed.",
      });
      throw err;
    } finally {
      setBusy(false);
    }
  };

  const handleAssignGuild = async (studentIds: string[], guild: string) => {
    if (!studentIds.length) return;

    setBusy(true);
    setNotice(null);

    try {
      const result = await adminAssignGuildBatch({
        studentIds,
        guild,
      });

      const changedIds = new Set(studentIds.map(normId));

      setStudents((prev) =>
        prev.map((student) =>
          changedIds.has(normId(student.id))
            ? { ...student, guild }
            : student
        )
      );

      const label = guild || "Unassigned";
      const updated = result.updated ?? studentIds.length;

      setNotice({
        type: "ok",
        msg: `Moved ${updated} student${updated === 1 ? "" : "s"} to ${label}.`,
      });
    } catch (err: any) {
      setNotice({
        type: "err",
        msg: err?.message || "Guild assignment failed.",
      });
      throw err;
    } finally {
      setBusy(false);
    }
  };

  const handleAdjustCurrency = async (args: {
    studentIds: string[];
    currency: AdminCurrency;
    mode: AdminCurrencyMode;
    amount: number;
    reason: string;
  }): Promise<AdminCurrencyAdjustmentResult> => {
    setBusy(true);
    setNotice(null);

    try {
      const result = await adminAdjustCurrency(args);
      const currencyLabel = args.currency === "XP" ? "XP" : "Skill Tokens";
      const actionLabel = args.mode === "ADD" ? "Added" : "Removed";
      const updated = result.updated ?? args.studentIds.length;

      setNotice({
        type: "ok",
        msg: `${actionLabel} ${args.amount} ${currencyLabel} ${
          args.mode === "ADD" ? "to" : "from"
        } ${updated} student${updated === 1 ? "" : "s"}.`,
      });

      return result;
    } catch (err: any) {
      setNotice({
        type: "err",
        msg: err?.message || "Currency adjustment failed.",
      });
      throw err;
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
              Manage the Lakeshore Legends system without editing the database sheets directly.
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
              if (event.key === "Enter") {
                handleLogin();
              }
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
                The spreadsheet stays underneath as the database. Teachers manage the game from here.
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
            <Pill>{students.length} students</Pill>
            <Pill>{homeroomCount} homerooms</Pill>
            <Pill>{unassignedCount} unassigned</Pill>
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

        <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SectionButton
            active={section === "students"}
            title="Students / Import"
            detail="Paste class lists, preview IDs, and add students safely."
            onClick={() => setSection("students")}
          />
          <SectionButton
            active={section === "guilds"}
            title="Guild Manager"
            detail="Assign, move, filter, and unassign students in bulk."
            onClick={() => setSection("guilds")}
          />
          <SectionButton
            active={section === "currency"}
            title="Currency Manager"
            detail="View balances and add or remove XP and Skill Tokens."
            onClick={() => setSection("currency")}
          />
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-3 opacity-55">
            <div className="font-bold text-zinc-400">Inventory Manager</div>
            <div className="mt-1 text-xs leading-5 text-zinc-600">
              Cards, companions, and other player inventory will follow.
            </div>
          </div>
        </div>

        {section === "students" && (
          <AdminPanel
            kicker="Roster Setup"
            title="Bulk Paste Students"
            description="Copy names directly from your school spreadsheet. Choose the class once, paste the names, verify the generated IDs, and import the whole group together."
          >
            <StudentImportPanel
              students={students}
              busy={busy}
              onImport={handleImport}
            />
          </AdminPanel>
        )}

        {section === "guilds" && (
          <AdminPanel
            kicker="Guilds"
            title="Assign / Manage Guilds"
            description="Filter the roster, select any group of students, then move them together. Guild changes are designed to synchronize the roster and HP guild state."
          >
            <GuildManagerPanel
              students={students}
              loading={loading}
              busy={busy}
              onAssign={handleAssignGuild}
              onRefresh={reloadStudents}
            />
          </AdminPanel>
        )}

        {section === "currency" && (
          <AdminPanel
            kicker="Rewards & Corrections"
            title="XP / Skill Token Manager"
            description="See current balances, target a student, guild, class, or filtered group, and add or remove currency with a reason recorded in the transaction logs."
          >
            <CurrencyManagerPanel
              students={students}
              busy={busy}
              onAdjust={handleAdjustCurrency}
            />
          </AdminPanel>
        )}
      </div>
    </div>
  );
}
