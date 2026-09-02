// src/pages/admin/components/CompanionManagerPanel.tsx

import { useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  HeartPulse,
  ImagePlus,
  PawPrint,
  Skull,
  Trash2,
} from "lucide-react";
import type { Student } from "../../../types";
import type {
  AdminCompanionUpdateResult,
  AdminMediaUploadResult,
} from "../adminApi";
import type { AdminCompanionStatus } from "../adminConstants";
import { clean, fullName, normId, studentSort } from "../adminRosterUtils";

const ACCEPTED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_FILE_BYTES = 8 * 1024 * 1024;

type Props = {
  students: Student[];
  busy: boolean;
  mediaConfigured: boolean;
  onUpload: (args: {
    studentId: string;
    fileName: string;
    mimeType: string;
    base64: string;
    companionStatus: AdminCompanionStatus;
  }) => Promise<AdminMediaUploadResult>;
  onUpdate: (args: {
    studentId: string;
    companionUrl: string;
    companionStatus: AdminCompanionStatus;
  }) => Promise<AdminCompanionUpdateResult>;
};

function normalizeStatus(value: unknown): AdminCompanionStatus {
  return String(value || "").trim().toLowerCase() === "fallen"
    ? "Fallen"
    : "Active";
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.onload = () => {
      const value = String(reader.result || "");
      const comma = value.indexOf(",");
      if (comma < 0) {
        reject(new Error(`Could not encode ${file.name}.`));
        return;
      }
      resolve(value.slice(comma + 1));
    };
    reader.readAsDataURL(file);
  });
}

function StatusBadge({ status }: { status: AdminCompanionStatus }) {
  if (status === "Fallen") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-red-300/20 bg-red-950/30 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-red-100">
        <Skull size={12} /> Fallen
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-100">
      <HeartPulse size={12} /> Living
    </span>
  );
}

