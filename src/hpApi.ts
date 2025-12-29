// src/hpApi.ts

type SubmitHpDeltaInput = {
  studentId: string;
  delta: number;
  note?: string;
  sessionId: string;
};

type HpApiOk = {
  ok: true;
  message?: string;
  [k: string]: any;
};

function getHpWebAppUrl(): string {
  const fromEnv = (import.meta as any)?.env?.VITE_HP_WEB_APP_URL;
  const envUrl = typeof fromEnv === "string" ? fromEnv.trim() : "";

  // Optional fallback so your GitHub repo works even if env isn't set yet.
  const fallback =
    "https://script.google.com/macros/s/AKfycbw6gMIFYPvaljF3Ls-waojzprU6bygZZonOIJeKLopN2NSKgkDT-EsRKznxQiGpth_6/exec";

  const resolved = envUrl || fallback;
  if (!resolved) {
    throw new Error(
      "HP_WEB_APP_URL is missing. Set VITE_HP_WEB_APP_URL in your environment."
    );
  }
  return resolved;
}

function cleanSessionId(sessionId: string): string {
  return String(sessionId ?? "")
    .replace(/^["'‘’“”]+|["'‘’“”]+$/g, "")
    .replace(/\u00A0/g, " ")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, "")
    .trim();
}

/**
 * Apps Script + browsers commonly fail CORS preflight when using
 * Content-Type: application/json.
 *
 * So we POST a "simple request" using text/plain to avoid preflight.
 * Your Apps Script doPost(e) can still JSON.parse(e.postData.contents).
 */
export async function submitHpDelta(
  input: SubmitHpDeltaInput
): Promise<HpApiOk> {
  const HP_WEB_APP_URL = getHpWebAppUrl();

  const delta = Number(input.delta);
  if (!Number.isFinite(delta) || delta === 0) {
    throw new Error("Invalid HP delta.");
  }

  const payload = {
    studentId: String(input.studentId ?? "").trim(),
    delta,
    note: String(input.note ?? "").trim(),
    sessionId: cleanSessionId(input.sessionId),
  };

  const res = await fetch(HP_WEB_APP_URL, {
    method: "POST",
    // ✅ "simple" content-type => avoids OPTIONS preflight
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
    // credentials: "omit" is default; keep it that way
  });

  // If Apps Script returns something readable, great. If not, still handle.
  const text = await res.text().catch(() => "");

  if (!res.ok) {
    throw new Error(text || `HTTP ${res.status} ${res.statusText}`);
  }

  // Try JSON, but allow plain text
  try {
    const data = text ? JSON.parse(text) : null;
    if (data && typeof data === "object") return data as HpApiOk;
  } catch {
    // ignore
  }

  return { ok: true, message: text || "Sent" };
}
