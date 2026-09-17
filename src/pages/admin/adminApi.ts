// src/pages/admin/adminApi.ts

import { HP_API_URL } from "../battle/battleConstants";
import { getBattleTeacherToken } from "../battle/battleTeacherApi";
export const ADMIN_API_VERSION = "2026-09-17.4";

import type {
  AdminAttributeValues,
  AdminCompanionStatus,
  AdminCurrency,
  AdminCurrencyMode,
  AdminInventoryMode,
  AdminMediaKind,
  AdminSkillMode,
} from "./adminConstants";

export type AdminImportedStudent = {
  first: string;
  last: string;
  homeroom: string;
  guild?: string;
};

export type AdminImportResult = {
  ok?: boolean;
  error?: string;
  imported?: number;
  skipped?: number;
  students?: Array<{
    studentId: string;
    first: string;
    last: string;
    name: string;
    homeroom: string;
    guild: string;
  }>;
  [key: string]: any;
};

export type AdminAssignGuildResult = {
  ok?: boolean;
  error?: string;
  updated?: number;
  guild?: string;
  studentIds?: string[];
  [key: string]: any;
};

export type AdminCurrencyRow = {
  studentId: string;
  xp: number;
  skillTokens: number;
};

export type AdminCurrencySnapshotResult = {
  ok?: boolean;
  error?: string;
  rows?: AdminCurrencyRow[];
  [key: string]: any;
};

export type AdminCurrencyAdjustmentResult = {
  ok?: boolean;
  error?: string;
  updated?: number;
  currency?: AdminCurrency;
  mode?: AdminCurrencyMode;
  amount?: number;
  results?: Array<{
    studentId: string;
    studentName: string;
    before: number;
    after: number;
  }>;
  [key: string]: any;
};

export type AdminInventoryRow = {
  studentId: string;
  inventory: string[];
};

export type AdminInventorySnapshotResult = {
  ok?: boolean;
  error?: string;
  rows?: AdminInventoryRow[];
  [key: string]: any;
};

export type AdminInventoryAdjustmentResult = {
  ok?: boolean;
  error?: string;
  updated?: number;
  mode?: AdminInventoryMode;
  cardKey?: string;
  cardName?: string;
  quantity?: number;
  results?: Array<{
    studentId: string;
    studentName: string;
    inventory: string[];
  }>;
  [key: string]: any;
};

export type AdminSystemStatusResult = {
  ok?: boolean;
  error?: string;
  playerStateReady?: boolean;
  masterLookupWired?: boolean;
  playerStateRows?: number;
  migrationRequired?: boolean;
  idIntegrityOk?: boolean;
  missingPlayerStateIds?: string[];
  invalidPlayerStateIds?: string[];
  mediaConfigured?: boolean;
  mediaProvider?: string;
  mediaBucket?: string;
  mediaPublicBaseUrl?: string;
  mediaRepo?: string;
  mediaBranch?: string;
  adminApiVersion?: string;
  [key: string]: any;
};

export type AdminUpdateStudentResult = {
  ok?: boolean;
  error?: string;
  studentId?: string;
  first?: string;
  last?: string;
  name?: string;
  [key: string]: any;
};

export type AdminMoveStudentResult = {
  ok?: boolean;
  error?: string;
  oldStudentId?: string;
  studentId?: string;
  homeroom?: string;
  [key: string]: any;
};

export type AdminArchivedStudentRow = {
  studentId: string;
  studentName: string;
  homeroom: string;
  guild: string;
  archivedAt: string;
  reason: string;
};

export type AdminArchivedStudentsResult = {
  ok?: boolean;
  error?: string;
  rows?: AdminArchivedStudentRow[];
  [key: string]: any;
};

export type AdminRestoreStudentResult = {
  ok?: boolean;
  error?: string;
  studentId?: string;
  restored?: boolean;
  [key: string]: any;
};

export type AdminDeleteArchivedStudentResult = {
  ok?: boolean;
  error?: string;
  studentId?: string;
  deleted?: boolean;
  mediaCleanupRequired?: boolean;
  [key: string]: any;
};

export type AdminArchiveStudentResult = {
  ok?: boolean;
  error?: string;
  studentId?: string;
  archived?: boolean;
  [key: string]: any;
};

export type AdminAbilitySnapshotResult = {
  ok?: boolean;
  error?: string;
  studentId: string;
  studentName: string;
  baseAttributes: AdminAttributeValues;
  bonusAttributes: AdminAttributeValues;
  rosterSkills: string[];
  purchasedSkills: string[];
  [key: string]: any;
};

export type AdminAbilityUpdateResult = AdminAbilitySnapshotResult & {
  updated?: boolean;
};

