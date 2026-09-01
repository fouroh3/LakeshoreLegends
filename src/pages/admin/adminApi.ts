// src/pages/admin/adminApi.ts

import { HP_API_URL } from "../battle/battleConstants";
import { getBattleTeacherToken } from "../battle/battleTeacherApi";
import type {
  AdminCurrency,
  AdminCurrencyMode,
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

type AdminAction =
  | "adminimportstudents"
  | "adminassignguildbatch"
  | "adminadjustcurrency";

async function postAdminAction<T>(
  action: AdminAction,
  body: Record<string, any>
): Promise<T> {
  const res = await fetch(
    `${HP_API_URL}?action=${encodeURIComponent(action)}&_=${Date.now()}`,
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
