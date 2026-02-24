const BASE_URL =
  "https://script.google.com/macros/s/AKfycbw6gMIFYPvaljF3Ls-waojzprU6bygZZonOIJeKLopN2NSKgkDT-EsRKznxQiGpth_6/exec";

export type BossState = {
  bossInstanceId: string;
  bossKey: string;
  bossName: string;
  maxHP: number;
  currentHP: number;
  updatedAt?: string;
};

type BossResult = { ok: true } & BossState;

function toNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeBossState(
  raw: any,
  fallback: { bossInstanceId: string; bossKey: string }
): BossResult {
  const maxHP = Math.max(1, Math.round(toNumber(raw?.maxHP, 1)));
  const currentHP = Math.max(
    0,
    Math.min(maxHP, Math.round(toNumber(raw?.currentHP, maxHP)))
  );

  return {
    ok: true,
    bossInstanceId: String(raw?.bossInstanceId ?? fallback.bossInstanceId),
    bossKey: String(raw?.bossKey ?? fallback.bossKey),
    bossName: String(raw?.bossName ?? raw?.name ?? fallback.bossKey ?? "Boss"),
    maxHP,
    currentHP,
    updatedAt: raw?.updatedAt ? String(raw.updatedAt) : undefined,
  };
}

export async function getBossState(params: {
  bossInstanceId: string;
  bossKey?: string;
}): Promise<{ ok: true } & BossState> {
  const qs = new URLSearchParams({
    action: "bossstate",
    bossInstanceId: params.bossInstanceId,
    bossKey: params.bossKey ?? "",
    _: String(Date.now()),
  });

  const res = await fetch(`${BASE_URL}?${qs.toString()}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    throw new Error(`bossstate failed (${res.status})`);
  }

  const data = await res.json();
  const raw = data?.boss ?? data;
  return normalizeBossState(raw, {
    bossInstanceId: params.bossInstanceId,
    bossKey: params.bossKey ?? "",
  });
}

export async function submitBossDelta(args: {
  bossInstanceId: string;
  bossKey?: string;
  delta: number;
  source?: string;
  requestId?: string;
}): Promise<{ ok: true } & BossState> {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "bossDelta",
      bossInstanceId: args.bossInstanceId,
      bossKey: args.bossKey ?? "",
      delta: args.delta,
      source: args.source ?? "",
      requestId:
        args.requestId ??
        `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    }),
  });

  if (!res.ok) {
    throw new Error(`bossDelta failed (${res.status})`);
  }

  const data = await res.json();
  const raw = data?.boss ?? data;
  return normalizeBossState(raw, {
    bossInstanceId: args.bossInstanceId,
    bossKey: args.bossKey ?? "",
  });
}