export type AdminPurchasedSkillsSnapshotResult = {
  ok?: boolean;
  error?: string;
  purchasedSkills?: Array<{
    studentId: string;
    studentName: string;
    skills: string[];
  }>;
  [key: string]: any;
};

export type AdminSkillAdjustmentResult = AdminAbilitySnapshotResult & {
  mode?: AdminSkillMode;
  skillName?: string;
};

export type AdminStoreSettings = {
  storeLocked: boolean;
  storePin: string;
  xpPerPoint: number;
  skillTokenCost: number;
  maxPointsPerOpen: number;
  windowLabel: string;
  updatedAt: string;
};

export type AdminStoreSnapshotResult = {
  ok?: boolean;
  error?: string;
  settings: AdminStoreSettings;
  [key: string]: any;
};

export type AdminStoreUpdateResult = AdminStoreSnapshotResult;

export type AdminMediaUploadResult = {
  ok?: boolean;
  error?: string;
  studentId?: string;
  kind?: AdminMediaKind;
  publicUrl?: string;
  repoPath?: string;
  [key: string]: any;
};

export type AdminConfigureMediaResult = {
  ok?: boolean;
  error?: string;
  mediaConfigured?: boolean;
  mediaProvider?: string;
  mediaBucket?: string;
  mediaPublicBaseUrl?: string;
  mediaRepo?: string;
  mediaBranch?: string;
  [key: string]: any;
};

export type AdminUpdateMediaPublicUrlResult = AdminConfigureMediaResult & {
  repaired?: {
    companionUrls?: number;
    rosterUrls?: number;
    total?: number;
  };
};

export type AdminCompanionUpdateResult = {
  ok?: boolean;
  error?: string;
  studentId?: string;
  companionUrl?: string;
  companionStatus?: AdminCompanionStatus;
  [key: string]: any;
};


export type AdminYearRolloverPreviewResult = {
  ok?: boolean;
  error?: string;
  activeStudents: number;
  reservedStudentIds: number;
  archivedStudents: number;
  movedDeletedReservations: number;
  mediaObjects: number;
  mediaConfigured: boolean;
  activeBattles: string[];
  archiveSheetCount: number;
  firstIds: Record<string, string>;
  lastArchiveLabel?: string;
  lastArchiveUrl?: string;
  lastRolloverAt?: string;
  adminApiVersion?: string;
  now?: string;
  [key: string]: any;
};

export type AdminStartNewSchoolYearResult = {
  ok?: boolean;
  error?: string;
  archiveLabel: string;
  archiveName: string;
  archiveUrl: string;
  archiveId?: string;
  archiveSheets?: number;
  clearedStudents: number;
  clearedSheets?: Record<string, number>;
  media?: {
    attempted: number;
    deleted: number;
    failed: number;
    warnings: string[];
  };
  storeClosed?: boolean;
  firstIds: Record<string, string>;
  now?: string;
  [key: string]: any;
};

type AdminAction =
  | "adminimportstudents"
  | "adminassignguildbatch"
  | "admincurrencysnapshot"
  | "adminadjustcurrency"
  | "admininventorysnapshot"
  | "adminadjustinventory"
  | "adminsystemstatus"
  | "adminyearrolloverpreview"
  | "adminstartnewschoolyear"
  | "adminmigrateplayerstate"
  | "adminupdatestudent"
  | "adminmovestudent"
  | "adminarchivestudent"
  | "adminarchivedstudents"
  | "adminrestorestudent"
  | "admindeletearchivedstudent"
  | "adminabilitysnapshot"
  | "adminupdateabilities"
  | "adminadjustskill"
  | "adminconfiguremedia"
  | "adminupdatemediapublicurl"
  | "adminuploadmedia"
  | "adminupdatecompanion"
  | "adminstoresnapshot"
  | "adminupdatestore";

const RETRYABLE_ADMIN_ACTIONS = new Set<AdminAction>([
  "admincurrencysnapshot",
  "admininventorysnapshot",
  "adminsystemstatus",
  "adminyearrolloverpreview",
  "adminarchivedstudents",
  "adminabilitysnapshot",
  "adminupdateabilities",
  "adminstoresnapshot",
  // Uploading the same student/kind overwrites the same R2 object and sheet
  // cell, so one retry is safe when Apps Script drops a response in transit.
  "adminuploadmedia",
]);

function isTransientAdminError(error: unknown) {
  const message = String(error ?? "").toLowerCase();
  return [
    "failed to fetch",
    "network",
    "timed out",
    "timeout",
    "non-json (404)",
    "non-json (408)",
    "non-json (429)",
    "non-json (500)",
    "non-json (502)",
    "non-json (503)",
    "non-json (504)",
  ].some((value) => message.includes(value));
}

