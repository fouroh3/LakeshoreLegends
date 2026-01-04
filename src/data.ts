// src/data.ts
import type { Student } from "./types";

// ✅ Lakeshore Legends Apps Script Web App (XP/HP API)
export const XP_API_URL =
  "https://script.google.com/macros/s/AKfycbw6gMIFYPvaljF3Ls-waojzprU6bygZZonOIJeKLopN2NSKgkDT-EsRKznxQiGpth_6/exec";

// ✅ Published Master CSV (roster + attributes + bonus columns)
export const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSsHQNK1vvVY-V6nI4kOEilMlAdcnPCdM50QC3-mO4OQsoBDN0l_ROeTUoob3OhJpKD7zIZPXP1VrJw/pub?gid=1383364809&single=true&output=csv";

// ✅ Short cache so purchases show quickly on the dashboard
let cache: { at: number; students: Student[] } | null = null;
const CACHE_MS = 10_000;

/* ---------------- helpers ---------------- */

function normalizeHeader(h: string) {
  return String(h || "")
    .trim()
    .toLowerCase()
    .replace(/\u00a0/g, " ")
    .replace(/[^\w]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toNum(v: any, fallback = 0) {
  const n = Number(String(v ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : fallback;
}

/** Simple CSV parser (handles commas + quotes) */
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (ch === '"') {
      const next = text[i + 1];
      if (inQuotes && next === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && (ch === "," || ch === "\n" || ch === "\r")) {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cur);
      cur = "";

      if (ch === "\n" || ch === "\r") {
        if (row.some((c) => String(c).trim() !== "")) rows.push(row);
        row = [];
      }
      continue;
    }

    cur += ch;
  }

  row.push(cur);
  if (row.some((c) => String(c).trim() !== "")) rows.push(row);

  return rows;
}

function headerIndex(headers: string[]) {
  const map = new Map<string, number>();
  headers.forEach((h, i) => map.set(normalizeHeader(h), i));
  return map;
}

function pick(map: Map<string, number>, ...keys: string[]) {
  for (const k of keys) {
    const idx = map.get(normalizeHeader(k));
    if (idx != null) return idx;
  }
  return -1;
}

function splitSkills(raw: any): string[] {
  const s = String(raw ?? "").trim();
  if (!s) return [];
  return s
    .split(/[;,|]/g)
    .map((x) => x.trim())
    .filter(Boolean);
}

/**
 * ✅ CRITICAL FIX:
 * Master sheet uses a single "Name" column (often "Last, First").
 * This parses it into { first, last } so the cards stop saying "Unnamed Legend".
 */
function splitName(nameRaw: any): { first: string; last: string } {
  const s = String(nameRaw ?? "").trim();
  if (!s) return { first: "", last: "" };

  // "Last, First"
  if (s.includes(",")) {
    const [last, first] = s.split(",").map((x) => x.trim());
    return { first: first || "", last: last || "" };
  }

  // "First Last ..." (fallback: last token is last name)
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return { first: parts[0], last: "" };
  return {
    first: parts.slice(0, -1).join(" "),
    last: parts[parts.length - 1],
  };
}

function rowsToStudents(rows: string[][]): Student[] {
  if (!rows.length) return [];
  const headers = rows[0];
  const idx = headerIndex(headers);

  const iId = pick(idx, "id", "studentid", "student id");
  const iName = pick(idx, "name", "student name");

  // (optional separate columns — supported if present)
  const iFirst = pick(idx, "first", "firstname", "first name");
  const iLast = pick(idx, "last", "lastname", "last name");

  const iHomeroom = pick(idx, "homeroom", "hr", "class");
  const iGuild = pick(idx, "guild");
  const iPortrait = pick(
    idx,
    "portraiturl",
    "portrait url",
    "portrait",
    "avatar",
    "avatarurl"
  );
  const iSkills = pick(idx, "skills", "skill");

  // base stats
  const iStr = pick(idx, "str", "strength");
  const iDex = pick(idx, "dex", "dexterity");
  const iCon = pick(idx, "con", "constitution");
  const iInt = pick(idx, "int", "intelligence");
  const iWis = pick(idx, "wis", "wisdom");
  const iCha = pick(idx, "cha", "charisma");

  // bonus stats (accept many header variants)
  const iStrB = pick(
    idx,
    "str_bonus",
    "str bonus",
    "strength_bonus",
    "strength bonus"
  );
  const iDexB = pick(
    idx,
    "dex_bonus",
    "dex bonus",
    "dexterity_bonus",
    "dexterity bonus"
  );
  const iConB = pick(
    idx,
    "con_bonus",
    "con bonus",
    "constitution_bonus",
    "constitution bonus"
  );
  const iIntB = pick(
    idx,
    "int_bonus",
    "int bonus",
    "intelligence_bonus",
    "intelligence bonus"
  );
  const iWisB = pick(
    idx,
    "wis_bonus",
    "wis bonus",
    "wisdom_bonus",
    "wisdom bonus"
  );
  const iChaB = pick(
    idx,
    "cha_bonus",
    "cha bonus",
    "charisma_bonus",
    "charisma bonus"
  );

  const out: Student[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];

    const idRaw = iId >= 0 ? row[iId] : "";
    const id = String(idRaw || "").trim() || `row-${r}`;

    const nameRaw = iName >= 0 ? String(row[iName] || "").trim() : "";

    // Prefer explicit first/last columns if present, otherwise split Name
    let first = iFirst >= 0 ? String(row[iFirst] || "").trim() : "";
    let last = iLast >= 0 ? String(row[iLast] || "").trim() : "";
    if (!first && !last) {
      const parsed = splitName(nameRaw);
      first = parsed.first;
      last = parsed.last;
    }

    const homeroom = iHomeroom >= 0 ? String(row[iHomeroom] || "").trim() : "";
    const guild = iGuild >= 0 ? String(row[iGuild] || "").trim() : "";

    const baseStr = iStr >= 0 ? toNum(row[iStr], 0) : 0;
    const baseDex = iDex >= 0 ? toNum(row[iDex], 0) : 0;
    const baseCon = iCon >= 0 ? toNum(row[iCon], 0) : 0;
    const baseInt = iInt >= 0 ? toNum(row[iInt], 0) : 0;
    const baseWis = iWis >= 0 ? toNum(row[iWis], 0) : 0;
    const baseCha = iCha >= 0 ? toNum(row[iCha], 0) : 0;

    const bonusStr = iStrB >= 0 ? toNum(row[iStrB], 0) : 0;
    const bonusDex = iDexB >= 0 ? toNum(row[iDexB], 0) : 0;
    const bonusCon = iConB >= 0 ? toNum(row[iConB], 0) : 0;
    const bonusInt = iIntB >= 0 ? toNum(row[iIntB], 0) : 0;
    const bonusWis = iWisB >= 0 ? toNum(row[iWisB], 0) : 0;
    const bonusCha = iChaB >= 0 ? toNum(row[iChaB], 0) : 0;

    // ✅ FINAL stats used by dashboard indicators
    const str = baseStr + bonusStr;
    const dex = baseDex + bonusDex;
    const con = baseCon + bonusCon;
    const int = baseInt + bonusInt;
    const wis = baseWis + bonusWis;
    const cha = baseCha + bonusCha;

    const portraitUrl =
      iPortrait >= 0 ? String(row[iPortrait] || "").trim() : "";
    const skillsRaw = iSkills >= 0 ? row[iSkills] : "";
    const skills = splitSkills(skillsRaw);

    const student: Student = {
      id,
      first,
      last,
      homeroom,
      str,
      dex,
      con,
      int,
      wis,
      cha,
      skills: skills.length ? skills : skillsRaw ? String(skillsRaw) : [],
      ...(guild ? ({ guild } as any) : {}),
      ...(portraitUrl ? { portraitUrl } : {}),
    };

    out.push(student);
  }

  return out;
}

/* ---------------- public API ---------------- */

export async function loadStudents(): Promise<Student[]> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_MS) return cache.students;

  // ✅ cache-bust so new bonuses show after a purchase
  const url = `${SHEET_CSV_URL}${
    SHEET_CSV_URL.includes("?") ? "&" : "?"
  }t=${now}`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok)
    throw new Error(`Failed to fetch roster CSV: HTTP ${res.status}`);

  const text = await res.text();
  const rows = parseCSV(text);
  const students = rowsToStudents(rows);

  cache = { at: now, students };
  return students;
}
