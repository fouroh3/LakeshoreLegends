// src/pages/admin/AdminPage.tsx

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  Activity,
  Coins,
  Database,
  Image as ImageIcon,
  PackageOpen,
  PawPrint,
  Shield,
  Sparkles,
  Users,
} from "lucide-react";
import { loadStudents } from "../../data";
import type { Student } from "../../types";
import {
  ADMIN_API_VERSION,
  adminAdjustCurrency,
  adminAdjustInventory,
  adminAdjustSkill,
  adminArchiveStudent,
  adminAssignGuildBatch,
  adminConfigureMedia,
  adminImportStudents,
  adminMoveStudent,
  adminMigratePlayerState,
  adminSystemStatus,
  adminUpdateAbilities,
  adminUpdateCompanion,
  adminUpdateStudent,
  adminUploadMedia,
  type AdminAbilityUpdateResult,
  type AdminArchiveStudentResult,
  type AdminCurrencyAdjustmentResult,
  type AdminImportedStudent,
  type AdminConfigureMediaResult,
  type AdminCompanionUpdateResult,
  type AdminInventoryAdjustmentResult,
  type AdminMediaUploadResult,
  type AdminMoveStudentResult,
  type AdminSkillAdjustmentResult,
  type AdminSystemStatusResult,
  type AdminUpdateStudentResult,
} from "./adminApi";
import {
  clearBattleTeacherToken,
  getBattleTeacherToken,
  loginBattleTeacher,
} from "../battle/battleTeacherApi";
import {
  type AdminAttributeValues,
  type AdminCompanionStatus,
  type AdminCurrency,
  type AdminCurrencyMode,
  type AdminInventoryMode,
  type AdminSkillMode,
  type AdminSection,
} from "./adminConstants";
import { normId } from "./adminRosterUtils";
import StudentImportPanel from "./components/StudentImportPanel";
import StudentManagePanel from "./components/StudentManagePanel";
import GuildManagerPanel from "./components/GuildManagerPanel";
import CurrencyManagerPanel from "./components/CurrencyManagerPanel";
import InventoryManagerPanel from "./components/InventoryManagerPanel";
import AbilitiesManagerPanel from "./components/AbilitiesManagerPanel";
import HeroImageManagerPanel from "./components/HeroImageManagerPanel";
import CompanionManagerPanel from "./components/CompanionManagerPanel";
import StoreSettingsPanel from "./components/StoreSettingsPanel";
import ArchivedStudentsPanel from "./components/ArchivedStudentsPanel";

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
        "w-full rounded-2xl border px-4 py-3 text-left transition",
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
  const [section, setSection] = useState<AdminSection>("overview");
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [systemStatus, setSystemStatus] = useState<AdminSystemStatusResult | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [systemStatusError, setSystemStatusError] = useState(false);
  const [notice, setNotice] = useState<{
    type: "ok" | "err";
    msg: string;
  } | null>(null);

  useEffect(() => {
    if (!notice || notice.type !== "ok") return;

    const timer = window.setTimeout(() => {
      setNotice((current) => (current === notice ? null : current));
    }, 4000);

    return () => window.clearTimeout(timer);
  }, [notice]);

  const reloadStudents = async () => {
    setLoading(true);

    try {
      const data = await loadStudents({ force: true });
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

  const reloadSystemStatus = async () => {
    setStatusLoading(true);
    setSystemStatusError(false);

    try {
      const result = await adminSystemStatus();
      setSystemStatus(result);
    } catch (err: any) {
      const message = String(err?.message || "");

      if (/teacher authorization failed/i.test(message)) {
        clearBattleTeacherToken();
        setSystemStatus(null);
        setSystemStatusError(false);
        setUnlocked(false);
        setNotice({
          type: "err",
          msg: "Teacher session expired. Unlock Global Manager again.",
        });
        return;
      }

      // Keep migration-dependent tools locked, but distinguish a failed
      // health check from a confirmed Player_State migration requirement.
      setSystemStatus(null);
      setSystemStatusError(true);
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    if (unlocked) {
      reloadStudents();
      reloadSystemStatus();
    }
  }, [unlocked]);

  useEffect(() => {
    if (!unlocked) return;

    const refreshOnFocus = () => {
      void reloadStudents();
      void reloadSystemStatus();
    };

    window.addEventListener("focus", refreshOnFocus);
    return () => window.removeEventListener("focus", refreshOnFocus);
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

  const missingHeroCount = useMemo(
    () => students.filter((student) => !String(student.portraitUrl || "").trim()).length,
    [students]
  );

  const missingCompanionCount = useMemo(
    () => students.filter((student) => !String(student.companionUrl || "").trim()).length,
    [students]
  );

  const fallenCompanionCount = useMemo(
    () =>
      students.filter(
        (student) =>
          String(student.companionStatus || "").trim().toLowerCase() ===
          "fallen"
      ).length,
    [students]
  );

  const playerStateReady = Boolean(
    systemStatus?.playerStateReady && systemStatus?.masterLookupWired
  );

  const systemStatusResolved = Boolean(
    !statusLoading && systemStatus !== null
  );
  const systemStatusProblem = systemStatusResolved && !playerStateReady;
  const backendVersionMismatch = Boolean(
    systemStatusResolved && systemStatus?.adminApiVersion !== ADMIN_API_VERSION
  );
  const systemStatusUnavailable = !statusLoading && systemStatusError;

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
    setSystemStatus(null);
    setSystemStatusError(false);
    setNotice(null);
  };

  const handleMigration = async () => {
    const confirmed = window.confirm(
      "Upgrade player-owned data to StudentID-keyed Player_State? A backup of the current Master data will be created first."
    );

    if (!confirmed) return;

    setBusy(true);
    setNotice(null);

    try {
      const result = await adminMigratePlayerState();
      setSystemStatus(result);
      await reloadStudents();
      setNotice({
        type: "ok",
        msg: "Player data migration completed. Student import, archive, and Inventory Manager are now safe to use.",
      });
    } catch (err: any) {
      setNotice({
        type: "err",
        msg: err?.message || "Player data migration failed.",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleImport = async (rows: AdminImportedStudent[]) => {
    if (!rows.length || !playerStateReady) return;

    const confirmed = window.confirm(
      `Import ${rows.length} student${rows.length === 1 ? "" : "s"}?`
    );

    if (!confirmed) return;

    setBusy(true);
    setNotice(null);

    try {
      const result = await adminImportStudents(rows);
      const imported = Array.isArray(result.students) ? result.students : [];
      const importedStudents = imported.map(importedRecordToStudent);

      // The published Master CSV can lag briefly behind Apps Script writes.
      // Reconcile the forced refresh with the backend-confirmed imports so a
      // newly created student never disappears from the live roster while
      // Google finishes propagating the published CSV.
      const refreshed = await loadStudents({ force: true });
      setStudents(() => {
        const byId = new Map(
          (Array.isArray(refreshed) ? refreshed : []).map((student) => [
            normId(student.id),
            student,
          ])
        );

        importedStudents.forEach((student) => {
          const id = normId(student.id);
          if (id && !byId.has(id)) byId.set(id, student);
        });

        return Array.from(byId.values());
      });

      await reloadSystemStatus();
      setNotice({
        type: "ok",
        msg: `Imported ${result.imported ?? rows.length} student${
          (result.imported ?? rows.length) === 1 ? "" : "s"
        }. HP, XP, Skill Token, and Player State were initialized automatically.`,
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

  const handleUpdateStudent = async (args: {
    studentId: string;
    first: string;
    last: string;
  }): Promise<AdminUpdateStudentResult> => {
    setBusy(true);
    setNotice(null);

    try {
      const result = await adminUpdateStudent(args);
      const id = normId(args.studentId);

      setStudents((prev) =>
        prev.map((student) =>
          normId(student.id) === id
            ? { ...student, first: args.first, last: args.last }
            : student
        )
      );

      await reloadStudents();
      setNotice({ type: "ok", msg: `Updated ${args.first} ${args.last}.` });
      return result;
    } catch (err: any) {
      setNotice({
        type: "err",
        msg: err?.message || "Student update failed.",
      });
      throw err;
    } finally {
      setBusy(false);
    }
  };

  const handleMoveStudent = async (args: {
    studentId: string;
    homeroom: string;
    reason: string;
  }): Promise<AdminMoveStudentResult> => {
    setBusy(true);
    setNotice(null);

    try {
      const result = await adminMoveStudent(args);
      const oldId = normId(args.studentId);
      const nextId = normId(result.studentId || args.studentId);

      setStudents((prev) =>
        prev.map((student) =>
          normId(student.id) === oldId
            ? { ...student, id: nextId, homeroom: args.homeroom }
            : student
        )
      );

      setNotice({
        type: "ok",
        msg: `Moved student to ${args.homeroom}. New StudentID: ${nextId}. All linked game state migrated automatically.`,
      });

      // Do not immediately replace the backend-confirmed move with the
      // published Master CSV; Google can briefly publish the old homeroom/ID.
      // The local student already contains the authoritative moved identity
      // while preserving the rest of the migrated player data.
      await reloadSystemStatus();
      return result;
    } catch (err: any) {
      setNotice({
        type: "err",
        msg: err?.message || "Homeroom move failed.",
      });
      throw err;
    } finally {
      setBusy(false);
    }
  };

  const handleConfigureMedia = async (args: {
    token: string;
    branch?: string;
  }): Promise<AdminConfigureMediaResult> => {
    setBusy(true);
    setNotice(null);

    try {
      const result = await adminConfigureMedia(args);
      setSystemStatus((prev) => ({ ...(prev || {}), ...result }));
      setNotice({
        type: "ok",
        msg: "Image storage connected. Hero and companion uploads are ready.",
      });
      return result;
    } catch (err: any) {
      setNotice({ type: "err", msg: err?.message || "Media connection failed." });
      throw err;
    } finally {
      setBusy(false);
    }
  };

  const handleHeroUpload = async (args: {
    studentId: string;
    fileName: string;
    mimeType: string;
    base64: string;
  }): Promise<AdminMediaUploadResult> => {
    const result = await adminUploadMedia({ ...args, kind: "PORTRAIT" });
    const id = normId(args.studentId);
    setStudents((prev) =>
      prev.map((student) =>
        normId(student.id) === id
          ? { ...student, portraitUrl: result.publicUrl || student.portraitUrl }
          : student
      )
    );
    return result;
  };

  const handleCompanionUpload = async (args: {
    studentId: string;
    fileName: string;
    mimeType: string;
    base64: string;
    companionStatus: AdminCompanionStatus;
  }): Promise<AdminMediaUploadResult> => {
    const result = await adminUploadMedia({ ...args, kind: "COMPANION" });
    const id = normId(args.studentId);
    setStudents((prev) =>
      prev.map((student) =>
        normId(student.id) === id
          ? {
              ...student,
              companionUrl: result.publicUrl || student.companionUrl,
              companionStatus: args.companionStatus,
            }
          : student
      )
    );
    return result;
  };

  const handleUpdateCompanion = async (args: {
    studentId: string;
    companionUrl: string;
    companionStatus: AdminCompanionStatus;
  }): Promise<AdminCompanionUpdateResult> => {
    setBusy(true);
    setNotice(null);

    try {
      const result = await adminUpdateCompanion(args);
      const id = normId(args.studentId);
      setStudents((prev) =>
        prev.map((student) =>
          normId(student.id) === id
            ? {
                ...student,
                companionUrl: result.companionUrl ?? args.companionUrl,
                companionStatus: result.companionStatus ?? args.companionStatus,
              }
            : student
        )
      );
      await reloadStudents();
      setNotice({ type: "ok", msg: "Companion record updated." });
      return result;
    } catch (err: any) {
      setNotice({ type: "err", msg: err?.message || "Companion update failed." });
      throw err;
    } finally {
      setBusy(false);
    }
  };

  const handleArchiveStudent = async (args: {
    studentId: string;
    reason: string;
  }): Promise<AdminArchiveStudentResult> => {
    setBusy(true);
    setNotice(null);

    try {
      const result = await adminArchiveStudent(args);
      const id = normId(args.studentId);
      const student = students.find((row) => normId(row.id) === id);

      setStudents((prev) => prev.filter((row) => normId(row.id) !== id));

      // Archive is confirmed by the backend. Avoid an immediate published-CSV
      // reload that can briefly re-add the archived student while Google
      // propagation catches up.
      await reloadSystemStatus();
      setNotice({
        type: "ok",
        msg: `${student ? `${student.first} ${student.last}` : id} archived. Their StudentID and history are preserved and will not be reused.`,
      });
      return result;
    } catch (err: any) {
      setNotice({
        type: "err",
        msg: err?.message || "Student archive failed.",
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
      const result = await adminAssignGuildBatch({ studentIds, guild });
      const changedIds = new Set(studentIds.map(normId));

      setStudents((prev) =>
        prev.map((student) =>
          changedIds.has(normId(student.id)) ? { ...student, guild } : student
        )
      );

      const label = guild || "Unassigned";
      const updated = result.updated ?? studentIds.length;
      await reloadStudents();
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

      await reloadStudents();
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

  const handleUpdateAbilities = async (args: {
    studentId: string;
    baseAttributes: AdminAttributeValues;
    bonusAttributes: AdminAttributeValues;
    rosterSkills: string[];
    reason: string;
  }): Promise<AdminAbilityUpdateResult> => {
    setBusy(true);
    setNotice(null);

    try {
      const result = await adminUpdateAbilities(args);
      const id = normId(args.studentId);
      setStudents((prev) =>
        prev.map((student) =>
          normId(student.id) === id
            ? {
                ...student,
                str: result.baseAttributes.str + result.bonusAttributes.str,
                dex: result.baseAttributes.dex + result.bonusAttributes.dex,
                con: result.baseAttributes.con + result.bonusAttributes.con,
                int: result.baseAttributes.int + result.bonusAttributes.int,
                wis: result.baseAttributes.wis + result.bonusAttributes.wis,
                cha: result.baseAttributes.cha + result.bonusAttributes.cha,
                baseAttributes: result.baseAttributes,
                bonusAttributes: result.bonusAttributes,
                skills: result.rosterSkills,
              }
            : student
        )
      );
      setNotice({
        type: "ok",
        msg: "Updated attributes and roster skills. Changes were recorded in the ability audit log.",
      });
      return result;
    } catch (err: any) {
      setNotice({
        type: "err",
        msg: err?.message || "Ability update failed.",
      });
      throw err;
    } finally {
      setBusy(false);
    }
  };

  const handleAdjustSkill = async (args: {
    studentId: string;
    mode: AdminSkillMode;
    skillName: string;
    reason: string;
  }): Promise<AdminSkillAdjustmentResult> => {
    setBusy(true);
    setNotice(null);

    try {
      const result = await adminAdjustSkill(args);
      const id = normId(args.studentId);
      setStudents((prev) =>
        prev.map((student) =>
          normId(student.id) === id
            ? { ...student, purchasedSkills: result.purchasedSkills }
            : student
        )
      );
      setNotice({
        type: "ok",
        msg: `${args.mode === "GRANT" ? "Granted" : "Revoked"} ${args.skillName}.`,
      });
      return result;
    } catch (err: any) {
      setNotice({
        type: "err",
        msg: err?.message || "Skill change failed.",
      });
      throw err;
    } finally {
      setBusy(false);
    }
  };

  const handleAdjustInventory = async (args: {
    studentIds: string[];
    mode: AdminInventoryMode;
    cardKey: string;
    cardName: string;
    quantity: number;
    reason: string;
  }): Promise<AdminInventoryAdjustmentResult> => {
    setBusy(true);
    setNotice(null);

    try {
      const result = await adminAdjustInventory(args);
      await reloadStudents();
      const updated = result.updated ?? args.studentIds.length;
      setNotice({
        type: "ok",
        msg: `${args.mode === "GIVE" ? "Gave" : "Removed"} ${args.quantity} × ${args.cardName} ${
          args.mode === "GIVE" ? "to" : "from"
        } ${updated} student${updated === 1 ? "" : "s"}.`,
      });
      return result;
    } catch (err: any) {
      setNotice({
        type: "err",
        msg: err?.message || "Inventory adjustment failed.",
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
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-200/70">Teacher Admin</div>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-white">Global Manager</h1>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Manage the Lakeshore Legends system without editing the database sheets directly.
            </p>
          </div>

          {notice && (
            <div className={[
              "mb-4 rounded-2xl border px-4 py-3 text-sm",
              notice.type === "ok"
                ? "border-emerald-400/20 bg-emerald-950/30 text-emerald-100"
                : "border-red-400/20 bg-red-950/30 text-red-100",
            ].join(" ")}>
              {notice.msg}
            </div>
          )}

          <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Teacher passcode</label>
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
          <a href="/" className="mt-4 block text-center text-sm font-semibold text-cyan-200/80 hover:text-cyan-100">
            Back to dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.10),transparent_42%),#070707] px-3 py-5 text-zinc-100 sm:px-5">
      <div className="mx-auto max-w-[1700px]">
        <header className="mb-4 rounded-[26px] border border-white/10 bg-zinc-950/70 px-5 py-4 shadow-[0_20px_70px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-200/70">Teacher Admin</div>
              <h1 className="mt-1 text-3xl font-black tracking-tight text-white">Global Manager</h1>
              <p className="mt-1.5 max-w-3xl text-sm leading-5 text-zinc-400">
                The spreadsheet stays underneath as the database. Teachers manage the game from here.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <a href="/" className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-zinc-200 hover:bg-white/[0.08]">Dashboard</a>
              <a href="/battle/teacher" className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm font-bold text-cyan-100 hover:bg-cyan-300/15">Live Battle Console</a>
              <button type="button" onClick={handleLock} className="rounded-2xl border border-red-300/20 bg-red-950/30 px-4 py-2 text-sm font-bold text-red-100 hover:bg-red-950/50">Lock</button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Pill>{students.length} students</Pill>
            <Pill>{homeroomCount} homerooms</Pill>
            <Pill>{unassignedCount} unassigned</Pill>
            {loading && <Pill>Refreshing roster</Pill>}
            {playerStateReady && <Pill>Player State protected</Pill>}
          </div>
        </header>

        {notice && (
          <div
            className="pointer-events-none fixed inset-x-3 top-3 z-[100] flex justify-end sm:left-auto sm:right-5 sm:top-5 sm:w-[420px]"
            aria-live={notice.type === "err" ? "assertive" : "polite"}
            role={notice.type === "err" ? "alert" : "status"}
          >
            <div
              className={[
                "pointer-events-auto flex w-full items-start gap-3 rounded-2xl border px-4 py-3.5 text-sm font-medium shadow-[0_18px_55px_rgba(0,0,0,0.45)] backdrop-blur-xl",
                notice.type === "ok"
                  ? "border-emerald-300/25 bg-emerald-950/90 text-emerald-50"
                  : "border-red-300/25 bg-red-950/90 text-red-50",
              ].join(" ")}
            >
              <div className="min-w-0 flex-1 leading-5">{notice.msg}</div>
              <button
                type="button"
                onClick={() => setNotice(null)}
                className="shrink-0 rounded-lg px-2 py-0.5 text-lg leading-none text-white/55 transition hover:bg-white/10 hover:text-white"
                aria-label="Dismiss message"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {backendVersionMismatch && (
          <div className="mb-5 rounded-[26px] border border-red-300/25 bg-red-950/20 p-4 sm:p-5">
            <div className="font-black text-red-100">Global Manager backend update required</div>
            <p className="mt-1 max-w-4xl text-sm leading-6 text-red-100/70">
              This browser is running Admin API {ADMIN_API_VERSION}, but the deployed Apps Script reports {systemStatus?.adminApiVersion || "an older build"}. Replace the Web App with the current full Apps Script file and deploy a new version before using management tools.
            </p>
          </div>
        )}

        {systemStatusProblem && (
          <div className="mb-5 rounded-[26px] border border-amber-300/25 bg-amber-950/20 p-4 sm:p-5">
            <div className="font-black text-amber-100">One-time player data upgrade required</div>
            <p className="mt-1 max-w-4xl text-sm leading-6 text-amber-100/70">
              Some player-owned data is still tied to spreadsheet row position. Import, archive, and card management are locked until it is moved into StudentID-keyed Player_State. The upgrade creates a backup before changing Master.
            </p>
            <button
              type="button"
              onClick={handleMigration}
              disabled={busy || statusLoading}
              className="mt-3 rounded-2xl bg-amber-300 px-4 py-2.5 text-sm font-black text-zinc-950 disabled:opacity-50"
            >
              {busy ? "Upgrading..." : "Protect Player Data"}
            </button>
          </div>
        )}

        {systemStatusUnavailable && (
          <div className="mb-5 rounded-[26px] border border-red-300/20 bg-red-950/20 p-4 sm:p-5">
            <div className="font-black text-red-100">Could not verify player data health</div>
            <p className="mt-1 max-w-4xl text-sm leading-6 text-red-100/65">
              Global Manager could not complete its system-health check. Player-management tools remain locked until the check succeeds; this does not mean a data upgrade is required.
            </p>
            <button
              type="button"
              onClick={() => void reloadSystemStatus()}
              disabled={statusLoading}
              className="mt-3 rounded-2xl border border-red-200/20 bg-red-200/10 px-4 py-2.5 text-sm font-black text-red-50 transition hover:bg-red-200/15 disabled:opacity-50"
            >
              {statusLoading ? "Checking..." : "Retry Health Check"}
            </button>
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-[270px_minmax(0,1fr)]">
          <aside className="self-start rounded-[28px] border border-white/10 bg-zinc-950/65 p-3 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:overscroll-contain">
            <div className="px-3 pb-2 pt-2 text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">
              Overview
            </div>
            <SectionButton
              active={section === "overview"}
              title="Control Center"
              detail="See what needs attention and jump to common tasks."
              onClick={() => setSection("overview")}
            />

            <div className="px-3 pb-2 pt-5 text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">
              Players
            </div>
            <div className="space-y-2">
              <SectionButton
                active={section === "students"}
                title="Roster & Demographics"
                detail="Import, rename, move classes, or archive students."
                onClick={() => setSection("students")}
              />
              <SectionButton
                active={section === "heroImages"}
                title="Hero Images"
                detail="Bulk-match and upload student portraits."
                onClick={() => setSection("heroImages")}
              />
            </div>

            <div className="px-3 pb-2 pt-5 text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">
              Characters
            </div>
            <div className="space-y-2">
              <SectionButton
                active={section === "companions"}
                title="Companions"
                detail="Images, living/fallen status, and replacements."
                onClick={() => setSection("companions")}
              />
              <SectionButton
                active={section === "abilities"}
                title="Attributes & Skills"
                detail="Base values, bonuses, roster skills, and grants."
                onClick={() => setSection("abilities")}
              />
              <SectionButton
                active={section === "inventory"}
                title="Inventory & Cards"
                detail="Give or remove cards for any group."
                onClick={() => setSection("inventory")}
              />
            </div>

            <div className="px-3 pb-2 pt-5 text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">
              Groups & Rewards
            </div>
            <div className="space-y-2">
              <SectionButton
                active={section === "guilds"}
                title="Guilds"
                detail="Assign and move students in bulk."
                onClick={() => setSection("guilds")}
              />
              <SectionButton
                active={section === "currency"}
                title="XP & Skill Tokens"
                detail="Balances, rewards, and corrections."
                onClick={() => setSection("currency")}
              />
              <SectionButton
                active={section === "store"}
                title="Store"
                detail="Open/close, PIN, costs, and purchase limits."
                onClick={() => setSection("store")}
              />
            </div>

            <div className="px-3 pb-2 pt-5 text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">
              System
            </div>
            <SectionButton
              active={section === "system"}
              title="Data Health"
              detail="Player State, media connection, and integrity checks."
              onClick={() => setSection("system")}
            />
          </aside>

          <main className="min-w-0">
            {section === "overview" && (
              <div className="space-y-5">
                <AdminPanel
                  kicker="Teacher Control Center"
                  title="Everything important, at a glance"
                  description="Use the cards below to jump directly to the task you need. Live battle controls remain separate in the Battle Console."
                >
                  {(missingHeroCount > 0 ||
                    missingCompanionCount > 0 ||
                    unassignedCount > 0 ||
                    fallenCompanionCount > 0 ||
                    systemStatusProblem ||
                    systemStatusUnavailable) && (
                    <div className="mb-4 rounded-[22px] border border-amber-300/15 bg-[linear-gradient(135deg,rgba(245,158,11,0.08),rgba(17,24,39,0.28))] px-4 py-3.5">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 rounded-xl border border-amber-300/15 bg-amber-300/10 p-2 text-amber-100">
                            <Activity size={17} />
                          </div>
                          <div>
                            <div className="text-sm font-black text-amber-50">Needs Attention</div>
                            <div className="mt-0.5 text-xs leading-5 text-amber-100/55">
                              These are the current setup or maintenance items worth checking.
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {missingHeroCount > 0 && (
                            <button type="button" onClick={() => setSection("heroImages")} className="rounded-full border border-amber-300/15 bg-black/20 px-3 py-1.5 text-xs font-bold text-amber-100 transition hover:border-amber-200/30 hover:bg-amber-300/10">
                              {missingHeroCount} hero images
                            </button>
                          )}
                          {missingCompanionCount > 0 && (
                            <button type="button" onClick={() => setSection("companions")} className="rounded-full border border-amber-300/15 bg-black/20 px-3 py-1.5 text-xs font-bold text-amber-100 transition hover:border-amber-200/30 hover:bg-amber-300/10">
                              {missingCompanionCount} companions
                            </button>
                          )}
                          {fallenCompanionCount > 0 && (
                            <button type="button" onClick={() => setSection("companions")} className="rounded-full border border-red-300/15 bg-red-950/20 px-3 py-1.5 text-xs font-bold text-red-100 transition hover:border-red-200/30 hover:bg-red-950/35">
                              {fallenCompanionCount} fallen
                            </button>
                          )}
                          {unassignedCount > 0 && (
                            <button type="button" onClick={() => setSection("guilds")} className="rounded-full border border-amber-300/15 bg-black/20 px-3 py-1.5 text-xs font-bold text-amber-100 transition hover:border-amber-200/30 hover:bg-amber-300/10">
                              {unassignedCount} unassigned guilds
                            </button>
                          )}
                          {(systemStatusProblem || systemStatusUnavailable) && (
                            <button type="button" onClick={() => setSection("system")} className="rounded-full border border-red-300/20 bg-red-950/25 px-3 py-1.5 text-xs font-bold text-red-100 transition hover:border-red-200/35 hover:bg-red-950/40">
                              {systemStatusUnavailable ? "Health check failed" : "Game data"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {[
                      {
                        label: "Active Players",
                        value: students.length,
                        icon: <Users size={20} />,
                        section: "students" as AdminSection,
                        tone: "text-cyan-100",
                        iconTone: "text-cyan-100",
                        surface: "hover:border-cyan-300/30 hover:bg-cyan-300/[0.055]",
                      },
                      {
                        label: "Missing Hero Images",
                        value: missingHeroCount,
                        icon: <ImageIcon size={20} />,
                        section: "heroImages" as AdminSection,
                        tone: missingHeroCount ? "text-amber-100" : "text-emerald-100",
                        iconTone: missingHeroCount ? "text-amber-100" : "text-emerald-100",
                        surface: missingHeroCount
                          ? "hover:border-amber-300/30 hover:bg-amber-300/[0.055]"
                          : "hover:border-emerald-300/30 hover:bg-emerald-300/[0.05]",
                      },
                      {
                        label: "Missing Companions",
                        value: missingCompanionCount,
                        icon: <PawPrint size={20} />,
                        section: "companions" as AdminSection,
                        tone: missingCompanionCount ? "text-amber-100" : "text-emerald-100",
                        iconTone: missingCompanionCount ? "text-amber-100" : "text-emerald-100",
                        surface: missingCompanionCount
                          ? "hover:border-amber-300/30 hover:bg-amber-300/[0.055]"
                          : "hover:border-emerald-300/30 hover:bg-emerald-300/[0.05]",
                      },
                      {
                        label: "Unassigned Guilds",
                        value: unassignedCount,
                        icon: <Shield size={20} />,
                        section: "guilds" as AdminSection,
                        tone: unassignedCount ? "text-amber-100" : "text-emerald-100",
                        iconTone: unassignedCount ? "text-amber-100" : "text-emerald-100",
                        surface: unassignedCount
                          ? "hover:border-amber-300/30 hover:bg-amber-300/[0.055]"
                          : "hover:border-emerald-300/30 hover:bg-emerald-300/[0.05]",
                      },
                      {
                        label: "Fallen Companions",
                        value: fallenCompanionCount,
                        icon: <PawPrint size={20} />,
                        section: "companions" as AdminSection,
                        tone: fallenCompanionCount ? "text-red-100" : "text-emerald-100",
                        iconTone: fallenCompanionCount ? "text-red-100" : "text-emerald-100",
                        surface: fallenCompanionCount
                          ? "hover:border-red-300/30 hover:bg-red-300/[0.05]"
                          : "hover:border-emerald-300/30 hover:bg-emerald-300/[0.05]",
                      },
                      {
                        label: "Game Data",
                        value: systemStatusUnavailable
                          ? "Check failed"
                          : !systemStatusResolved
                          ? "Checking…"
                          : playerStateReady
                          ? "Healthy"
                          : "Needs attention",
                        icon: <Database size={20} />,
                        section: "system" as AdminSection,
                        tone: systemStatusUnavailable
                          ? "text-red-100"
                          : !systemStatusResolved
                          ? "text-zinc-300"
                          : playerStateReady
                          ? "text-emerald-100"
                          : "text-red-100",
                        iconTone: systemStatusUnavailable
                          ? "text-red-100"
                          : !systemStatusResolved
                          ? "text-zinc-400"
                          : playerStateReady
                          ? "text-emerald-100"
                          : "text-red-100",
                        surface: systemStatusUnavailable
                          ? "hover:border-red-300/30 hover:bg-red-300/[0.05]"
                          : !systemStatusResolved
                          ? "hover:border-white/20 hover:bg-white/[0.045]"
                          : playerStateReady
                          ? "hover:border-emerald-300/30 hover:bg-emerald-300/[0.05]"
                          : "hover:border-red-300/30 hover:bg-red-300/[0.05]",
                      },
                    ].map((card) => (
                      <button
                        key={card.label}
                        type="button"
                        onClick={() => setSection(card.section)}
                        className={[
                          "group cursor-pointer rounded-[24px] border border-white/10 bg-white/[0.03] p-4 text-left transition-all duration-200",
                          "hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(0,0,0,0.24)]",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/40",
                          card.surface,
                        ].join(" ")}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className={`rounded-2xl border border-white/10 bg-black/25 p-2.5 ${card.iconTone}`}>
                            {card.icon}
                          </div>
                          <div className={`text-2xl font-black ${card.tone}`}>{card.value}</div>
                        </div>
                        <div className="mt-4 flex items-end justify-between gap-3">
                          <div>
                            <div className="text-sm font-black text-white">{card.label}</div>
                            <div className="mt-1 text-xs text-zinc-600 transition group-hover:text-zinc-400">Open manager</div>
                          </div>
                          <div className="translate-x-0 text-lg text-zinc-700 transition group-hover:translate-x-1 group-hover:text-white/70">→</div>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <button type="button" onClick={() => setSection("students")} className="rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.06] p-4 text-left hover:bg-cyan-300/[0.09]">
                      <Users size={19} className="text-cyan-100" />
                      <div className="mt-3 font-black text-white">Add / Move Students</div>
                      <div className="mt-1 text-xs leading-5 text-zinc-500">Beginning-of-year import, corrections, class changes.</div>
                    </button>
                    <button type="button" onClick={() => setSection("heroImages")} className="rounded-2xl border border-violet-300/15 bg-violet-300/[0.05] p-4 text-left hover:bg-violet-300/[0.08]">
                      <ImageIcon size={19} className="text-violet-100" />
                      <div className="mt-3 font-black text-white">Import Hero Images</div>
                      <div className="mt-1 text-xs leading-5 text-zinc-500">Drop a whole folder and review only uncertain matches.</div>
                    </button>
                    <button type="button" onClick={() => setSection("currency")} className="rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.05] p-4 text-left hover:bg-emerald-300/[0.08]">
                      <Coins size={19} className="text-emerald-100" />
                      <div className="mt-3 font-black text-white">Give Rewards</div>
                      <div className="mt-1 text-xs leading-5 text-zinc-500">XP or Skill Tokens to students, guilds, or classes.</div>
                    </button>
                    <button type="button" onClick={() => setSection("inventory")} className="rounded-2xl border border-amber-300/15 bg-amber-300/[0.05] p-4 text-left hover:bg-amber-300/[0.08]">
                      <PackageOpen size={19} className="text-amber-100" />
                      <div className="mt-3 font-black text-white">Manage Cards</div>
                      <div className="mt-1 text-xs leading-5 text-zinc-500">View, give, or remove inventory cards.</div>
                    </button>
                  </div>
                </AdminPanel>
              </div>
            )}

            {section === "students" && (
              <div className="space-y-5">
                <AdminPanel
                  kicker="Roster Setup"
                  title="Bulk Paste Students"
                  description="Copy names directly from your school spreadsheet. Choose the class once, paste the names, verify the generated IDs, and import the whole group together."
                >
                  <StudentImportPanel
                    students={students}
                    busy={busy || !playerStateReady}
                    onImport={handleImport}
                  />
                </AdminPanel>

                <AdminPanel
                  kicker="Active Roster"
                  title="Roster & Demographics"
                  description="Fix names, move students between homerooms with full game-state migration, or archive students without losing their history."
                >
                  <StudentManagePanel
                    students={students}
                    busy={busy || !playerStateReady}
                    onUpdate={handleUpdateStudent}
                    onMove={handleMoveStudent}
                    onArchive={handleArchiveStudent}
                  />
                </AdminPanel>

                <AdminPanel
                  kicker="Archived Roster"
                  title="Restore or Permanently Delete"
                  description="Archived students stay recoverable and keep their StudentID reserved. Restore mistakes safely, or permanently erase their stored game data when you are certain it is no longer needed."
                >
                  <ArchivedStudentsPanel onRosterChanged={reloadStudents} />
                </AdminPanel>
              </div>
            )}

            {section === "heroImages" && (
              <AdminPanel
                kicker="Player Media"
                title="Hero Image Import"
                description="Drop a whole batch of student hero images. Global Manager matches filenames automatically, flags only uncertain rows, and updates PortraitURL after upload."
              >
                <HeroImageManagerPanel
                  students={students}
                  busy={busy}
                  mediaConfigured={Boolean(systemStatus?.mediaConfigured)}
                  mediaRepo={systemStatus?.mediaRepo}
                  mediaBranch={systemStatus?.mediaBranch}
                  onConfigureMedia={handleConfigureMedia}
                  onUpload={handleHeroUpload}
                />
              </AdminPanel>
            )}

            {section === "companions" && (
              <AdminPanel
                kicker="Companion Records"
                title="Companion Manager"
                description="Upload or replace companion images, remove outdated images, and set each companion to Living or Fallen without touching Player_State or class sheets."
              >
                <CompanionManagerPanel
                  students={students}
                  busy={busy || !playerStateReady}
                  mediaConfigured={Boolean(systemStatus?.mediaConfigured)}
                  onUpload={handleCompanionUpload}
                  onUpdate={handleUpdateCompanion}
                />
              </AdminPanel>
            )}

            {section === "guilds" && (
              <AdminPanel
                kicker="Guilds"
                title="Assign / Manage Guilds"
                description="Filter the roster, select any group of students, then move them together. Guild changes synchronize the roster and HP guild state."
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

            {section === "abilities" && (
              <AdminPanel
                kicker="Attributes & Skills"
                title="Abilities Manager"
                description="Correct base attributes, purchased/admin bonuses, roster skills, and purchased or teacher-granted skills without editing class sheets by hand."
              >
                <AbilitiesManagerPanel
                  students={students}
                  busy={busy || !playerStateReady}
                  onSave={handleUpdateAbilities}
                  onAdjustSkill={handleAdjustSkill}
                />
              </AdminPanel>
            )}

            {section === "inventory" && (
              <AdminPanel
                kicker="Cards & Rewards"
                title="Inventory / Card Manager"
                description="Choose any card from the live card library, target students by class or guild, and give or remove cards with an audit reason."
              >
                <InventoryManagerPanel
                  students={students}
                  busy={busy || !playerStateReady}
                  onAdjust={handleAdjustInventory}
                />
              </AdminPanel>
            )}

            {section === "store" && (
              <AdminPanel
                kicker="Student Store"
                title="Store Settings"
                description="Open or close student purchases, change the purchase PIN, and set the live XP and Skill Token costs without touching Store_Control."
              >
                <StoreSettingsPanel />
              </AdminPanel>
            )}

            {section === "system" && (
              <AdminPanel
                kicker="System Health"
                title="Data Health & Connections"
                description="A plain-language view of the protections underneath the game. Normal teacher work should never require opening these sheets directly."
              >
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                    <Database size={20} className={playerStateReady ? "text-emerald-200" : "text-red-200"} />
                    <div className="mt-3 font-black text-white">Player Data</div>
                    <div className={`mt-1 text-sm font-bold ${playerStateReady ? "text-emerald-100" : "text-red-100"}`}>
                      {playerStateReady ? "Healthy & StudentID-keyed" : "Needs attention"}
                    </div>
                    <div className="mt-2 text-xs leading-5 text-zinc-500">
                      {systemStatus?.playerStateRows ?? 0} Player_State records • ID integrity {systemStatus?.idIntegrityOk ? "passed" : "not confirmed"}
                    </div>
                  </div>
                  <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                    <ImageIcon size={20} className={systemStatus?.mediaConfigured ? "text-emerald-200" : "text-amber-200"} />
                    <div className="mt-3 font-black text-white">Image Storage</div>
                    <div className={`mt-1 text-sm font-bold ${systemStatus?.mediaConfigured ? "text-emerald-100" : "text-amber-100"}`}>
                      {systemStatus?.mediaConfigured ? "Connected" : "Not connected"}
                    </div>
                    <div className="mt-2 text-xs leading-5 text-zinc-500">
                      {systemStatus?.mediaRepo || "LakeshoreLegends"}{systemStatus?.mediaBranch ? ` • ${systemStatus.mediaBranch}` : ""}
                    </div>
                  </div>
                  <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                    <Sparkles size={20} className="text-cyan-200" />
                    <div className="mt-3 font-black text-white">Teacher Tools</div>
                    <div className="mt-1 text-sm font-bold text-cyan-100">Ready</div>
                    <button type="button" onClick={reloadSystemStatus} disabled={statusLoading} className="mt-3 rounded-xl border border-cyan-300/15 bg-cyan-300/10 px-3 py-2 text-xs font-black text-cyan-100 disabled:opacity-50">
                      {statusLoading ? "Checking..." : "Recheck System"}
                    </button>
                  </div>
                </div>
              </AdminPanel>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
