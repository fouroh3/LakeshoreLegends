import type { Student } from "../../types";
import type { AttrKey } from "../../xpApi";

export function isSheetErrorLike(v: unknown) {
  const s = String(v ?? "")
    .trim()
    .toUpperCase();
  return (
    s === "#REF!" ||
    s === "#N/A" ||
    s === "#VALUE!" ||
    s === "#ERROR!" ||
    s === "#DIV/0!"
  );
}

export function cleanText(v: unknown) {
  if (v == null) return "";
  const s = String(v)
    .replace(/\u00A0/g, " ")
    .trim();
  if (!s || isSheetErrorLike(s)) return "";
  return s;
}

export function fullName(s: Student) {
  const row = s as Record<string, unknown>;
  const first = cleanText(row.first);
  const last = cleanText(row.last);
  const name = [last, first].filter(Boolean).join(", ");
  return name || cleanText(row.name) || "Unknown";
}

export function initialsForStudent(s: Student | null) {
  if (!s) return "LL";
  const row = s as Record<string, unknown>;
  const first = cleanText(row.first);
  const last = cleanText(row.last);
  const joined = [first, last].filter(Boolean).join(" ").trim();
  if (!joined) return "LL";
  return joined
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0]?.toUpperCase() ?? "")
    .join("");
}

export function normIdForConfirm(v: string) {
  return String(v ?? "")
    .replace(/\u00A0/g, " ")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, "")
    .trim()
    .toUpperCase();
}

export function rosterBaseAttr(s: Student, t: AttrKey) {
  const row = s as Record<string, unknown>;
  const map: Record<AttrKey, string> = {
    STR: "str",
    DEX: "dex",
    CON: "con",
    INT: "int",
    WIS: "wis",
    CHA: "cha",
  };
  return Number(row[map[t]] ?? 0);
}

export function isTransientPurchaseError(err: unknown) {
  const msg = String(err ?? "").toLowerCase();
  return (
    msg.includes("failed to fetch") ||
    msg.includes("network") ||
    msg.includes("timeout") ||
    msg.includes("timed out") ||
    msg.includes("rate") ||
    msg.includes("tempor") ||
    msg.includes("try again") ||
    msg.includes("service unavailable") ||
    msg.includes("503") ||
    msg.includes("502") ||
    msg.includes("504")
  );
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
