// src/bossApi.ts
/**
 * Lakeshore Legends — Boss API client (robust + GAS-friendly CORS)
 *
 * Key fix: POST uses text/plain to avoid CORS preflight (OPTIONS), which GAS Web Apps
 * don't reliably support. Body is still JSON and your Apps Script parses it fine.
 *
 * Also: action list aligned with your current Apps Script:
 *   GET  ?action=bossstate&bossInstanceId=...&bossKey=...
 *   POST ?action=bossdelta  (or bossDelta on client, script lowercases)
 */

export type BossState = {
  bossKey: string;
  bossInstanceId: string;
  bossName: string;
  maxHP: number;
  currentHP: number;
  updatedAt?: string;
};

export type GetBossStateArgs = {
  bossKey: string;
  bossInstanceId: string;
};

export type SubmitBossDeltaArgs = {
  bossKey: string;
  bossInstanceId: string;
  delta: number;
  source?: string;
  requestId?: string;
};

type ApiOk<T> = { ok: true } & T;
type ApiErr = { ok: false; error?: string; message?: string };

const DEFAULT_API_URL =
  "https://script.google.com/macros/s/AKfycbw6gMIFYPvaljF3Ls-waojzprU6bygZZonOIJeKLopN2NSKgkDT-EsRKznxQiGpth_6/exec";

const API_URL =
  (import.meta as any).env?.VITE_LL_API_URL ||
  (import.meta as any).env?.VITE_HP_API_URL ||
  DEFAULT_API_URL;

/** Your current Apps Script uses action=bossstate */
const GET_ACTIONS = [
  "bossstate",
  // kept for backwards-compat / old drafts:
  "bossState",
  "boss_state",
  "getBossState",
  "bossGet",
  "boss",
  "getBoss",
] as const;

/** Your current Apps Script doPost() expects action=bossdelta (lowercased) */
const DELTA_ACTIONS = [
  "bossdelta",
  // kept for backwards-compat / old drafts:
  "bossDelta",
  "boss_delta",
  "bossDamage",
  "bossHit",
  "bossUpdate",
] as const;

function toNum(v: any, fallback = 0) {
  const n = typeof v === "number" ? v : Number.parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : fallback;
}

function normBossState(
  raw: any,
  bossKey: string,
  bossInstanceId: string
): BossState {
  const maxHP = Math.max(1, Math.round(toNum(raw?.maxHP, 1)));
  const currentHP = Math.max(0, Math.round(toNum(raw?.currentHP, 0)));
  return {
    bossKey: String(raw?.bossKey ?? bossKey ?? "").trim(),
    bossInstanceId: String(raw?.bossInstanceId ?? bossInstanceId ?? "").trim(),
    bossName: String(raw?.bossName ?? raw?.name ?? bossKey ?? "Boss").trim(),
    maxHP,
    currentHP: Math.min(maxHP, currentHP),
    updatedAt: raw?.updatedAt ? String(raw.updatedAt) : undefined,
  };
}

/**
 * Fetch JSON, but if GAS returns HTML (common on errors), include a snippet in the error.
 */
async function fetchJsonStrict(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const text = await res.text();

  let json: any;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    const snippet = text.slice(0, 220).replace(/\s+/g, " ").trim();
    throw new Error(
      `Boss API returned non-JSON (HTTP ${res.status}). Snippet: ${
        snippet || "(empty)"
      }`
    );
  }

  if (!res.ok) {
    const msg = json?.error || json?.message || `Boss API HTTP ${res.status}`;
    throw new Error(msg);
  }

  return json;
}

async function tryGetWithAction(
  action: string,
  bossKey: string,
  bossInstanceId: string
) {
  const url =
    `${API_URL}?action=${encodeURIComponent(action)}` +
    `&bossKey=${encodeURIComponent(bossKey)}` +
    `&bossInstanceId=${encodeURIComponent(bossInstanceId)}` +
    `&_=${Date.now()}`;

  const data = (await fetchJsonStrict(url, { method: "GET" })) as
    | ApiOk<any>
    | ApiErr;

  if (!data || (data as any).ok !== true) {
    const msg =
      (data as any)?.error || (data as any)?.message || "Boss get failed.";
    throw new Error(msg);
  }

  // Apps Script returns { ok:true, bossInstanceId, bossKey, bossName, maxHP, currentHP, updatedAt }
  const raw =
    (data as any).boss ?? (data as any).state ?? (data as any).data ?? data;

  return normBossState(raw, bossKey, bossInstanceId);
}

export async function getBossState(args: GetBossStateArgs): Promise<BossState> {
  const bossKey = String(args.bossKey ?? "").trim();
  const bossInstanceId = String(args.bossInstanceId ?? "").trim();
  if (!bossKey || !bossInstanceId)
    throw new Error("Missing bossKey or bossInstanceId.");

  let lastErr: any = null;

  for (const action of GET_ACTIONS) {
    try {
      return await tryGetWithAction(action, bossKey, bossInstanceId);
    } catch (e: any) {
      lastErr = e;
    }
  }

  throw new Error(
    lastErr?.message || "Boss state could not be loaded (no matching action)."
  );
}

/**
 * GAS-friendly POST:
 * - Use Content-Type: text/plain to avoid CORS preflight (OPTIONS).
 * - Still send JSON as the body; your Apps Script JSON.parse(e.postData.contents) works.
 */
async function tryDeltaWithAction(
  action: string,
  payload: SubmitBossDeltaArgs
): Promise<BossState | null> {
  const url = `${API_URL}?action=${encodeURIComponent(action)}&_=${Date.now()}`;

  const body = JSON.stringify({
    // include action too (harmless) so body-only handlers can still work
    action,
    bossKey: payload.bossKey,
    bossInstanceId: payload.bossInstanceId,
    delta: Math.trunc(toNum(payload.delta, 0)),
    source: (payload.source ?? "").trim(),
    requestId: payload.requestId ?? "",
  });

  const data = (await fetchJsonStrict(url, {
    method: "POST",
    // IMPORTANT: text/plain prevents preflight for GAS web apps.
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body,
  })) as ApiOk<any> | ApiErr;

  if (!data || (data as any).ok !== true) {
    const msg =
      (data as any)?.error || (data as any)?.message || "Boss delta failed.";
    throw new Error(msg);
  }

  const raw =
    (data as any).boss ?? (data as any).state ?? (data as any).data ?? null;

  // Your script returns the fields at top-level (not nested), so fall back to `data`
  return normBossState(raw ?? data, payload.bossKey, payload.bossInstanceId);
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

  let lastErr: any = null;

  for (const action of DELTA_ACTIONS) {
    try {
      return await tryDeltaWithAction(action, {
        ...args,
        bossKey,
        bossInstanceId,
        delta,
      });
    } catch (e: any) {
      lastErr = e;
    }
  }

  throw new Error(
    lastErr?.message || "Boss delta failed (no matching action)."
  );
}
