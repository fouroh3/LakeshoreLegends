// src/skillApi.ts
import { XP_API_URL } from "./data";
import { normalizeSkillName } from "./data/skillLibrary";

export type SkillSummary = {
  studentId: string;
  skillTokens: number;
  skillCost: number;
  purchasedSkills: string[];
  recent?: Array<{
    timestamp?: string;
    skillName?: string;
    cost?: number;
    source?: string;
  }>;
  now?: string;
};

export type PurchaseSkillArgs = {
  studentId: string;
  skillId: string;
  skillName: string;
  pin: string;
  requestId?: string;
};

function normStudentId(id: unknown) {
  return String(id ?? "")
    .replace(/\u00A0/g, " ")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, "")
    .trim()
    .toUpperCase();
}

function toNum(value: unknown, fallback = 0) {
  const n =
    typeof value === "number"
      ? value
      : Number.parseFloat(String(value ?? ""));
  return Number.isFinite(n) ? n : fallback;
}

function toSkillList(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((x) => String(x ?? "").trim()).filter(Boolean);
  }

  return String(value ?? "")
    .split(/[;,|]/g)
    .map((x) => x.trim())
    .filter(Boolean);
}

async function fetchJsonStrict(url: string, init?: RequestInit) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 18_000);
  let res: Response;
  try {
    res = await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if ((error as Error)?.name === "AbortError") {
      throw new Error("Skill API request timed out.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
  const text = await res.text();

  let json: any;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    const snippet = text.slice(0, 220).replace(/\s+/g, " ").trim();
    throw new Error(
      `Skill API returned non-JSON (HTTP ${res.status}). Snippet: ${
        snippet || "(empty)"
      }`
    );
  }

  if (!res.ok) {
    const msg = json?.error || json?.message || `Skill API HTTP ${res.status}`;
    throw new Error(msg);
  }

  if (!json?.ok) {
    throw new Error(json?.error || json?.message || "Skill API failed.");
  }

  return json;
}

function isTransientApiError(error: unknown) {
  const message = String(error ?? "").toLowerCase();
  return ["failed to fetch", "network", "timed out", "processing", "retry shortly", "http 404", "http 408", "http 429", "http 500", "http 502", "http 503", "http 504"].some((value) =>
    message.includes(value)
  );
}

async function fetchJsonResilient(url: string, init?: RequestInit, maxAttempts = 5) {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fetchJsonStrict(url, init);
    } catch (error) {
      lastError = error;
      if (!isTransientApiError(error) || attempt === maxAttempts - 1) throw error;
      const exponential = Math.min(4_000, 350 * 2 ** attempt);
      const jitter = Math.floor(Math.random() * 700);
      await new Promise((resolve) => window.setTimeout(resolve, exponential + jitter));
    }
  }
  throw lastError;
}

export async function getSkillSummary(studentId: string): Promise<SkillSummary> {
  const cleanId = String(studentId ?? "").trim();
  if (!cleanId) throw new Error("Missing studentId.");

  const url =
    `${XP_API_URL}?action=skillsummary` +
    `&studentId=${encodeURIComponent(cleanId)}` +
    `&_=${Date.now()}`;

  const data = await fetchJsonResilient(url, { method: "GET" });

  return {
    studentId: String(data.studentId ?? cleanId),
    skillTokens: Math.max(0, Math.round(toNum(data.skillTokens, 0))),
    skillCost: Math.max(1, Math.round(toNum(data.skillCost, 1))),
    purchasedSkills: Array.isArray(data.purchasedSkills)
      ? data.purchasedSkills.map((x: unknown) => String(x ?? "").trim()).filter(Boolean)
      : [],
    recent: Array.isArray(data.recent) ? data.recent : [],
    now: data.now ? String(data.now) : "",
  };
}

export async function getPurchasedSkillSnapshot(): Promise<Map<string, string[]>> {
  const url = `${XP_API_URL}?action=skillsnapshot&_=${Date.now()}`;
  const data = await fetchJsonResilient(url, { method: "GET" });

  const rows = Array.isArray(data.purchasedSkills) ? data.purchasedSkills : [];
  const byStudent = new Map<string, string[]>();

  for (const row of rows) {
    const studentId = normStudentId(row?.studentId ?? row?.StudentID ?? row?.id);
    if (!studentId) continue;

    const rawSkills = row?.skills ?? row?.purchasedSkills ?? row?.skillNames ?? row?.SkillName;
    const existing = byStudent.get(studentId) ?? [];
    const seen = new Set(existing.map((skill) => normalizeSkillName(skill)));

    for (const skill of toSkillList(rawSkills)) {
      const key = normalizeSkillName(skill);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      existing.push(skill);
    }

    byStudent.set(studentId, existing);
  }

  return byStudent;
}

export async function purchaseSkill(args: PurchaseSkillArgs) {
  const studentId = String(args.studentId ?? "").trim();
  const skillId = String(args.skillId ?? "").trim();
  const skillName = String(args.skillName ?? "").trim();
  const pin = String(args.pin ?? "").trim();

  if (!studentId) throw new Error("Missing studentId.");
  if (!skillId) throw new Error("Missing skillId.");
  if (!skillName) throw new Error("Missing skillName.");
  if (!pin) throw new Error("Missing Store PIN.");

  const url = `${XP_API_URL}?action=purchaseskill&_=${Date.now()}`;

  const data = await fetchJsonResilient(url, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify({
      action: "purchaseskill",
      studentId,
      skillId,
      skillName,
      pin,
      requestId: args.requestId ?? "",
    }),
  }, 6);

  return data;
}
