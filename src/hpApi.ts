// src/hpApi.ts

// ✅ Apps Script Web App (single source of truth)
export const HP_API_URL =
  "https://script.google.com/macros/s/AKfycbw6gMIFYPvaljF3Ls-waojzprU6bygZZonOIJeKLopN2NSKgkDT-EsRKznxQiGpth_6/exec";

function stripQuotes(s: string | undefined | null): string {
  if (!s) return "";
  const t = String(s).trim();
  return t.replace(/^["'‘’“”]+|["'‘’“”]+$/g, "");
}

function normId(id: string | undefined | null) {
  return stripQuotes(String(id ?? ""))
    .replace(/\u00A0/g, " ")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, "")
    .trim()
    .toUpperCase();
}

function toNumber(n: any, fallback = 0): number {
  if (n == null || n === "") return fallback;
  const cleaned = String(n).replace(/[^\d\-\.]/g, "");
  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Pull current HP state map from Apps Script
 * Expected response: { ok: true, hp: [{ studentId, baseHP, currentHP }, ...] }
 */
export async function fetchHpMap(): Promise<
  Map<string, { baseHP: number; currentHP: number }>
> {
  const res = await fetch(`${HP_API_URL}?action=hp&_=${Date.now()}`, {
    method: "GET",
  });

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // if script returns non-json, treat as failure
  }

  const map = new Map<string, { baseHP: number; currentHP: number }>();
  if (!data || data.ok !== true || !Array.isArray(data.hp)) return map;

  for (const r of data.hp) {
    const id = normId(r?.studentId);
    if (!id) continue;

    const baseHP = Math.max(1, Math.round(toNumber(r?.baseHP, 20)));
    const currentHP = Math.max(
      0,
      Math.min(baseHP, Math.round(toNumber(r?.currentHP, baseHP)))
    );

    map.set(id, { baseHP, currentHP });
  }

  return map;
}

type SubmitArgs = {
  studentId: string;
  delta: number; // negative = damage, positive = heal
  note?: string;
  sessionId: string;
};

/**
 * Log an HP delta to the sheet via Apps Script
 * Expected response: { ok: true } on success (or { ok:false, error?:string })
 *
 * IMPORTANT: Uses x-www-form-urlencoded so Apps Script can read e.parameter.<key>
 */
export async function submitHpDelta({
  studentId,
  delta,
  note = "",
  sessionId,
}: SubmitArgs): Promise<void> {
  const sid = stripQuotes(sessionId);
  const id = normId(studentId);

  // Guard rails (prevents silent weird submits)
  if (!sid) throw new Error("Missing sessionId");
  if (!id) throw new Error("Missing studentId");
  if (!Number.isFinite(delta) || delta === 0) throw new Error("Invalid delta");

  const body = new URLSearchParams();
  // ✅ These keys must match what your Apps Script expects
  body.set("action", "log"); // <- if your script uses "submit" instead, change here ONLY
  body.set("sessionId", sid);
  body.set("studentId", id);
  body.set("delta", String(delta));
  body.set("note", note.trim());

  const res = await fetch(HP_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    body: body.toString(),
  });

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // Some scripts return text/html if misconfigured — make that an explicit failure
    const txt = await res.text().catch(() => "");
    throw new Error(
      `HP API returned non-JSON (${res.status}). ${txt.slice(0, 120)}`
    );
  }

  if (!data || data.ok !== true) {
    const msg =
      (data && (data.error || data.message)) || `HP API failed (${res.status})`;
    throw new Error(msg);
  }
}
