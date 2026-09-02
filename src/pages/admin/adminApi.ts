// src/pages/admin/adminApi.ts

import { HP_API_URL } from "../battle/battleConstants";
import { getBattleTeacherToken } from "../battle/battleTeacherApi";
export const ADMIN_API_VERSION = "2026-09-01.7";

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

export type AdminCompanionUpdateResult = {
  ok?: boolean;
  error?: string;
  studentId?: string;
  companionUrl?: string;
  companionStatus?: AdminCompanionStatus;
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
  | "adminuploadmedia"
  | "adminupdatecompanion"
  | "adminstoresnapshot"
  | "adminupdatestore";

const RETRYABLE_ADMIN_READS = new Set<AdminAction>([
  "admincurrencysnapshot",
  "admininventorysnapshot",
  "adminsystemstatus",
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

export async function adminSystemStatus() {
  return postAdminAction<AdminSystemStatusResult>("adminsystemstatus", {});
}

export async function adminMigratePlayerState() {
  return postAdminAction<AdminSystemStatusResult>(
    "adminmigrateplayerstate",
    {}
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
