// src/bossApi.ts
/**
 * Lakeshore Legends — Boss API client
 *
 * Talks to your Google Apps Script web app (same backend as HP/XP if combined).
 * Endpoints are assumed to follow the pattern:
 *   GET  ?action=bossGet&bossKey=...&bossInstanceId=...
 *   POST ?action=bossDelta   { bossKey, bossInstanceId, delta, source?, requestId? }
 *
 * If your script uses different action names, change ACTION_GET / ACTION_DELTA below.
 */

export type BossState = {
  bossKey: string;
  bossInstanceId: string;
  bossName: string;
  maxHP: number;
  currentHP: number;
  updatedAt?: string; // optional
};

export type GetBossStateArgs = {
  bossKey: string;
  bossInstanceId: string;
};

export type SubmitBossDeltaArgs = {
  bossKey: string;
  bossInstanceId: string;
  delta: number; // negative = damage, positive = heal
  source?: string; // note / breakdown
  requestId?: string; // idempotency key
};

type ApiOk<T> = { ok: true } & T;
type ApiErr = { ok: false; error?: string; message?: string };

const ACTION_GET = "bossGet";
const ACTION_DELTA = "bossDelta";

/**
 * Prefer an env var if you have one; otherwise fall back to your current web app URL.
 * You can set in .env:
 *   VITE_LL_API_URL="https://script.google.com/macros/s/....../exec"
 */
const DEFAULT_API_URL =
  "https://script.google.com/macros/s/AKfycbw6gMIFYPvaljF3Ls-waojzprU6bygZZonOIJeKLopN2NSKgkDT-EsRKznxQiGpth_6/exec";

const API_URL =
  (import.meta as any).env?.VITE_LL_API_URL ||
  (import.meta as any).env?.VITE_HP_API_URL || // if you reused this name earlier
  DEFAULT_API_URL;

function toNum(v: any, fallback = 0) {
  const n = typeof v === "number" ? v : Number.parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : fallback;
}

function normBossState(
  raw: any,
  bossKey: string,
  bossInstanceId: string
): BossState {
  return {
    bossKey: String(raw?.bossKey ?? bossKey ?? "").trim(),
    bossInstanceId: String(raw?.bossInstanceId ?? bossInstanceId ?? "").trim(),
    bossName: String(raw?.bossName ?? raw?.name ?? bossKey ?? "Boss").trim(),
    maxHP: Math.max(1, Math.round(toNum(raw?.maxHP, 1))),
    currentHP: Math.max(0, Math.round(toNum(raw?.currentHP, 0))),
    updatedAt: raw?.updatedAt ? String(raw.updatedAt) : undefined,
  };
}

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // If GAS returns HTML on error, this prevents a confusing crash.
    throw new Error(`Boss API returned non-JSON (${res.status}).`);
  }
  if (!res.ok) {
    const msg = json?.error || json?.message || `Boss API HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json;
}

export async function getBossState(args: GetBossStateArgs): Promise<BossState> {
  const bossKey = String(args.bossKey ?? "").trim();
  const bossInstanceId = String(args.bossInstanceId ?? "").trim();
  if (!bossKey || !bossInstanceId)
    throw new Error("Missing bossKey or bossInstanceId.");

  const url =
    `${API_URL}?action=${encodeURIComponent(ACTION_GET)}` +
    `&bossKey=${encodeURIComponent(bossKey)}` +
    `&bossInstanceId=${encodeURIComponent(bossInstanceId)}` +
    `&_=${Date.now()}`;

  const data = (await fetchJson(url, { method: "GET" })) as ApiOk<any> | ApiErr;

  if (!data || (data as any).ok !== true) {
    const msg =
      (data as any)?.error ||
      (data as any)?.message ||
      "Failed to load boss state.";
    throw new Error(msg);
  }

  // Accept several possible shapes from your script:
  // { ok:true, boss:{...} } OR { ok:true, state:{...} } OR { ok:true, ...fields }
  const raw = (data as any).boss ?? (data as any).state ?? data;
  return normBossState(raw, bossKey, bossInstanceId);
}

export async function submitBossDelta(
  args: SubmitBossDeltaArgs
): Promise<BossState | null> {
  const bossKey = String(args.bossKey ?? "").trim();
  const bossInstanceId = String(args.bossInstanceId ?? "").trim();
  const delta = Math.trunc(toNum(args.delta, 0));

  if (!bossKey || !bossInstanceId)
    throw new Error("Missing bossKey or bossInstanceId.");
  if (!Number.isFinite(delta) || delta === 0) throw new Error("Invalid delta.");

  const url = `${API_URL}?action=${encodeURIComponent(
    ACTION_DELTA
  )}&_=${Date.now()}`;

  const payload = {
    bossKey,
    bossInstanceId,
    delta,
    source: (args.source ?? "").trim(),
    requestId: args.requestId ?? "",
  };

  const data = (await fetchJson(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })) as ApiOk<any> | ApiErr;

  if (!data || (data as any).ok !== true) {
    const msg =
      (data as any)?.error || (data as any)?.message || "Boss submit failed.";
    throw new Error(msg);
  }

  // Some scripts return updated boss state; some return just ok.
  const raw = (data as any).boss ?? (data as any).state ?? null;
  return raw ? normBossState(raw, bossKey, bossInstanceId) : null;
}
