// src/data.ts
// Lakeshore Legends — resilient CSV loader → Student[]
import type { Student } from "./types";

/**
 * PUBLISH-TO-WEB CSV of your MASTER sheet
 * (File → Share → Publish to web → choose the master tab → CSV)
 */
export const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSsHQNK1vvVY-V6nI4kOEilMlAdcnPCdM50QC3-mO4OQsoBDN0l_ROeTUoob3OhJpKD7zIZPXP1VrJw/pub?gid=0&single=true&output=csv";

/* ----------------------------- Utilities ----------------------------- */

function stripQuotes(s: string | undefined | null): string {
  if (!s) return "";
  const t = String(s).trim();
  return t.replace(/^["'‘’“”]+|["'‘’“”]+$/g, "");
}

function toNumber(n: string | number | null | undefined): number | undefined {
  if (n === null || n === undefined) return undefined;
  const x =
    typeof n === "number" ? n : Number(String(n).replace(/[^\d.-]/g, ""));
  return Number.isFinite(x) ? x : undefined;
}

/** small CSV parser handling basic quoted fields and escaped quotes ("") */
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let cur = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        cur += '"'; // escaped quote
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      row.push(cur);
      cur = "";
      continue;
    }
    if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (cur.length || row.length) {
        row.push(cur);
        rows.push(row);
        row = [];
        cur = "";
      }
      continue;
    }
    cur += ch;
  }
  if (cur.length || row.length) {
    row.push(cur);
    rows.push(row);
  }
  return rows;
}

/* -------------------------- Header normalization -------------------------- */

const HEADER_ALIASES: Record<string, string[]> = {
  // Names — include both “First”/“Last” and spaced variants
  first: ["first", "first name", "given", "fname"],
  last: ["last", "last name", "surname", "lname", "family name"],
  // Single-column name fallback
  name: ["name", "student", "student name", "full name"],

  homeroom: ["homeroom", "hr", "home room", "class", "room"],

  str: ["str", "strength"],
  dex: ["dex", "dexterity"],
  con: ["con", "constitution"],
  int: ["int", "intelligence"],
  wis: ["wis", "wisdom"],
  cha: ["cha", "charisma"],

  skills: ["skills", "skill", "tags"],

  portraitUrl: [
    "portraiturl",
    "portrait url",
    "image",
    "imageurl",
    "img",
    "avatar",
    "photo",
  ],
};

function normalizeHeaders(headers: string[]): string[] {
  return headers.map((h) => stripQuotes(h).toLowerCase().trim());
}
function findIndex(headers: string[], keys: string[]): number {
  for (const k of keys) {
    const i = headers.indexOf(k);
    if (i !== -1) return i;
  }
  return -1;
}

/* --------------------------- Name parsing helper -------------------------- */

function splitName(full: string): { first: string; last: string } {
  const s = stripQuotes(full).replace(/\s+/g, " ").trim();
  if (!s) return { first: "", last: "" };

  // Pattern: Last, First (with optional middle pieces)
  const commaIdx = s.indexOf(",");
  if (commaIdx > -1) {
    const last = s.slice(0, commaIdx).trim();
    const rest = s.slice(commaIdx + 1).trim();
    // take first token in rest as first name
    const first = rest.split(" ")[0] ?? "";
    return { first: stripQuotes(first), last: stripQuotes(last) };
  }

  // Pattern: First Last (space-separated)
  const parts = s.split(" ");
  if (parts.length === 1) {
    return { first: parts[0], last: "" };
  }
  const first = parts[0];
  const last = parts.slice(1).join(" ");
  return { first: stripQuotes(first), last: stripQuotes(last) };
}

/* ---------------------------- Row → Student[] ---------------------------- */

function rowsToStudents(rows: string[][]): Student[] {
  if (!rows.length) return [];

  const headers = normalizeHeaders(rows[0]);

  // Make sure we also accept Title Case “First”/“Last”
  if (!HEADER_ALIASES.first.includes("first"))
    HEADER_ALIASES.first.push("first");
  if (!HEADER_ALIASES.last.includes("last")) HEADER_ALIASES.last.push("last");

  const idx = {
    first: findIndex(headers, HEADER_ALIASES.first),
    last: findIndex(headers, HEADER_ALIASES.last),
    name: findIndex(headers, HEADER_ALIASES.name),
    homeroom: findIndex(headers, HEADER_ALIASES.homeroom),
    str: findIndex(headers, HEADER_ALIASES.str),
    dex: findIndex(headers, HEADER_ALIASES.dex),
    con: findIndex(headers, HEADER_ALIASES.con),
    int: findIndex(headers, HEADER_ALIASES.int),
    wis: findIndex(headers, HEADER_ALIASES.wis),
    cha: findIndex(headers, HEADER_ALIASES.cha),
    skills: findIndex(headers, HEADER_ALIASES.skills),
    portraitUrl: findIndex(headers, HEADER_ALIASES.portraitUrl),
  };

  const out: Student[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.every((c) => !String(c ?? "").trim())) continue;

    // Name resolution — prefer explicit First/Last; fallback to single Name column
    let first = idx.first >= 0 ? stripQuotes(row[idx.first]) : "";
    let last = idx.last >= 0 ? stripQuotes(row[idx.last]) : "";

    if ((!first || !last) && idx.name >= 0) {
      const fromName = splitName(row[idx.name] ?? "");
      if (!first) first = fromName.first;
      if (!last) last = fromName.last;
    }

    const homeroom = idx.homeroom >= 0 ? stripQuotes(row[idx.homeroom]) : "";

    // Skills: handle comma/semicolon; trim empties
    const rawSkills = idx.skills >= 0 ? stripQuotes(row[idx.skills]) : "";
    const skills =
      rawSkills
        ?.split(/[;,]/)
        .map((s) => stripQuotes(s).trim())
        .filter(Boolean) ?? [];

    const student: Student = {
      id: `${first}-${last}-${homeroom}-${r}`,
      first,
      last,
      homeroom,

      // ✅ Force numeric defaults (no undefined)
      str: idx.str >= 0 ? toNumber(row[idx.str]) ?? 0 : 0,
      dex: idx.dex >= 0 ? toNumber(row[idx.dex]) ?? 0 : 0,
      con: idx.con >= 0 ? toNumber(row[idx.con]) ?? 0 : 0,
      int: idx.int >= 0 ? toNumber(row[idx.int]) ?? 0 : 0,
      wis: idx.wis >= 0 ? toNumber(row[idx.wis]) ?? 0 : 0,
      cha: idx.cha >= 0 ? toNumber(row[idx.cha]) ?? 0 : 0,

      skills,
      portraitUrl:
        idx.portraitUrl >= 0
          ? stripQuotes(row[idx.portraitUrl]) || undefined
          : undefined,
    };

    out.push(student);
  }

  return out;
}

/* --------------------------------- Cache --------------------------------- */

const cache: { ts?: number; data?: Student[] } = {};
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function loadStudents(force = false): Promise<Student[]> {
  const now = Date.now();
  if (!force && cache.data && cache.ts && now - cache.ts < CACHE_TTL_MS) {
    return cache.data;
  }

  const res = await fetch(SHEET_CSV_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch sheet (HTTP ${res.status})`);

  const csv = await res.text();
  const rows = parseCSV(csv);
  const students = rowsToStudents(rows);

  cache.data = students;
  cache.ts = now;
  return students;
}
