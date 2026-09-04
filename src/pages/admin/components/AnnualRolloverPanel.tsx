// src/pages/admin/components/AnnualRolloverPanel.tsx

import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  CheckCircle2,
  ExternalLink,
  GraduationCap,
  RefreshCcw,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { getFinalExaminerState } from "../../battle/finalExaminerApi";
import {
  adminStartNewSchoolYear,
  adminYearRolloverPreview,
  type AdminStartNewSchoolYearResult,
  type AdminYearRolloverPreviewResult,
} from "../adminApi";

const CONFIRMATION = "START NEW SCHOOL YEAR";

type RolloverNotice = {
  type: "ok" | "err";
  msg: string;
} | null;

type Props = {
  onCompleted?: (result: AdminStartNewSchoolYearResult) => void | Promise<void>;
};

function StatCard({
  label,
  value,
  detail,
  tone = "zinc",
}: {
  label: string;
  value: string | number;
  detail: string;
  tone?: "zinc" | "amber" | "red" | "cyan";
}) {
  const toneClass =
    tone === "red"
      ? "border-red-300/15 bg-red-400/[0.055] text-red-100"
      : tone === "amber"
      ? "border-amber-300/15 bg-amber-400/[0.055] text-amber-100"
      : tone === "cyan"
      ? "border-cyan-300/15 bg-cyan-400/[0.055] text-cyan-100"
      : "border-white/[0.07] bg-black/20 text-white";

  return (
    <div className={`rounded-[22px] border p-4 ${toneClass}`}>
      <div className="text-[10px] font-black uppercase tracking-[0.18em] opacity-55">
        {label}
      </div>
      <div className="mt-1 text-2xl font-black tracking-tight">{value}</div>
      <div className="mt-1 text-xs leading-5 opacity-55">{detail}</div>
    </div>
  );
}

