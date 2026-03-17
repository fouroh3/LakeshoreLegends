// src/bossApi.ts
/**
 * Lakeshore Legends — Boss API client (robust + GAS-friendly CORS)
 *
 * GET:
 *   ?action=bossstate&bossInstanceId=...&bossKey=...
 *   bossKey is now optional on the client side.
 *
 * POST:
 *   ?action=bossdelta
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
  bossInstanceId: string;
  bossKey?: string;
};

export type SubmitBossDeltaArgs = {
  bossKey: string;
  bossInstanceId: string;
  delta: number;
  source?: string;
  requestId?: string;
  round?: number;
  guild?: string;
  homeroom?: string;
  actionType?: string;
};

type ApiOk<T> = { ok: true } & T;
type ApiErr = { ok: false; error?: string; message?: string };

const DEFAULT_API_URL =
  "https://script.google.com/macros/s/AKfycbw6gMIFYPvaljF3Ls-waojzprU6bygZZonOIJeKLopN2NSKgkDT-EsRKznxQiGpth_6/exec";

const API_URL =
  (import.meta as any).env?.VITE_LL_API_URL ||
  (import.meta as any).env?.VITE_HP_API_URL ||
  DEFAULT_API_URL;

const GET_ACTIONS = [
  "bossstate",
  "bossState",
  "boss_state",
  "getBossState",
  "bossGet",
  "boss",
  "getBoss",
] as const;

const DELTA_ACTIONS = [
  "bossdelta",
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
  fallbackBossKey: string,
  fallbackBossInstanceId: string
): BossState {
  const maxHP = Math.max(1, Math.round(toNum(raw?.maxHP, 1)));
  const currentHP = Math.max(0, Math.round(toNum(raw?.currentHP, 0)));

  return {
    bossKey: String(raw?.bossKey ?? fallbackBossKey ?? "").trim(),
    bossInstanceId: String(
      raw?.bossInstanceId ?? fallbackBossInstanceId ?? ""
    ).trim(),
    bossName: String(
      raw?.bossName ?? raw?.name ?? raw?.bossKey ?? fallbackBossKey ?? "Boss"
    ).trim(),
    maxHP,
    currentHP: Math.min(maxHP, currentHP),
    updatedAt: raw?.updatedAt ? String(raw.updatedAt) : undefined,
  };
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
  bossInstanceId: string,
  bossKey?: string
) {
  let url =
    `${API_URL}?action=${encodeURIComponent(action)}` +
    `&bossInstanceId=${encodeURIComponent(bossInstanceId)}` +
    `&_=${Date.now()}`;

  if (bossKey) {
    url += `&bossKey=${encodeURIComponent(bossKey)}`;
  }

  const data = (await fetchJsonStrict(url, { method: "GET" })) as
    | ApiOk<any>
    | ApiErr;

  if (!data || (data as any).ok !== true) {
    const msg =
      (data as any)?.error || (data as any)?.message || "Boss get failed.";
    throw new Error(msg);
  }

  const raw =
    (data as any).boss ?? (data as any).state ?? (data as any).data ?? data;

  return normBossState(raw, bossKey ?? "", bossInstanceId);
}

export async function getBossState(args: GetBossStateArgs): Promise<BossState> {
  const bossInstanceId = String(args.bossInstanceId ?? "").trim();
  const bossKey = String(args.bossKey ?? "").trim();

  if (!bossInstanceId) {
    throw new Error("Missing bossInstanceId.");
  }

  let lastErr: any = null;

  for (const action of GET_ACTIONS) {
    try {
      return await tryGetWithAction(
        action,
        bossInstanceId,
        bossKey || undefined
      );
    } catch (e: any) {
      lastErr = e;
    }
  }

  throw new Error(
    lastErr?.message || "Boss state could not be loaded (no matching action)."
  );
}

async function tryDeltaWithAction(
  action: string,
  payload: SubmitBossDeltaArgs
): Promise<BossState | null> {
  const url = `${API_URL}?action=${encodeURIComponent(action)}&_=${Date.now()}`;

  const body = JSON.stringify({
    action,
    bossKey: payload.bossKey,
    bossInstanceId: payload.bossInstanceId,
    delta: Math.trunc(toNum(payload.delta, 0)),
    source: (payload.source ?? "").trim(),
    requestId: payload.requestId ?? "",
    round:
      payload.round != null && Number.isFinite(Number(payload.round))
        ? Math.trunc(Number(payload.round))
        : "",
    guild: (payload.guild ?? "").trim(),
    homeroom: (payload.homeroom ?? "").trim(),
    actionType: (payload.actionType ?? "").trim(),
  });

  const data = (await fetchJsonStrict(url, {
    method: "POST",
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

  return normBossState(raw ?? data, payload.bossKey, payload.bossInstanceId);
}

export async function submitBossDelta(
  args: SubmitBossDeltaArgs
): Promise<BossState | null> {
  const bossKey = String(args.bossKey ?? "").trim();
  const bossInstanceId = String(args.bossInstanceId ?? "").trim();
  const delta = Math.trunc(toNum(args.delta, 0));

  if (!bossKey || !bossInstanceId) {
    throw new Error("Missing bossKey or bossInstanceId.");
  }

  if (!Number.isFinite(delta) || delta === 0) {
    throw new Error("Invalid delta.");
  }

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
