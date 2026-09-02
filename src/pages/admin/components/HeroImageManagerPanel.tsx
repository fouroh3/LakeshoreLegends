// src/pages/admin/components/HeroImageManagerPanel.tsx

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  CloudUpload,
  Image as ImageIcon,
  Link2,
  RefreshCw,
  TriangleAlert,
  X,
} from "lucide-react";
import type { Student } from "../../../types";
import type {
  AdminConfigureMediaResult,
  AdminMediaUploadResult,
  AdminUpdateMediaPublicUrlResult,
} from "../adminApi";
import { clean, fullName, normId, studentSort } from "../adminRosterUtils";

const ACCEPTED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_FILE_BYTES = 8 * 1024 * 1024;

type UploadState = "ready" | "uploading" | "done" | "error";

type QueuedImage = {
  key: string;
  file: File;
  previewUrl: string;
  studentId: string;
  autoMatched: boolean;
  conflict: boolean;
  uploadState: UploadState;
  error?: string;
};

type Props = {
  students: Student[];
  busy: boolean;
  mediaConfigured: boolean;
  mediaBucket?: string;
  mediaPublicBaseUrl?: string;
  onConfigureMedia: (args: {
    accountId: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucket: string;
    publicBaseUrl: string;
  }) => Promise<AdminConfigureMediaResult>;
  onUpload: (args: {
    studentId: string;
    fileName: string;
    mimeType: string;
    base64: string;
  }) => Promise<AdminMediaUploadResult>;
  onUpdatePublicUrl: (publicBaseUrl: string) => Promise<AdminUpdateMediaPublicUrlResult>;
};

function normalizeText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function baseName(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "");
}

function scoreFileForStudent(fileName: string, student: Student) {
  const base = normalizeText(baseName(fileName));
  const id = normalizeText(normId(student.id));
  const first = normalizeText(student.first);
  const last = normalizeText(student.last);
  const firstLast = `${first}${last}`;
  const lastFirst = `${last}${first}`;

  if (!base || !first || !last) return 0;
  if (base === id) return 120;
  if (base === firstLast || base === lastFirst) return 110;
  if (base.startsWith(firstLast) || base.startsWith(lastFirst)) return 100;
  if (base.includes(firstLast) || base.includes(lastFirst)) return 90;
  if (base.includes(first) && base.includes(last)) return 70;
  return 0;
}

function autoMatch(file: File, students: Student[]) {
  const scored = students
    .map((student) => ({
      student,
      score: scoreFileForStudent(file.name, student),
    }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);

  if (!scored.length) return { studentId: "", matched: false };

  const best = scored[0];
  const second = scored[1];
  if (second && second.score === best.score) {
    return { studentId: "", matched: false };
  }

  return { studentId: normId(best.student.id), matched: true };
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

function StatusPill({ item }: { item: QueuedImage }) {
  if (item.uploadState === "done") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-[11px] font-bold text-emerald-100">
        <CheckCircle2 size={12} /> Uploaded
      </span>
    );
  }

  if (item.uploadState === "uploading") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2 py-1 text-[11px] font-bold text-cyan-100">
        <RefreshCw size={12} className="animate-spin" /> Uploading
      </span>
    );
  }

  if (item.uploadState === "error") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-red-300/20 bg-red-950/30 px-2 py-1 text-[11px] font-bold text-red-100">
        <TriangleAlert size={12} /> Failed
      </span>
    );
  }

  if (item.conflict) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/20 bg-amber-950/25 px-2 py-1 text-[11px] font-bold text-amber-100">
        <TriangleAlert size={12} /> Conflict
      </span>
    );
  }

  if (item.studentId) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-[11px] font-bold text-emerald-100">
        <CheckCircle2 size={12} /> {item.autoMatched ? "Matched" : "Assigned"}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/20 bg-amber-950/25 px-2 py-1 text-[11px] font-bold text-amber-100">
      <TriangleAlert size={12} /> Needs review
    </span>
  );
}