export default function AnnualRolloverPanel({ onCompleted }: Props) {
  const [preview, setPreview] = useState<AdminYearRolloverPreviewResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<RolloverNotice>(null);
  const [archiveLabel, setArchiveLabel] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [result, setResult] = useState<AdminStartNewSchoolYearResult | null>(null);
  const [finalExaminerActive, setFinalExaminerActive] = useState(false);

  const loadPreview = async () => {
    setLoading(true);
    setError("");
    setNotice(null);

    try {
      const [next, finalExaminer] = await Promise.all([
        adminYearRolloverPreview(),
        getFinalExaminerState(),
      ]);
      setPreview(next);
      setFinalExaminerActive(
        Boolean(finalExaminer.active && finalExaminer.phase !== "VICTORY")
      );
    } catch (err: any) {
      const message =
        err?.message ||
        "Could not verify the school-year rollover preview and battle state.";

      setPreview(null);
      setFinalExaminerActive(false);
      setError(message);
      setNotice({ type: "err", msg: message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPreview();
  }, []);

  const activeBattles = preview?.activeBattles ?? [];
  const exactConfirmation = confirmation === CONFIRMATION;
  const canRun =
    !!preview &&
    !loading &&
    !running &&
    activeBattles.length === 0 &&
    !finalExaminerActive &&
    archiveLabel.trim().length > 0 &&
    acknowledged &&
    exactConfirmation;

  const firstIdEntries = useMemo(
    () =>
      Object.entries(preview?.firstIds ?? {}).sort((a, b) =>
        a[0].localeCompare(b[0], "en", { numeric: true })
      ),
    [preview?.firstIds]
  );

  const startRollover = async () => {
    if (!canRun) return;

    setRunning(true);
    setError("");
    setNotice(null);
    setResult(null);

    try {
      // Re-check immediately before the destructive call so a Final Examiner
      // raid that started after the preview cannot slip through the UI guard.
      const finalExaminer = await getFinalExaminerState();
      if (finalExaminer.active && finalExaminer.phase !== "VICTORY") {
        setFinalExaminerActive(true);
        throw new Error(
          "End the active Final Examiner raid before starting a new school year."
        );
      }

      const next = await adminStartNewSchoolYear({
        archiveLabel: archiveLabel.trim(),
        confirmation,
        acknowledged,
      });

      setResult(next);
      setNotice({
        type: "ok",
        msg: `New school year is ready. ${next.archiveLabel} was archived successfully and the live student layer was reset.`,
      });
      setFinalExaminerActive(false);
      setPreview((current) =>
        current
          ? {
              ...current,
              activeStudents: 0,
              reservedStudentIds: 0,
              archivedStudents: 0,
              movedDeletedReservations: 0,
              mediaObjects: 0,
              activeBattles: [],
            }
          : current
      );
      setAcknowledged(false);
      setConfirmation("");
      await onCompleted?.(next);
    } catch (err: any) {
      const message = err?.message || "New school year reset failed.";
      setError(message);
      setNotice({ type: "err", msg: message });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-5">
      {notice && (
        <div
          className="pointer-events-none fixed inset-x-3 top-3 z-[100] flex justify-end sm:left-auto sm:right-5 sm:top-5 sm:w-[420px]"
          aria-live={notice.type === "err" ? "assertive" : "polite"}
          role={notice.type === "err" ? "alert" : "status"}
        >
          <div
            className={[
              "pointer-events-auto flex max-h-[70vh] w-full items-start gap-3 overflow-y-auto rounded-2xl border px-4 py-3.5 text-sm font-medium shadow-[0_18px_55px_rgba(0,0,0,0.45)] backdrop-blur-xl",
              notice.type === "ok"
                ? "border-emerald-300/25 bg-emerald-950/90 text-emerald-50"
                : "border-red-300/25 bg-red-950/90 text-red-50",
            ].join(" ")}
          >
            {notice.type === "ok" ? (
              <CheckCircle2
                size={19}
                className="mt-0.5 shrink-0 text-emerald-200"
              />
            ) : (
              <ShieldAlert
                size={19}
                className="mt-0.5 shrink-0 text-red-200"
              />
            )}

            <div className="min-w-0 flex-1 leading-6">{notice.msg}</div>

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

      <div className="overflow-hidden rounded-[28px] border border-amber-300/16 bg-[linear-gradient(135deg,rgba(120,53,15,0.20),rgba(35,14,8,0.72)_48%,rgba(10,10,12,0.92))] shadow-[0_20px_70px_rgba(0,0,0,0.28)]">
        <div className="relative p-5 sm:p-6">
          <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-amber-400/[0.07] blur-3xl" />
          <div className="relative flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-amber-200/75">
                <GraduationCap size={17} />
                Annual Rollover
              </div>
              <h3 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
                Archive this year. Start the next roster at 001.
              </h3>
              <p className="mt-2 text-sm leading-6 text-zinc-300/75">
                This is the once-a-year reset. Global Manager first creates a frozen Google Sheets archive of the current game database. Only after that archive succeeds will the live student roster, StudentID reservations, player state, old battle runtime, and student media be cleared.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadPreview()}
              disabled={loading || running}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-black/25 px-4 py-2.5 text-sm font-black text-zinc-200 transition hover:border-white/20 hover:bg-white/[0.05] disabled:opacity-40"
            >
              <RefreshCcw size={15} className={loading ? "animate-spin" : ""} />
              {loading ? "Checking..." : "Refresh Preview"}
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="sr-only" role="alert">
          {error}
        </div>
      ) : null}

      {result && (
        <div className="rounded-[26px] border border-emerald-300/20 bg-emerald-400/[0.07] p-5 shadow-[0_0_34px_rgba(52,211,153,0.08)]">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={22} className="mt-0.5 shrink-0 text-emerald-200" />
            <div className="min-w-0 flex-1">
              <div className="text-lg font-black text-emerald-50">
                New school year is ready.
              </div>
              <p className="mt-1 text-sm leading-6 text-emerald-100/65">
                Live StudentIDs are released and the next fresh roster can begin at 001. The Store was closed automatically.
              </p>
              <a
                href={result.archiveUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-2 rounded-xl border border-emerald-200/20 bg-emerald-300/10 px-3 py-2 text-sm font-black text-emerald-100 transition hover:bg-emerald-300/15"
              >
                <Archive size={15} />
                Open {result.archiveLabel} Archive
                <ExternalLink size={14} />
              </a>
              {result.media?.failed ? (
                <div className="mt-3 text-xs leading-5 text-amber-200/75">
                  Student data reset successfully, but {result.media.failed} old media object
                  {result.media.failed === 1 ? "" : "s"} could not be removed from R2. The archive is safe and the new roster can still be imported.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Active Players"
          value={loading ? "…" : preview?.activeStudents ?? "—"}
          detail="Live roster rows that will be emptied."
          tone="red"
        />
        <StatCard
          label="Reserved IDs"
          value={loading ? "…" : preview?.reservedStudentIds ?? "—"}
          detail="Active, archived, moved, and deleted IDs released."
          tone="amber"
        />
        <StatCard
          label="Archived"
          value={loading ? "…" : preview?.archivedStudents ?? "—"}
          detail="Archived students preserved in the year snapshot."
        />
        <StatCard
          label="R2 Media"
          value={loading ? "…" : preview?.mediaObjects ?? "—"}
          detail="Managed hero/companion files queued for cleanup."
          tone="cyan"
        />
        <StatCard
          label="Archive Sheets"
          value={loading ? "…" : preview?.archiveSheetCount ?? "—"}
          detail="Live workbook sheets copied before reset."
        />
      </div>

      {(activeBattles.length > 0 || finalExaminerActive) && (
        <div className="rounded-[24px] border border-red-300/25 bg-red-500/[0.09] p-4">
          <div className="flex items-start gap-3">
            <ShieldAlert size={21} className="mt-0.5 shrink-0 text-red-200" />
            <div>
              <div className="font-black text-red-50">End active battles first.</div>
              <div className="mt-1 text-sm leading-6 text-red-100/70">
                {activeBattles.length > 0
                  ? `Regular battle activity: ${activeBattles.join(", ")}. `
                  : ""}
                {finalExaminerActive
                  ? "The Final Examiner raid is also active. "
                  : ""}
                Annual rollover stays locked until all active battles are finished.
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.72fr)]">
        <div className="rounded-[26px] border border-white/[0.08] bg-black/20 p-5">
          <div className="flex items-center gap-2 text-sm font-black text-white">
            <Archive size={18} className="text-cyan-200" />
            What gets preserved
          </div>
          <div className="mt-3 grid gap-2 text-sm leading-6 text-zinc-400 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3">
              <span className="font-bold text-zinc-200">Frozen year archive</span>
              <br />Every current spreadsheet sheet is copied to a separate Google Spreadsheet and formulas are frozen to values.
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3">
              <span className="font-bold text-zinc-200">Game configuration</span>
              <br />Store PIN/cost rules, R2 connection, quest configuration, and the Global Manager itself stay configured.
            </div>
          </div>

          <div className="mt-5 flex items-center gap-2 text-sm font-black text-white">
            <Trash2 size={18} className="text-red-200" />
            What resets live
          </div>
          <div className="mt-3 grid gap-2 text-sm leading-6 text-zinc-400 sm:grid-cols-2">
            <div className="rounded-2xl border border-red-300/[0.08] bg-red-400/[0.025] p-3">
              Student roster, guilds, attributes, skills, HP, XP, Skill Tokens, inventory, companions, portraits, archives, and ID tombstones.
            </div>
            <div className="rounded-2xl border border-red-300/[0.08] bg-red-400/[0.025] p-3">
              Old boss/battle runtime and logs are cleared so next year cannot inherit last year’s battle state. The Store is forced closed.
            </div>
          </div>

          <div className="mt-5 rounded-[22px] border border-cyan-300/12 bg-cyan-400/[0.045] p-4">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200/65">
              Fresh StudentID namespace
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {firstIdEntries.map(([homeroom, studentId]) => (
                <span
                  key={homeroom}
                  className="rounded-full border border-cyan-300/12 bg-black/25 px-2.5 py-1 font-mono text-[11px] font-bold text-cyan-100/80"
                >
                  {homeroom} → {studentId}
                </span>
              ))}
            </div>
            <p className="mt-3 text-xs leading-5 text-cyan-100/55">
              Fresh batch imports are assigned alphabetically inside each homeroom. Mid-year additions never renumber existing students.
            </p>
          </div>
        </div>

        <div className="rounded-[26px] border border-red-300/16 bg-[linear-gradient(180deg,rgba(69,10,10,0.20),rgba(14,7,9,0.72))] p-5">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-red-200/65">
            Final Confirmation
          </div>
          <div className="mt-1 text-xl font-black text-white">Start New School Year</div>
          <p className="mt-2 text-sm leading-6 text-red-100/60">
            Do not run this for normal student changes. Archive/Restore remains the correct tool during the school year.
          </p>

          <label className="mt-5 block text-[11px] font-black uppercase tracking-[0.16em] text-zinc-500">
            School year being archived
          </label>
          <input
            value={archiveLabel}
            onChange={(event) => setArchiveLabel(event.target.value)}
            disabled={running}
            placeholder="Example: 2026-27"
            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm font-semibold text-white outline-none ring-amber-300/20 placeholder:text-zinc-700 focus:ring-2 disabled:opacity-50"
          />

          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-white/[0.07] bg-black/20 p-3">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(event) => setAcknowledged(event.target.checked)}
              disabled={running}
              className="mt-1 h-4 w-4 accent-red-400"
            />
            <span className="text-xs leading-5 text-zinc-400">
              I understand this empties the live student year after the archive is created, and old StudentIDs will become reusable.
            </span>
          </label>

          <label className="mt-4 block text-[11px] font-black uppercase tracking-[0.16em] text-zinc-500">
            Type {CONFIRMATION}
          </label>
          <input
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            disabled={running}
            autoComplete="off"
            spellCheck={false}
            className={[
              "mt-2 w-full rounded-2xl border bg-black/35 px-4 py-3 font-mono text-sm font-bold outline-none transition",
              confirmation && !exactConfirmation
                ? "border-red-300/25 text-red-100 ring-red-300/15 focus:ring-2"
                : exactConfirmation
                ? "border-emerald-300/25 text-emerald-100 ring-emerald-300/15 focus:ring-2"
                : "border-white/10 text-white ring-red-300/15 focus:ring-2",
            ].join(" ")}
          />

          <button
            type="button"
            onClick={() => void startRollover()}
            disabled={!canRun}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-[20px] border border-red-200/25 bg-[linear-gradient(180deg,rgba(248,113,113,0.94),rgba(220,38,38,0.92))] px-4 py-3.5 text-sm font-black uppercase tracking-[0.14em] text-white shadow-[0_0_28px_rgba(239,68,68,0.16)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:border-white/[0.05] disabled:bg-none disabled:bg-white/[0.04] disabled:text-zinc-600 disabled:shadow-none"
          >
            {running ? (
              <>
                <RefreshCcw size={16} className="animate-spin" />
                Archiving & Resetting...
              </>
            ) : (
              <>
                <ShieldAlert size={16} />
                Archive Year & Reset Students
              </>
            )}
          </button>

          {!loading && preview?.lastArchiveLabel ? (
            <div className="mt-4 text-[11px] leading-5 text-zinc-600">
              Last annual archive: {preview.lastArchiveLabel}
              {preview.lastRolloverAt
                ? ` • ${new Date(preview.lastRolloverAt).toLocaleString()}`
                : ""}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
