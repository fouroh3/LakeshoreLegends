const BOSS_API_URL =
  "https://script.google.com/macros/s/AKfycbw6gMIFYPvaljF3Ls-waojzprU6bygZZonOIJeKLopN2NSKgkDT-EsRKznxQiGpth_6/exec";

export type BossState = {
  bossInstanceId: string;
  bossKey: string;
  bossName: string;
  currentHP: number;
  maxHP: number;
};

function toNumber(n: unknown, fallback = 0): number {
  if (n == null || n === "") return fallback;
  const cleaned = String(n).replace(/[^\d\-.]/g, "");
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function getBossState(args: {
  bossInstanceId: string;
  bossKey: string;
}): Promise<BossState> {
  const qs = new URLSearchParams({
    action: "bossstate",
    bossInstanceId: args.bossInstanceId,
    bossKey: args.bossKey,
    _: String(Date.now()),
  });

  const res = await fetch(`${BOSS_API_URL}?${qs.toString()}`, {
    method: "GET",
    mode: "cors",
  });
  const data = await res.json();
  const raw = data?.boss ?? data ?? {};

  const maxHP = Math.max(1, Math.round(toNumber(raw.maxHP, 1)));
  const currentHP = Math.max(
    0,
    Math.min(maxHP, Math.round(toNumber(raw.currentHP, maxHP)))
  );

  return {
    bossInstanceId: String(raw.bossInstanceId ?? args.bossInstanceId),
    bossKey: String(raw.bossKey ?? args.bossKey),
    bossName: String(raw.bossName ?? raw.name ?? args.bossKey),
    currentHP,
    maxHP,
  };
}

export async function submitBossDelta(args: {
  bossInstanceId: string;
  bossKey: string;
  delta: number;
  source: string;
  requestId: string;
}): Promise<unknown> {
  const res = await fetch(BOSS_API_URL, {
    method: "POST",
    mode: "cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "bossDelta",
      bossInstanceId: args.bossInstanceId,
      bossKey: args.bossKey,
      delta: args.delta,
      source: args.source,
      requestId: args.requestId,
    }),
  });

  return res.json();
}
