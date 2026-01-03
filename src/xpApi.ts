// src/xpApi.ts
export const XP_API_URL =
  "https://script.google.com/macros/s/AKfycbw6gMIFYPvaljF3Ls-waojzprU6bygZZonOIJeKLopN2NSKgkDT-EsRKznxQiGpth_6/exec";

export type StoreState = {
  storeLocked: boolean;
  windowLabel?: string;
  xpPerPoint: number;
  maxPointsPerOpen?: number;
  openNonce?: string;
};

export type XpTxn = {
  timestamp: string;
  type: "EARN" | "SPEND";
  xp: number;
  target?: "STR" | "DEX" | "CON" | "INT" | "WIS" | "CHA";
  note?: string;
};

export type XpSummary = {
  studentId: string;
  earned: number;
  spent: number;
  balance: number;
  spendablePoints: number;
  recent?: XpTxn[];
};

type ApiOk<T> = { ok: true } & T;
type ApiErr = { ok: false; error: string };

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const text = await res.text().catch(() => "");
  if (!res.ok)
    throw new Error(`XP API ${res.status}: ${text || res.statusText}`);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`XP API invalid JSON: ${text.slice(0, 200)}`);
  }
}

function unwrap_<T>(x: ApiOk<T> | ApiErr): T {
  if (!x || (x as any).ok !== true)
    throw new Error((x as any)?.error || "XP API error");
  const { ok, ...rest } = x as any;
  return rest as T;
}

export async function getStoreState(): Promise<StoreState> {
  const url = new URL(XP_API_URL);
  url.searchParams.set("action", "xpState");
  const raw = await fetchJson<ApiOk<StoreState> | ApiErr>(url.toString());
  return unwrap_(raw);
}

export async function getXpSummary(studentId: string): Promise<XpSummary> {
  const url = new URL(XP_API_URL);
  url.searchParams.set("action", "xpSummary");
  url.searchParams.set("studentId", studentId);

  const raw = await fetchJson<ApiOk<XpSummary> | ApiErr>(url.toString());
  const data = unwrap_(raw);

  return {
    ...data,
    recent: (data.recent ?? []).map((r: any) => ({
      timestamp: String(r.timestamp ?? ""),
      type: (String(r.type ?? "EARN").toUpperCase() === "SPEND"
        ? "SPEND"
        : "EARN") as "EARN" | "SPEND",
      xp: Number(r.xp ?? 0),
      target: (r.target ? String(r.target).toUpperCase() : undefined) as any,
      note: r.note ? String(r.note) : undefined,
    })),
  };
}

export async function spendXp(args: {
  studentId: string;
  pin: string;
  target: "STR" | "DEX" | "CON" | "INT" | "WIS" | "CHA";
  points: number;
}): Promise<{ summary?: XpSummary }> {
  // IMPORTANT:
  // Use a "simple request" body to avoid browser CORS preflight (OPTIONS),
  // which Apps Script web apps often don't handle reliably.
  const body = new URLSearchParams({
    action: "spendXp",
    studentId: args.studentId,
    pin: args.pin,
    target: args.target,
    points: String(args.points),
  }).toString();

  const raw = await fetchJson<any>(XP_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      Accept: "application/json",
    },
    body,
  });

  if (raw?.ok !== true) throw new Error(raw?.error || "Spend failed");

  // Normalize summary shape (your server returns summary as a plain object)
  const sum = raw.summary
    ? {
        ...raw.summary,
        recent: (raw.summary.recent ?? []).map((r: any) => ({
          timestamp: String(r.timestamp ?? ""),
          type: (String(r.type ?? "EARN").toUpperCase() === "SPEND"
            ? "SPEND"
            : "EARN") as "EARN" | "SPEND",
          xp: Number(r.xp ?? 0),
          target: (r.target
            ? String(r.target).toUpperCase()
            : undefined) as any,
          note: r.note ? String(r.note) : undefined,
        })),
      }
    : undefined;

  return { summary: sum };
}