export default function CompanionManagerPanel({
  students,
  busy,
  mediaConfigured,
  onUpload,
  onUpdate,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState("");
  const [homeroomFilter, setHomeroomFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedId, setSelectedId] = useState("");
  const [workingUrl, setWorkingUrl] = useState("");
  const [workingStatus, setWorkingStatus] = useState<AdminCompanionStatus>("Active");
  const [uploading, setUploading] = useState(false);
  const [localError, setLocalError] = useState("");

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

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students
      .filter(
        (student) =>
          homeroomFilter === "ALL" || clean(student.homeroom) === homeroomFilter
      )
      .filter((student) => {
        const status = normalizeStatus(student.companionStatus);
        if (statusFilter === "ALL") return true;
        if (statusFilter === "MISSING") return !clean(student.companionUrl);
        return status === statusFilter;
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
  }, [students, homeroomFilter, query, statusFilter]);

  const selected = students.find((student) => normId(student.id) === selectedId);

  const selectStudent = (student: Student) => {
    setSelectedId(normId(student.id));
    setWorkingUrl(clean(student.companionUrl));
    setWorkingStatus(normalizeStatus(student.companionStatus));
    setLocalError("");
  };

  const saveState = async () => {
    if (!selected) return;
    setLocalError("");
    try {
      const result = await onUpdate({
        studentId: normId(selected.id),
        companionUrl: workingUrl,
        companionStatus: workingStatus,
      });
      setWorkingUrl(result.companionUrl ?? workingUrl);
      setWorkingStatus(result.companionStatus ?? workingStatus);
    } catch (err: any) {
      setLocalError(err?.message || "Could not update companion.");
    }
  };

  const uploadFile = async (file: File) => {
    if (!selected || !mediaConfigured) return;
    if (!ACCEPTED_TYPES.has(file.type)) {
      setLocalError("Choose a PNG, JPG, or WebP image.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setLocalError("Companion images must be 8 MB or smaller.");
      return;
    }

    setUploading(true);
    setLocalError("");
    try {
      const base64 = await fileToBase64(file);
      const result = await onUpload({
        studentId: normId(selected.id),
        fileName: file.name,
        mimeType: file.type,
        base64,
        companionStatus: workingStatus,
      });
      setWorkingUrl(result.publicUrl || workingUrl);
    } catch (err: any) {
      setLocalError(err?.message || "Companion upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const removeCompanionImage = async () => {
    if (!selected || !workingUrl) return;
    const confirmed = window.confirm(
      `Remove the companion image for ${fullName(selected)}? The companion status can still be kept.`
    );
    if (!confirmed) return;

    setLocalError("");
    try {
      await onUpdate({
        studentId: normId(selected.id),
        companionUrl: "",
        companionStatus: workingStatus,
      });
      setWorkingUrl("");
    } catch (err: any) {
      setLocalError(err?.message || "Could not remove companion image.");
    }
  };

  const missingCount = students.filter((student) => !clean(student.companionUrl)).length;
  const fallenCount = students.filter(
    (student) => normalizeStatus(student.companionStatus) === "Fallen"
  ).length;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="text-2xl font-black text-white">{students.length}</div>
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Students</div>
        </div>
        <div className="rounded-2xl border border-amber-300/15 bg-amber-300/[0.04] p-4">
          <div className="text-2xl font-black text-amber-100">{missingCount}</div>
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-100/50">Missing image</div>
        </div>
        <div className="rounded-2xl border border-red-300/15 bg-red-300/[0.04] p-4">
          <div className="text-2xl font-black text-red-100">{fallenCount}</div>
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-red-100/50">Fallen</div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search student or ID"
              className="rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600"
            />
            <select
              value={homeroomFilter}
              onChange={(event) => setHomeroomFilter(event.target.value)}
              className="rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none"
            >
              <option value="ALL">All Homerooms</option>
              {homerooms.map((homeroom) => (
                <option key={homeroom} value={homeroom}>{homeroom}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none"
            >
              <option value="ALL">All Companion States</option>
              <option value="Active">Living</option>
              <option value="Fallen">Fallen</option>
              <option value="MISSING">Missing Image</option>
            </select>
          </div>

          <div className="max-h-[660px] overflow-auto rounded-[24px] border border-white/10 bg-black/25">
            <div className="grid gap-2 p-2 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((student) => {
                const id = normId(student.id);
                const status = normalizeStatus(student.companionStatus);
                const selectedRow = id === selectedId;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => selectStudent(student)}
                    className={[
                      "flex items-center gap-3 rounded-2xl border p-3 text-left transition",
                      selectedRow
                        ? "border-cyan-300/35 bg-cyan-300/10"
                        : "border-white/5 bg-white/[0.025] hover:border-white/10 hover:bg-white/[0.045]",
                    ].join(" ")}
                  >
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900">
                      {student.companionUrl ? (
                        <img src={student.companionUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-zinc-700">
                          <PawPrint size={23} />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-bold text-white">{fullName(student)}</div>
                      <div className="mt-0.5 text-xs text-zinc-500">{clean(student.homeroom)} • {id}</div>
                      <div className="mt-1"><StatusBadge status={status} /></div>
                    </div>
                  </button>
                );
              })}
              {visible.length === 0 && (
                <div className="col-span-full py-12 text-center text-sm text-zinc-500">
                  No students match these filters.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="xl:sticky xl:top-5 xl:self-start">
          {!selected ? (
            <div className="flex min-h-[360px] items-center justify-center rounded-[28px] border border-white/10 bg-white/[0.025] p-8 text-center">
              <div>
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[20px] bg-cyan-300/10 text-cyan-100">
                  <PawPrint size={28} />
                </div>
                <div className="mt-4 text-lg font-black text-white">Choose a student</div>
                <p className="mt-1 max-w-sm text-sm leading-6 text-zinc-500">
                  Their companion image and living/fallen status will appear here.
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-[28px] border border-white/10 bg-white/[0.025] p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200/60">Companion Record</div>
                  <div className="mt-1 text-xl font-black text-white">{fullName(selected)}</div>
                  <div className="mt-1 text-xs text-zinc-500">{clean(selected.homeroom)} • {normId(selected.id)}</div>
                </div>
                <StatusBadge status={workingStatus} />
              </div>

              <div className="mt-5 overflow-hidden rounded-[24px] border border-white/10 bg-black/30">
                <div className="aspect-square w-full">
                  {workingUrl ? (
                    <img src={workingUrl} alt="Companion" className="h-full w-full object-contain" />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-zinc-700">
                      <PawPrint size={44} />
                      <span className="text-sm font-semibold">No companion image</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Status</div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setWorkingStatus("Active")}
                    className={[
                      "rounded-2xl border px-4 py-3 text-sm font-black",
                      workingStatus === "Active"
                        ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
                        : "border-white/10 bg-white/[0.03] text-zinc-400",
                    ].join(" ")}
                  >
                    Living
                  </button>
                  <button
                    type="button"
                    onClick={() => setWorkingStatus("Fallen")}
                    className={[
                      "rounded-2xl border px-4 py-3 text-sm font-black",
                      workingStatus === "Fallen"
                        ? "border-red-300/30 bg-red-950/30 text-red-100"
                        : "border-white/10 bg-white/[0.03] text-zinc-400",
                    ].join(" ")}
                  >
                    Fallen
                  </button>
                </div>
              </div>

              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  disabled={busy || uploading || !mediaConfigured}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm font-black text-cyan-100 disabled:opacity-40"
                >
                  <ImagePlus size={17} /> {uploading ? "Uploading..." : workingUrl ? "Replace Image" : "Upload Image"}
                </button>
                <button
                  type="button"
                  onClick={saveState}
                  disabled={busy || uploading}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-black text-zinc-950 disabled:opacity-40"
                >
                  <CheckCircle2 size={17} /> Save Status
                </button>
              </div>

              {workingUrl && (
                <button
                  type="button"
                  onClick={removeCompanionImage}
                  disabled={busy || uploading}
                  className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-red-300/20 bg-red-950/20 px-4 py-2.5 text-sm font-bold text-red-100 disabled:opacity-40"
                >
                  <Trash2 size={16} /> Remove Image
                </button>
              )}

              {!mediaConfigured && (
                <div className="mt-3 rounded-2xl border border-amber-300/15 bg-amber-950/15 px-3 py-2.5 text-xs leading-5 text-amber-100/70">
                  Connect image storage in <strong>Hero Images</strong> once before uploading companion files. Status changes still work now.
                </div>
              )}

              {localError && (
                <div className="mt-3 rounded-2xl border border-red-300/15 bg-red-950/25 px-3 py-2.5 text-sm font-semibold text-red-100">
                  {localError}
                </div>
              )}

              <input
                ref={inputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) uploadFile(file);
                  event.currentTarget.value = "";
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
