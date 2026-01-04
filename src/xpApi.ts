// src/xpApi.ts

export type AttrKey = "STR" | "DEX" | "CON" | "INT" | "WIS" | "CHA";

export type AttrsBundle = {
  base: Record<AttrKey, number>;
  bonus: Record<AttrKey, number>;
  final: Record<AttrKey, number>;
};

export type StoreState = {
  storeLocked: boolean;
  windowLabel?: string;
  xpPerPoint: number;
  maxPointsPerOpen: number;
  openNonce?: string;
  now?: string;
  xpLastWriteIso?: string;
};

export type XpTxn = {
  timestamp: string;
  type: "EARN" | "SPEND";
  xp: number;
  target?: string;
  note?: string;
};

export type XpSummary = {
  studentId: string;
  earned: number;
  spent: number;
  balance: number;
  spendablePoints: number;
  recent: XpTxn[];
  attrs?: AttrsBundle;
};

type SpendXpArgs = {
  studentId: string;
  pin: string;
  target: AttrKey;
  points: number;
};

type SpendXpResponse = {
  ok: true;
  studentId: string;
  target: AttrKey;
  points: number;
  costXp: number;
  balanceBefore: number;
  balanceAfter: number;
  bonusBefore?: number;
  bonusAfter?: number;
  attrs?: AttrsBundle;
  summary?: XpSummary;
  xpLastWriteIso?: string;
};

const XP_API_URL =
  "https://script.google.com/macros/s/AKfycbw6gMIFYPvaljF3Ls-waojzprU6bygZZonOIJeKLopN2NSKgkDT-EsRKznxQiGpth_6/exec";

/* ---------------- helpers ---------------- */

function toBool(v: any): boolean {
  if (typeof v === "boolean") return v;
  const s = String(v ?? "")
    .trim()
    .toLowerCase();
  if (["true", "1", "yes", "y"].includes(s)) return true;
  if (["false", "0", "no", "n"].includes(s)) return false;
  return false;
}

async function fetchJson(url: string, init?: RequestInit) {
  // IMPORTANT:
  // - Do NOT set custom headers for GET (avoids CORS preflight)
  // - Only set headers when we truly need them (we won’t, since POST uses form encoding below)
  const res = await fetch(url, {
    ...init,
    mode: "cors",
    cache: "no-store",
    redirect: "follow",
  });

  const text = await res.text();

  let data: any;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error("Invalid JSON from XP API");
  }

  if (!res.ok || data?.ok === false) {
    throw new Error(data?.error || `XP API error (${res.status})`);
  }

  return data;
}

/* ---------------- API ---------------- */

export async function getStoreState(): Promise<StoreState> {
  // cache bust without extra headers
  const url = `${XP_API_URL}?action=xpState&t=${Date.now()}`;
  const data = await fetchJson(url);

  return {
    storeLocked: toBool(data.storeLocked),
    windowLabel: String(data.windowLabel ?? ""),
    xpPerPoint: Number(data.xpPerPoint ?? 5),
    maxPointsPerOpen: Number(data.maxPointsPerOpen ?? 999),
    openNonce: String(data.openNonce ?? ""),
    now: String(data.now ?? ""),
    xpLastWriteIso: String(data.xpLastWriteIso ?? ""),
  };
}

export async function getXpSummary(studentId: string): Promise<XpSummary> {
  const url = `${XP_API_URL}?action=xpSummary&studentId=${encodeURIComponent(
    studentId
  )}&t=${Date.now()}`;

  const data = await fetchJson(url);

  return {
    studentId: String(data.studentId || studentId),
    earned: Number(data.earned ?? 0),
    spent: Number(data.spent ?? 0),
    balance: Number(data.balance ?? 0),
    spendablePoints: Number(data.spendablePoints ?? 0),
    recent: Array.isArray(data.recent)
      ? data.recent.map((r: any) => ({
          timestamp: String(r.timestamp ?? ""),
          type:
            String(r.type ?? "EARN").toUpperCase() === "SPEND"
              ? "SPEND"
              : "EARN",
          xp: Number(r.xp ?? 0),
          target: r.target ? String(r.target) : undefined,
          note: r.note ? String(r.note) : undefined,
        }))
      : [],
    attrs: data.attrs ?? undefined,
  };
}

export async function spendXp(args: SpendXpArgs): Promise<SpendXpResponse> {
  // ✅ Send as x-www-form-urlencoded to avoid preflight entirely
  const body = new URLSearchParams();
  body.set("action", "spendXp");
  body.set("studentId", args.studentId);
  body.set("pin", args.pin);
  body.set("target", args.target);
  body.set("points", String(args.points));
  body.set("t", String(Date.now()));

  const data = await fetchJson(XP_API_URL, {
    method: "POST",
    body,
    // NO headers — browser sets correct form header automatically
  });

  return data as SpendXpResponse;
}
