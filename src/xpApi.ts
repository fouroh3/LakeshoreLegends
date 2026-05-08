// src/xpApi.ts
import { XP_API_URL } from "./data";

export type AttrKey = "STR" | "DEX" | "CON" | "INT" | "WIS" | "CHA";

export type AttrsBundle = {
  before?: Partial<Record<AttrKey, number>>;
  after?: Partial<Record<AttrKey, number>>;
  final?: Partial<Record<AttrKey, number>>;
};

export type StoreState = {
  storeLocked: boolean;
  xpPerPoint: number;
  maxPointsPerOpen: number;
  windowLabel?: string;
  openNonce?: string;
  now?: string;
  xpLastWriteIso?: string;
};

export type ApiVersions = {
  hpLastWriteIso: string;
  xpLastWriteIso: string;
  now?: string;
};

export type XpSummary = {
  studentId: string;
  earned: number;
  spent: number;
  balance: number;
  spendablePoints: number;
  recent: Array<{
    timestamp: string;
    type: string;
    xp: number;
    target?: string;
    note?: string;
  }>;
  attrs?: AttrsBundle;
  now?: string;
};

export type SpendXpArgs = {
  studentId: string;
  target: AttrKey;
  points: number;
  pin: string;
  openNonce?: string;
  requestId?: string;
};

function toNum(v: any, fallback = 0) {
  const n = typeof v === "number" ? v : Number.parseFloat(String(v ?? ""));
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
      `XP API returned non-JSON (HTTP ${res.status}). Snippet: ${
        snippet || "(empty)"
      }`
    );
  }

  if (!res.ok) {
    const msg = json?.error || json?.message || `XP API HTTP ${res.status}`;
    throw new Error(msg);
  }

  return json;
}

export async function getApiVersions(): Promise<ApiVersions> {
  const url = `${XP_API_URL}?action=versions&_=${Date.now()}`;
  const data = await fetchJsonStrict(url, { method: "GET" });

  if (!data?.ok) {
    throw new Error(data?.error || data?.message || "Failed to load versions");
  }

  return {
    hpLastWriteIso: data.hpLastWriteIso ? String(data.hpLastWriteIso) : "",
    xpLastWriteIso: data.xpLastWriteIso ? String(data.xpLastWriteIso) : "",
    now: data.now ? String(data.now) : "",
  };
}

export async function getStoreState(): Promise<StoreState> {
  const url = `${XP_API_URL}?action=xpstate&_=${Date.now()}`;
  const data = await fetchJsonStrict(url, { method: "GET" });

  if (!data?.ok) {
    throw new Error(
      data?.error || data?.message || "Failed to load store state"
    );
  }

  return {
    storeLocked: Boolean(data.storeLocked),
    xpPerPoint: Math.max(1, Math.round(toNum(data.xpPerPoint, 5))),
    maxPointsPerOpen: Math.max(
      1,
      Math.round(toNum(data.maxPointsPerOpen, 999))
    ),
    windowLabel: data.windowLabel ? String(data.windowLabel) : "",
    openNonce: data.openNonce ? String(data.openNonce) : "",
    now: data.now ? String(data.now) : "",
    xpLastWriteIso: data.xpLastWriteIso
      ? String(data.xpLastWriteIso)
      : undefined,
  };
}

export async function getXpSummary(studentId: string): Promise<XpSummary> {
  const cleanId = String(studentId ?? "").trim();
  if (!cleanId) throw new Error("Missing studentId.");

  const url =
    `${XP_API_URL}?action=xpsummary` +
    `&studentId=${encodeURIComponent(cleanId)}` +
    `&_=${Date.now()}`;

  const data = await fetchJsonStrict(url, { method: "GET" });

  if (!data?.ok) {
    throw new Error(
      data?.error || data?.message || "Failed to load XP summary"
    );
  }

  return {
    studentId: String(data.studentId ?? cleanId),
    earned: Math.round(toNum(data.earned, 0)),
    spent: Math.round(toNum(data.spent, 0)),
    balance: Math.round(toNum(data.balance, 0)),
    spendablePoints: Math.max(0, Math.round(toNum(data.spendablePoints, 0))),
    recent: Array.isArray(data.recent) ? data.recent : [],
    attrs: data.attrs ?? undefined,
    now: data.now ? String(data.now) : "",
  };
}

export async function spendXp(args: SpendXpArgs) {
  const studentId = String(args.studentId ?? "").trim();
  const target = String(args.target ?? "")
    .trim()
    .toUpperCase() as AttrKey;
  const points = Math.max(1, Math.round(toNum(args.points, 1)));
  const pin = String(args.pin ?? "").trim();
  const openNonce = String(args.openNonce ?? "").trim();

  if (!studentId) throw new Error("Missing studentId.");
  if (!["STR", "DEX", "CON", "INT", "WIS", "CHA"].includes(target)) {
    throw new Error("Invalid target.");
  }
  if (!pin) throw new Error("Missing PIN.");

  const url = `${XP_API_URL}?action=spendxp&_=${Date.now()}`;

  const body = JSON.stringify({
    action: "spendxp",
    studentId,
    target,
    points,
    pin,
    openNonce,
    requestId: args.requestId ?? "",
  });

  const data = await fetchJsonStrict(url, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body,
  });

  if (!data?.ok) {
    throw new Error(data?.error || data?.message || "XP purchase failed.");
  }

  return data;
}