export default function HeroImageManagerPanel({
  students,
  busy,
  mediaConfigured,
  mediaBucket,
  mediaPublicBaseUrl,
  onConfigureMedia,
  onUpload,
  onUpdatePublicUrl,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [queue, setQueue] = useState<QueuedImage[]>([]);
  const [dragging, setDragging] = useState(false);
  const [accountId, setAccountId] = useState("");
  const [accessKeyId, setAccessKeyId] = useState("");
  const [secretAccessKey, setSecretAccessKey] = useState("");
  const [bucket, setBucket] = useState(mediaBucket || "lakeshore-legends-media");
  const [publicBaseUrl, setPublicBaseUrl] = useState(mediaPublicBaseUrl || "");
  const [connecting, setConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState("");
  const [savingPublicUrl, setSavingPublicUrl] = useState(false);

  useEffect(() => {
    if (mediaPublicBaseUrl) setPublicBaseUrl(mediaPublicBaseUrl);
  }, [mediaPublicBaseUrl]);

  const savePublicUrl = async () => {
    if (!publicBaseUrl.trim()) return;
    setSavingPublicUrl(true);
    setConnectionError("");
    try {
      const result = await onUpdatePublicUrl(publicBaseUrl.trim());
      if (result.mediaPublicBaseUrl) setPublicBaseUrl(result.mediaPublicBaseUrl);
    } catch (err: any) {
      setConnectionError(err?.message || "Could not update the public media URL.");
    } finally {
      setSavingPublicUrl(false);
    }
  };

  const sortedStudents = useMemo(
    () => students.slice().sort(studentSort),
    [students]
  );

  const studentById = useMemo(() => {
    const map = new Map<string, Student>();
    students.forEach((student) => map.set(normId(student.id), student));
    return map;
  }, [students]);

  const summary = useMemo(() => {
    const matched = queue.filter(
      (item) => item.studentId && !item.conflict && item.uploadState !== "done"
    ).length;
    const review = queue.filter(
      (item) => !item.studentId && item.uploadState !== "done"
    ).length;
    const conflicts = queue.filter(
      (item) => item.conflict && item.uploadState !== "done"
    ).length;
    const done = queue.filter((item) => item.uploadState === "done").length;
    return { matched, review, conflicts, done };
  }, [queue]);

  const rebuildConflicts = (items: QueuedImage[]) => {
    const counts = new Map<string, number>();
    items.forEach((item) => {
      if (!item.studentId || item.uploadState === "done") return;
      counts.set(item.studentId, (counts.get(item.studentId) ?? 0) + 1);
    });

    return items.map((item) => ({
      ...item,
      conflict:
        Boolean(item.studentId) &&
        item.uploadState !== "done" &&
        (counts.get(item.studentId) ?? 0) > 1,
    }));
  };

  const addFiles = (files: FileList | File[]) => {
    const accepted = Array.from(files).filter(
      (file) => ACCEPTED_TYPES.has(file.type) && file.size <= MAX_FILE_BYTES
    );

    if (!accepted.length) return;

    setQueue((prev) => {
      const next = [
        ...prev,
        ...accepted.map((file, index) => {
          const match = autoMatch(file, students);
          return {
            key: `${file.name}:${file.size}:${file.lastModified}:${Date.now()}:${index}`,
            file,
            previewUrl: URL.createObjectURL(file),
            studentId: match.studentId,
            autoMatched: match.matched,
            conflict: false,
            uploadState: "ready" as const,
          };
        }),
      ];
      return rebuildConflicts(next);
    });
  };

  const setAssignment = (key: string, studentId: string) => {
    setQueue((prev) =>
      rebuildConflicts(
        prev.map((item) =>
          item.key === key
            ? {
                ...item,
                studentId,
                autoMatched: false,
                uploadState: "ready",
                error: undefined,
              }
            : item
        )
      )
    );
  };

  const removeItem = (key: string) => {
    setQueue((prev) => {
      const target = prev.find((item) => item.key === key);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return rebuildConflicts(prev.filter((item) => item.key !== key));
    });
  };

  const clearFinished = () => {
    setQueue((prev) => {
      prev
        .filter((item) => item.uploadState === "done")
        .forEach((item) => URL.revokeObjectURL(item.previewUrl));
      return rebuildConflicts(
        prev.filter((item) => item.uploadState !== "done")
      );
    });
  };

  const connectMedia = async () => {
    if (
      !accountId.trim() ||
      !accessKeyId.trim() ||
      !secretAccessKey.trim() ||
      !bucket.trim() ||
      !publicBaseUrl.trim()
    ) return;

    setConnecting(true);
    setConnectionError("");

    try {
      await onConfigureMedia({
        accountId: accountId.trim(),
        accessKeyId: accessKeyId.trim(),
        secretAccessKey: secretAccessKey.trim(),
        bucket: bucket.trim(),
        publicBaseUrl: publicBaseUrl.trim(),
      });
      setAccessKeyId("");
      setSecretAccessKey("");
    } catch (err: any) {
      setConnectionError(err?.message || "Could not connect image storage.");
    } finally {
      setConnecting(false);
    }
  };

  const uploadMatched = async () => {
    if (busy || !mediaConfigured) return;

    const eligible = queue.filter(
      (item) =>
        item.studentId &&
        !item.conflict &&
        item.uploadState !== "done" &&
        item.uploadState !== "uploading"
    );

    for (const item of eligible) {
      setQueue((prev) =>
        prev.map((row) =>
          row.key === item.key
            ? { ...row, uploadState: "uploading", error: undefined }
            : row
        )
      );

      try {
        const base64 = await fileToBase64(item.file);
        await onUpload({
          studentId: item.studentId,
          fileName: item.file.name,
          mimeType: item.file.type,
          base64,
        });
        setQueue((prev) =>
          rebuildConflicts(
            prev.map((row) =>
              row.key === item.key
                ? { ...row, uploadState: "done", conflict: false }
                : row
            )
          )
        );
      } catch (err: any) {
        setQueue((prev) =>
          prev.map((row) =>
            row.key === item.key
              ? {
                  ...row,
                  uploadState: "error",
                  error: err?.message || "Upload failed.",
                }
              : row
          )
        );
      }
    }
  };

  return (
    <div className="space-y-5">
      {!mediaConfigured && (
        <div className="rounded-[26px] border border-amber-300/20 bg-amber-950/15 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-amber-300/10 p-2.5 text-amber-100">
              <Link2 size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-black text-amber-100">Connect Cloudflare R2 once</div>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-amber-100/65">
                Hero and companion images are stored in Cloudflare R2, so teacher uploads do not create Git commits or trigger Netlify deploys. R2 credentials are stored only in Apps Script properties and are never written to the spreadsheet or returned to the browser.
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <input
                  value={accountId}
                  onChange={(event) => setAccountId(event.target.value)}
                  placeholder="R2 Account ID"
                  className="rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600"
                />
                <input
                  type="password"
                  value={accessKeyId}
                  onChange={(event) => setAccessKeyId(event.target.value)}
                  placeholder="Access Key ID"
                  className="rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600"
                />
                <input
                  type="password"
                  value={secretAccessKey}
                  onChange={(event) => setSecretAccessKey(event.target.value)}
                  placeholder="Secret Access Key"
                  className="rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600"
                />
                <input
                  value={bucket}
                  onChange={(event) => setBucket(event.target.value)}
                  placeholder="lakeshore-legends-media"
                  className="rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600"
                />
                <input
                  value={publicBaseUrl}
                  onChange={(event) => setPublicBaseUrl(event.target.value)}
                  placeholder="https://...r2.dev"
                  className="rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600"
                />
              </div>
              <button
                type="button"
                onClick={connectMedia}
                disabled={
                  connecting ||
                  !accountId.trim() ||
                  !accessKeyId.trim() ||
                  !secretAccessKey.trim() ||
                  !bucket.trim() ||
                  !publicBaseUrl.trim()
                }
                className="mt-3 rounded-2xl bg-amber-300 px-5 py-3 text-sm font-black text-zinc-950 disabled:opacity-50"
              >
                {connecting ? "Connecting..." : "Connect R2 Media"}
              </button>
              {connectionError && (
                <div className="mt-3 text-sm font-semibold text-red-200">
                  {connectionError}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {mediaConfigured && (
        <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/15 bg-emerald-400/5 px-3 py-1.5 font-semibold text-emerald-100/80">
              <CheckCircle2 size={13} /> Media connected
            </span>
            <span>Cloudflare R2</span>
            {mediaBucket && <span>• bucket {mediaBucket}</span>}
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              value={publicBaseUrl}
              onChange={(event) => setPublicBaseUrl(event.target.value)}
              placeholder="https://...r2.dev"
              className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600"
            />
            <button
              type="button"
              onClick={savePublicUrl}
              disabled={savingPublicUrl || !publicBaseUrl.trim()}
              className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm font-black text-cyan-100 disabled:opacity-50"
            >
              {savingPublicUrl ? "Saving..." : "Save Public URL"}
            </button>
          </div>
          {/\.r2\.cloudflarestorage\.com(?:\/|$)/i.test(publicBaseUrl) && (
            <div className="mt-2 text-xs font-semibold leading-5 text-red-200">
              This is the private S3 API endpoint and cannot display images in the browser. Paste the bucket Public Development URL ending in r2.dev instead.
            </div>
          )}
          {connectionError && (
            <div className="mt-2 text-sm font-semibold text-red-200">{connectionError}</div>
          )}
        </div>
      )}

      <div
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          event.preventDefault();
          if (event.currentTarget === event.target) setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          addFiles(event.dataTransfer.files);
        }}
        className={[
          "rounded-[28px] border-2 border-dashed p-7 text-center transition sm:p-10",
          dragging
            ? "border-cyan-300/60 bg-cyan-300/10"
            : "border-white/10 bg-black/20 hover:border-cyan-300/25 hover:bg-cyan-300/[0.03]",
        ].join(" ")}
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[20px] border border-cyan-300/15 bg-cyan-300/10 text-cyan-100">
          <CloudUpload size={28} />
        </div>
        <div className="mt-4 text-lg font-black text-white">
          Drop a whole class of hero images here
        </div>
        <div className="mt-1 text-sm text-zinc-500">
          PNG, JPG, or WebP • up to 8 MB each • filenames are matched automatically
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-5 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-5 py-2.5 text-sm font-black text-cyan-100 hover:bg-cyan-300/15"
        >
          Choose Images
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(event) => {
            if (event.target.files) addFiles(event.target.files);
            event.currentTarget.value = "";
          }}
        />
      </div>

      {queue.length > 0 && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.05] p-4">
              <div className="text-2xl font-black text-emerald-100">{summary.matched}</div>
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-100/50">Ready to upload</div>
            </div>
            <div className="rounded-2xl border border-amber-300/15 bg-amber-300/[0.04] p-4">
              <div className="text-2xl font-black text-amber-100">{summary.review}</div>
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-100/50">Needs review</div>
            </div>
            <div className="rounded-2xl border border-red-300/15 bg-red-300/[0.04] p-4">
              <div className="text-2xl font-black text-red-100">{summary.conflicts}</div>
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-red-100/50">Duplicate match</div>
            </div>
            <div className="rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.04] p-4">
              <div className="text-2xl font-black text-cyan-100">{summary.done}</div>
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-100/50">Uploaded</div>
            </div>
          </div>

          <div className="overflow-hidden rounded-[24px] border border-white/10 bg-black/25">
            <div className="max-h-[620px] overflow-auto">
              <table className="w-full min-w-[880px] text-left text-sm">
                <thead className="sticky top-0 z-10 bg-zinc-950 text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                  <tr>
                    <th className="px-3 py-3">Image</th>
                    <th className="px-3 py-3">Filename</th>
                    <th className="px-3 py-3">Student</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3 text-right">Remove</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.map((item) => {
                    const assigned = studentById.get(item.studentId);
                    return (
                      <tr key={item.key} className="border-t border-white/5 align-middle">
                        <td className="px-3 py-2.5">
                          <div className="h-14 w-14 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900">
                            <img src={item.previewUrl} alt="" className="h-full w-full object-cover" />
                          </div>
                        </td>
                        <td className="max-w-[260px] px-3 py-2.5">
                          <div className="truncate font-semibold text-white">{item.file.name}</div>
                          <div className="mt-1 text-xs text-zinc-600">{(item.file.size / 1024 / 1024).toFixed(1)} MB</div>
                          {item.error && <div className="mt-1 text-xs font-semibold text-red-200">{item.error}</div>}
                        </td>
                        <td className="px-3 py-2.5">
                          <select
                            value={item.studentId}
                            onChange={(event) => setAssignment(item.key, event.target.value)}
                            disabled={item.uploadState === "uploading" || item.uploadState === "done"}
                            className="w-full min-w-[280px] rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white outline-none"
                          >
                            <option value="">Choose student...</option>
                            {sortedStudents.map((student) => (
                              <option key={normId(student.id)} value={normId(student.id)}>
                                {clean(student.homeroom)} • {fullName(student)} • {normId(student.id)}
                              </option>
                            ))}
                          </select>
                          {assigned && (
                            <div className="mt-1 text-xs text-zinc-600">
                              {clean(assigned.homeroom)} • {normId(assigned.id)}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2.5"><StatusPill item={item} /></td>
                        <td className="px-3 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => removeItem(item.key)}
                            disabled={item.uploadState === "uploading"}
                            className="rounded-xl border border-white/10 bg-white/[0.03] p-2 text-zinc-400 hover:text-white disabled:opacity-40"
                            aria-label="Remove image from queue"
                          >
                            <X size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-[24px] border border-white/10 bg-white/[0.025] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 text-sm text-zinc-400">
              <ImageIcon size={18} className="text-cyan-200/70" />
              Review only the yellow rows. Everything green is ready.
            </div>
            <div className="flex flex-wrap gap-2">
              {summary.done > 0 && (
                <button
                  type="button"
                  onClick={clearFinished}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-bold text-zinc-300"
                >
                  Clear Uploaded
                </button>
              )}
              <button
                type="button"
                onClick={uploadMatched}
                disabled={busy || !mediaConfigured || summary.matched < 1 || summary.conflicts > 0}
                className="rounded-2xl bg-cyan-300 px-5 py-2.5 text-sm font-black text-zinc-950 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Upload {summary.matched} Matched Image{summary.matched === 1 ? "" : "s"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