async function postAdminAction<T>(
  action: AdminAction,
  body: Record<string, any>
): Promise<T> {
  const retryableAction = RETRYABLE_ADMIN_ACTIONS.has(action);
  const maxAttempts = retryableAction ? 5 : 3;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 30_000);
      let res: Response;
      try {
        res = await fetch(
          `${HP_API_URL}?action=${encodeURIComponent(action)}&_=${Date.now()}-${attempt}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "text/plain;charset=utf-8",
            },
            body: JSON.stringify({
              action,
              teacherToken: getBattleTeacherToken(),
              ...body,
            }),
            signal: controller.signal,
          }
        );
      } catch (error) {
        if ((error as Error)?.name === "AbortError") {
          throw new Error("Admin API request timed out.");
        }
        throw error;
      } finally {
        window.clearTimeout(timeoutId);
      }

      const text = await res.text();
      let data: any = null;

      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        throw new Error(
          `Admin API returned non-JSON (${res.status}). ${text
            .slice(0, 160)
            .replace(/\s+/g, " ")}`
        );
      }

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || `Admin API failed: ${res.status}`);
      }

      return data as T;
    } catch (err: any) {
      lastError = err instanceof Error ? err : new Error(String(err || "Admin API failed."));
      const unknownAction = /^Unknown action:/i.test(lastError.message.trim());
      const canRetryUnknownAction = unknownAction && attempt < 2;
      const canRetryAction =
        retryableAction &&
        isTransientAdminError(lastError) &&
        attempt < maxAttempts - 1;

      if (!canRetryUnknownAction && !canRetryAction) break;

      await new Promise((resolve) =>
        window.setTimeout(
          resolve,
          canRetryUnknownAction
            ? 650
            : Math.min(4_000, 500 * 2 ** attempt) + Math.floor(Math.random() * 600)
        )
      );
    }
  }

  throw lastError || new Error("Admin API failed.");
}

export async function adminImportStudents(students: AdminImportedStudent[]) {
  return postAdminAction<AdminImportResult>("adminimportstudents", {
    students,
  });
}

export async function adminAssignGuildBatch(args: {
  studentIds: string[];
  guild: string;
}) {
  return postAdminAction<AdminAssignGuildResult>("adminassignguildbatch", {
    studentIds: args.studentIds,
    guild: args.guild,
  });
}

export async function adminCurrencySnapshot() {
  return postAdminAction<AdminCurrencySnapshotResult>(
    "admincurrencysnapshot",
    {}
  );
}

export async function adminAdjustCurrency(args: {
  studentIds: string[];
  currency: AdminCurrency;
  mode: AdminCurrencyMode;
  amount: number;
  reason: string;
}) {
  return postAdminAction<AdminCurrencyAdjustmentResult>(
    "adminadjustcurrency",
    {
      studentIds: args.studentIds,
      currency: args.currency,
      mode: args.mode,
      amount: args.amount,
      reason: args.reason,
    }
  );
}

export async function adminInventorySnapshot() {
  return postAdminAction<AdminInventorySnapshotResult>(
    "admininventorysnapshot",
    {}
  );
}

export async function adminAdjustInventory(args: {
  studentIds: string[];
  mode: AdminInventoryMode;
  cardKey: string;
  cardName: string;
  quantity: number;
  reason: string;
}) {
  return postAdminAction<AdminInventoryAdjustmentResult>(
    "adminadjustinventory",
    args
  );
}

let adminSystemStatusInFlight: Promise<AdminSystemStatusResult> | null = null;

export async function adminSystemStatus() {
  if (adminSystemStatusInFlight) return adminSystemStatusInFlight;
  const request = postAdminAction<AdminSystemStatusResult>(
    "adminsystemstatus",
    {}
  );
  adminSystemStatusInFlight = request;
  try {
    return await request;
  } finally {
    if (adminSystemStatusInFlight === request) {
      adminSystemStatusInFlight = null;
    }
  }
}

export async function adminMigratePlayerState() {
  return postAdminAction<AdminSystemStatusResult>(
    "adminmigrateplayerstate",
    {}
  );
}


export async function adminYearRolloverPreview() {
  return postAdminAction<AdminYearRolloverPreviewResult>(
    "adminyearrolloverpreview",
    {}
  );
}

export async function adminStartNewSchoolYear(args: {
  archiveLabel: string;
  confirmation: string;
  acknowledged: boolean;
}) {
  return postAdminAction<AdminStartNewSchoolYearResult>(
    "adminstartnewschoolyear",
    args
  );
}

export async function adminUpdateStudent(args: {
  studentId: string;
  first: string;
  last: string;
}) {
  return postAdminAction<AdminUpdateStudentResult>(
    "adminupdatestudent",
    args
  );
}

export async function adminMoveStudent(args: {
  studentId: string;
  homeroom: string;
  reason: string;
}) {
  return postAdminAction<AdminMoveStudentResult>("adminmovestudent", args);
}

export async function adminArchiveStudent(args: {
  studentId: string;
  reason: string;
}) {
  return postAdminAction<AdminArchiveStudentResult>(
    "adminarchivestudent",
    args
  );
}

export async function adminAbilitySnapshot(studentId: string) {
  return postAdminAction<AdminAbilitySnapshotResult>(
    "adminabilitysnapshot",
    { studentId }
  );
}

export async function adminPurchasedSkillsSnapshot() {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(
        `${HP_API_URL}?action=skillsnapshot&_=${Date.now()}-${attempt}`,
        { cache: "no-store" }
      );
      const text = await res.text();
      let data: any = null;

      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        throw new Error(
          `Skill snapshot returned non-JSON (${res.status}). ${text
            .slice(0, 140)
            .replace(/\s+/g, " ")}`
        );
      }

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || `Skill snapshot failed: ${res.status}`);
      }

      return data as AdminPurchasedSkillsSnapshotResult;
    } catch (err: any) {
      lastError = err instanceof Error ? err : new Error(String(err || "Skill snapshot failed."));
      if (attempt === 0) {
        await new Promise((resolve) => window.setTimeout(resolve, 250));
      }
    }
  }

  throw lastError || new Error("Skill snapshot failed.");
}

export async function adminUpdateAbilities(args: {
  studentId: string;
  baseAttributes: AdminAttributeValues;
  bonusAttributes: AdminAttributeValues;
  rosterSkills: string[];
  reason: string;
}) {
  return postAdminAction<AdminAbilityUpdateResult>(
    "adminupdateabilities",
    args
  );
}

export async function adminAdjustSkill(args: {
  studentId: string;
  mode: AdminSkillMode;
  skillName: string;
  reason: string;
}) {
  return postAdminAction<AdminSkillAdjustmentResult>(
    "adminadjustskill",
    args
  );
}

export async function adminConfigureMedia(args: {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicBaseUrl: string;
}) {
  return postAdminAction<AdminConfigureMediaResult>(
    "adminconfiguremedia",
    args
  );
}

export async function adminUpdateMediaPublicUrl(publicBaseUrl: string) {
  return postAdminAction<AdminUpdateMediaPublicUrlResult>(
    "adminupdatemediapublicurl",
    { publicBaseUrl }
  );
}

export async function adminUploadMedia(args: {
  studentId: string;
  kind: AdminMediaKind;
  fileName: string;
  mimeType: string;
  base64: string;
  companionStatus?: AdminCompanionStatus;
}) {
  return postAdminAction<AdminMediaUploadResult>("adminuploadmedia", args);
}

export async function adminUpdateCompanion(args: {
  studentId: string;
  companionUrl: string;
  companionStatus: AdminCompanionStatus;
}) {
  return postAdminAction<AdminCompanionUpdateResult>(
    "adminupdatecompanion",
    args
  );
}


let adminStoreSnapshotInFlight: Promise<AdminStoreSnapshotResult> | null = null;

export async function adminStoreSnapshot() {
  if (adminStoreSnapshotInFlight) return adminStoreSnapshotInFlight;
  const request = postAdminAction<AdminStoreSnapshotResult>(
    "adminstoresnapshot",
    {}
  );
  adminStoreSnapshotInFlight = request;
  try {
    return await request;
  } finally {
    if (adminStoreSnapshotInFlight === request) {
      adminStoreSnapshotInFlight = null;
    }
  }
}

export async function adminUpdateStore(settings: AdminStoreSettings) {
  return postAdminAction<AdminStoreUpdateResult>("adminupdatestore", {
    settings,
  });
}


export async function adminArchivedStudents() {
  return postAdminAction<AdminArchivedStudentsResult>(
    "adminarchivedstudents",
    {}
  );
}

export async function adminRestoreStudent(args: { studentId: string }) {
  return postAdminAction<AdminRestoreStudentResult>(
    "adminrestorestudent",
    args
  );
}

export async function adminDeleteArchivedStudent(args: {
  studentId: string;
  reason: string;
}) {
  return postAdminAction<AdminDeleteArchivedStudentResult>(
    "admindeletearchivedstudent",
    args
  );
}
