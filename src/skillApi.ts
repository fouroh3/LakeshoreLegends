// src/skillApi.ts
import { XP_API_URL } from "./data";

export type SkillSummary = {
  studentId: string;
  skillTokens: number;
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

function toNum(value: unknown, fallback = 0) {
  const n =
    typeof value === "number"
      ? value
      : Number.parseFloat(String(value ?? ""));
  return Number.isFinite(n) ? n : fallback;
}

async function fetchJsonStrict(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
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

export async function getSkillSummary(studentId: string): Promise<SkillSummary> {
  const cleanId = String(studentId ?? "").trim();
  if (!cleanId) throw new Error("Missing studentId.");

  const url =
    `${XP_API_URL}?action=skillsummary` +
    `&studentId=${encodeURIComponent(cleanId)}` +
    `&_=${Date.now()}`;

  const data = await fetchJsonStrict(url, { method: "GET" });

  return {
    studentId: String(data.studentId ?? cleanId),
    skillTokens: Math.max(0, Math.round(toNum(data.skillTokens, 0))),
    purchasedSkills: Array.isArray(data.purchasedSkills)
      ? data.purchasedSkills.map((x: unknown) => String(x ?? "").trim()).filter(Boolean)
      : [],
    recent: Array.isArray(data.recent) ? data.recent : [],
    now: data.now ? String(data.now) : "",
  };
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

  const data = await fetchJsonStrict(url, {
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
  });

  return data;
}
