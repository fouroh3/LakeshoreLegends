// src/pages/battle/battleUtils.ts
import type { Student } from "../../types";
import type { HpStatus } from "./battleTypes";

export function stripQuotes(s: string | undefined | null): string {
  if (!s) return "";
  const t = String(s).trim();
  return t.replace(/^["'‘’“”]+|["'‘’“”]+$/g, "");
}

export function normId(id: string | undefined | null) {
  return stripQuotes(String(id ?? ""))
    .replace(/\u00A0/g, " ")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, "")
    .trim()
    .toUpperCase();
}

export function toNumber(n: string | undefined | null, fallback = 0): number {
  if (n == null || n === "") return fallback;
  const cleaned = String(n).replace(/[^\d\-\.]/g, "");
  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** CSV parser (quotes + commas in quotes) */
export function parseCSV(text: string): {
  headers: string[];
  rows: string[][];
} {
  const rows: string[][] = [];
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  let cur: string[] = [];
  let field = "";
  let inQuotes = false;

  const pushField = () => {
    cur.push(field);
    field = "";
  };

  const pushRow = () => {
    if (cur.some((c) => String(c ?? "").trim() !== "")) rows.push(cur);
    cur = [];
  };

  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];
    if (ch === '"') {
      if (inQuotes && normalized[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      pushField();
    } else if (ch === "\n" && !inQuotes) {
      pushField();
      pushRow();
    } else {
      field += ch;
    }
  }

  if (field !== "" || cur.length) {
    pushField();
    pushRow();
  }

  if (rows.length === 0) return { headers: [], rows: [] };

  const headers = rows[0].map((h) => stripQuotes(h));
  const dataRows = rows.slice(1);
  return { headers, rows: dataRows };
}

export function idxMap(headers: string[]) {
  const m = new Map<string, number>();
  headers.forEach((h, i) => m.set(h.toLowerCase(), i));
  return m;
}

export function getCell(
  row: string[],
  map: Map<string, number>,
  ...keys: string[]
) {
  for (const k of keys) {
    const idx = map.get(k.toLowerCase());
    if (idx == null) continue;
    const v = row[idx];
    if (v != null && String(v).trim() !== "") return String(v);
  }
  return "";
}

export function fullName(s: Student) {
  const last = (s.last ?? "").trim();
  const first = (s.first ?? "").trim();
  if (!last && !first) return "Unknown";
  if (!last) return first;
  if (!first) return last;
  return `${last}, ${first}`;
}

export function skillsToArray(skills: Student["skills"]): string[] {
  if (!skills) return [];
  if (Array.isArray(skills))
    return skills
      .filter(Boolean)
      .map((s) => String(s).trim())
      .filter(Boolean);

  const s = String(skills).trim();
  if (!s) return [];
  return s
    .split(/[,;|]/g)
    .map((x) => x.trim())
    .filter(Boolean);
}

export function prettifyBossKey(key: string) {
  return stripQuotes(key)
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

export function hpStatus(current: number, base: number): HpStatus {
  const b = Math.max(1, base || 1);
  const pct = Math.max(0, Math.min(1, current / b));

  if (current <= 0) {
    return {
      label: "Dead",
      pillClass: "bg-zinc-800 text-zinc-200 border border-zinc-700",
    };
  }
  if (pct < 0.4) {
    return {
      label: "Critical",
      pillClass: "bg-red-950/50 text-red-200 border border-red-900/50",
    };
  }
  if (pct < 0.7) {
    return {
      label: "Wounded",
      pillClass: "bg-amber-950/40 text-amber-200 border border-amber-900/50",
    };
  }
  return {
    label: "Healthy",
    pillClass:
      "bg-emerald-950/40 text-emerald-200 border border-emerald-900/50",
  };
}

export function makeSubmitNonce() {
  const c: any = (globalThis as any).crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function cacheBust(url: string) {
  const join = url.includes("?") ? "&" : "?";
  return `${url}${join}_=${Date.now()}`;
}
