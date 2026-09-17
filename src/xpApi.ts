// src/xpApi.ts
import { XP_API_URL } from "./data";
import { queueAppsScriptRead } from "./appsScriptRequestQueue";

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
  target?: AttrKey;
  points?: number;
  purchases?: Array<{ target: AttrKey; points: number }>;
  pin: string;
  openNonce?: string;
  requestId?: string;
};

let storeStateInFlight: Promise<StoreState> | null = null;
const xpSummaryInFlight = new Map<string, Promise<XpSummary>>();

function toNum(v: any, fallback = 0) {
  const n = typeof v === "number" ? v : Number.parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : fallback;
}

async function fetchJsonStrict(url: string, init?: RequestInit) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 30_000);
  let res: Response;
  try {
    res = await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if ((error as Error)?.name === "AbortError") {
      throw new Error("XP API request timed out.");
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

function isTransientApiError(error: unknown) {
  const message = String(error ?? "").toLowerCase();
  return ["failed to fetch", "network", "timed out", "processing", "retry shortly", "http 404", "http 408", "http 429", "http 500", "http 502", "http 503", "http 504"].some((value) =>
    message.includes(value)
  );
}

async function fetchJsonResilient(url: string, init?: RequestInit, maxAttempts = 3) {
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

export async function getApiVersions(): Promise<ApiVersions> {
  const data = await queueAppsScriptRead(() => {
    const url = `${XP_API_URL}?action=versions&_=${Date.now()}`;
    return fetchJsonResilient(url, { method: "GET" });
  });

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
  if (storeStateInFlight) return storeStateInFlight;
  const request = queueAppsScriptRead(async () => {
    const url = `${XP_API_URL}?action=xpstate&_=${Date.now()}`;
    const data = await fetchJsonResilient(url, { method: "GET" });

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
  });

  storeStateInFlight = request;
  try {
    return await request;
  } finally {
    if (storeStateInFlight === request) storeStateInFlight = null;
  }
}

export async function getXpSummary(studentId: string): Promise<XpSummary> {
  const cleanId = String(studentId ?? "").trim();
  if (!cleanId) throw new Error("Missing studentId.");
  const existing = xpSummaryInFlight.get(cleanId);
  if (existing) return existing;

  const request = queueAppsScriptRead(async () => {
    const url =
      `${XP_API_URL}?action=xpsummary` +
      `&studentId=${encodeURIComponent(cleanId)}` +
      `&_=${Date.now()}`;

    const data = await fetchJsonResilient(url, { method: "GET" });

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
  });

  xpSummaryInFlight.set(cleanId, request);
  try {
    return await request;
  } finally {
    if (xpSummaryInFlight.get(cleanId) === request) {
      xpSummaryInFlight.delete(cleanId);
    }
  }
}

export async function spendXp(args: SpendXpArgs) {
  const studentId = String(args.studentId ?? "").trim();
  const purchases = (Array.isArray(args.purchases) && args.purchases.length
    ? args.purchases
    : [{ target: args.target, points: args.points ?? 1 }]
  ).map((purchase) => ({
    target: String(purchase.target ?? "").trim().toUpperCase() as AttrKey,
    points: Math.max(1, Math.round(toNum(purchase.points, 1))),
  }));
  const pin = String(args.pin ?? "").trim();
  const openNonce = String(args.openNonce ?? "").trim();

  if (!studentId) throw new Error("Missing studentId.");
  if (
    !purchases.length ||
    purchases.some(
      ({ target }) => !["STR", "DEX", "CON", "INT", "WIS", "CHA"].includes(target)
    )
  ) {
    throw new Error("Invalid target.");
  }
  if (!pin) throw new Error("Missing PIN.");

  const url = `${XP_API_URL}?action=spendxp&_=${Date.now()}`;

  const body = JSON.stringify({
    action: "spendxp",
    studentId,
    target: purchases[0].target,
    points: purchases[0].points,
    purchases,
    pin,
    openNonce,
    requestId: args.requestId ?? "",
  });

  const data = await fetchJsonResilient(url, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body,
  }, 5);

  if (!data?.ok) {
    throw new Error(data?.error || data?.message || "XP purchase failed.");
  }

  return data;
}
