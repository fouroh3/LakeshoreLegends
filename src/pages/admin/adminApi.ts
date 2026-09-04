// src/pages/admin/adminApi.ts

import { HP_API_URL } from "../battle/battleConstants";
import { getBattleTeacherToken } from "../battle/battleTeacherApi";
export const ADMIN_API_VERSION = "2026-09-01.10";

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

const RETRYABLE_ADMIN_READS = new Set<AdminAction>([
  "admincurrencysnapshot",
  "admininventorysnapshot",
  "adminsystemstatus",
  "adminyearrolloverpreview",
  "adminarchivedstudents",
  "adminabilitysnapshot",
  "adminupdateabilities",
  "adminstoresnapshot",
]);

async function postAdminAction<T>(
  action: AdminAction,
  body: Record<string, any>
): Promise<T> {
  const retryableRead = RETRYABLE_ADMIN_READS.has(action);
  const maxAttempts = 3;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const res = await fetch(
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
        }
      );

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
      const canRetryRead = retryableRead && attempt < 1;

      if (!canRetryUnknownAction && !canRetryRead) break;

      await new Promise((resolve) =>
        window.setTimeout(resolve, canRetryUnknownAction ? 650 : 300)
      );
    }
  }

  throw lastError || new Error("Admin API failed.");
}

const ADMIN_IMPORT_BATCH_SIZE = 10;

function compareAdminImportedStudents(
  a: AdminImportedStudent,
  b: AdminImportedStudent
) {
  const homeroom = String(a.homeroom || "").localeCompare(
    String(b.homeroom || ""),
    "en",
    { numeric: true }
  );
  if (homeroom !== 0) return homeroom;

  const last = String(a.last || "").localeCompare(String(b.last || ""), "en", {
    sensitivity: "base",
  });
  if (last !== 0) return last;

  return String(a.first || "").localeCompare(String(b.first || ""), "en", {
    sensitivity: "base",
  });
}

export async function adminImportStudents(students: AdminImportedStudent[]) {
  const orderedStudents = [...students].sort(compareAdminImportedStudents);
  const importedStudents: NonNullable<AdminImportResult["students"]> = [];
  let importedCount = 0;
  let lastResult: AdminImportResult = { ok: true };

  for (
    let start = 0;
    start < orderedStudents.length;
    start += ADMIN_IMPORT_BATCH_SIZE
  ) {
    const batch = orderedStudents.slice(start, start + ADMIN_IMPORT_BATCH_SIZE);

    try {
      const result = await postAdminAction<AdminImportResult>(
        "adminimportstudents",
        { students: batch }
      );

      const completed = Array.isArray(result.students) ? result.students : [];
      importedStudents.push(...completed);
      importedCount += result.imported ?? completed.length;
      lastResult = result;
    } catch (err: any) {
      const message =
        err instanceof Error ? err.message : String(err || "Student import failed.");

      if (importedCount > 0) {
        throw new Error(
          `Import stopped after ${importedCount} student${
            importedCount === 1 ? " was" : "s were"
          } completed successfully. Refresh the roster before retrying. ${message}`
        );
      }

      throw err;
    }
  }

  return {
    ...lastResult,
    ok: true,
    imported: importedCount,
    students: importedStudents,
  };
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

export async function adminSystemStatus() {
  return postAdminAction<AdminSystemStatusResult>("adminsystemstatus", {});
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


export async function adminStoreSnapshot() {
  return postAdminAction<AdminStoreSnapshotResult>("adminstoresnapshot", {});
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
