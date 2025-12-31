// src/hpApi.ts
const HP_API_URL =
  "https://script.google.com/macros/s/AKfycbw6gMIFYPvaljF3Ls-waojzprU6bygZZonOIJeKLopN2NSKgkDT-EsRKznxQiGpth_6/exec";

function normId(id: string | undefined | null) {
  return String(id ?? "")
    .replace(/\u00A0/g, " ")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, "")
    .trim()
    .toUpperCase();
}

export async function submitHpDelta(args: {
  studentId: string;
  delta: number;
  note?: string;
  sessionId: string;
}) {
  const res = await fetch(HP_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      // ✅ IMPORTANT: normalize so it matches the HP sheet ids consistently
      studentId: normId(args.studentId),
      delta: args.delta,
      note: args.note ?? "",
      sessionId: args.sessionId,
    }),
  });

  const data = await res.json().catch(() => null);
  if (!data || !data.ok) {
    throw new Error(data?.error || "HP submit failed.");
  }
  return data;
}

/**
 * Fetch HP map from web app.
 * Returns Map<StudentID, { baseHP, currentHP }>
 */
export async function fetchHpMap(): Promise<
  Map<string, { baseHP: number; currentHP: number }>
> {
  const res = await fetch(`${HP_API_URL}?action=hp&_=${Date.now()}`, {
    method: "GET",
  });

  const data = await res.json().catch(() => null);
  const out = new Map<string, { baseHP: number; currentHP: number }>();

  if (!data || !data.ok || !Array.isArray(data.hp)) return out;

  for (const r of data.hp) {
    const id = normId(r?.studentId);
    if (!id) continue;

    const baseHP = Math.max(1, Math.round(Number(r?.baseHP ?? 20)));
    const currentHP = Math.max(
      0,
      Math.min(baseHP, Math.round(Number(r?.currentHP ?? baseHP)))
    );

    out.set(id, { baseHP, currentHP });
  }

  return out;
}
