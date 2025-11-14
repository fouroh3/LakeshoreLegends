// src/data.ts
// Lakeshore Legends — resilient CSV loader → Student[]

import type { Student, Guild } from "./types";

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

function toNumber(n: string | undefined | null): number {
  if (n == null) return 0;
  const cleaned = String(n).replace(/[^\d\-\.]/g, "");
  const parsed = parseInt(cleaned, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Minimal but robust CSV parser:
 * - Handles quoted fields
 * - Handles commas inside quotes
 * - Normalizes line endings
 */
function parseCSV(text: string): { headers: string[]; rows: string[][] } {
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
    if (cur.length > 0) {
      rows.push(cur);
      cur = [];
    }
  };

  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];
    if (ch === '"') {
      if (inQuotes && normalized[i + 1] === '"') {
        // Escaped quote
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
  // Last field/row
  if (field !== "" || inQuotes) {
    pushField();
    pushRow();
  }

  if (rows.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = rows[0].map((h) => stripQuotes(h));
  const dataRows = rows.slice(1);

  return { headers, rows: dataRows };
}

function normalizeGuild(raw: string | undefined | null): Guild | undefined {
  const s = stripQuotes(raw).trim().toLowerCase();
  switch (s) {
    case "scouts":
      return "Scouts";
    case "guardians":
      return "Guardians";
    case "blades":
      return "Blades";
    case "shadows":
      return "Shadows";
    case "scholars":
      return "Scholars";
    case "diplomats":
      return "Diplomats";
    default:
      return undefined;
  }
}

/* ------------------------- Row → Student map ------------------------- */

function rowsToStudents(headers: string[], rows: string[][]): Student[] {
  if (!headers.length) return [];

  // Map lowercased header → index
  const indexByKey = new Map<string, number>();
  headers.forEach((h, idx) => {
    indexByKey.set(h.toLowerCase(), idx);
  });

  const getFromRow = (row: string[], ...keys: string[]): string => {
    for (const key of keys) {
      const idx = indexByKey.get(key.toLowerCase());
      if (idx != null && idx < row.length) {
        const value = row[idx];
        if (value != null && value !== "") return String(value);
      }
    }
    return "";
  };

  const students: Student[] = [];

  rows.forEach((row, rowIndex) => {
    const rawName =
      getFromRow(row, "name") ||
      getFromRow(row, "student", "student name", "full name");

    const name = stripQuotes(rawName);
    if (!name) return; // skip empty rows

    // Homeroom
    const homeroom =
      stripQuotes(
        getFromRow(row, "homeroom", "home room", "hr", "class", "section")
      ) || "";

    // Guild (new)
    const guildRaw = getFromRow(row, "guild");
    const guild = normalizeGuild(guildRaw);

    // Parse "Last, First" or "First Last"
    let first = "";
    let last = "";

    if (name.includes(",")) {
      const [lastPart, firstPart] = name.split(",").map((s) => s.trim());
      last = lastPart || "";
      first = firstPart || "";
    } else {
      const bits = name.split(" ").filter(Boolean);
      if (bits.length === 1) {
        first = bits[0];
      } else {
        first = bits.slice(0, -1).join(" ");
        last = bits[bits.length - 1];
      }
    }

    const str = toNumber(getFromRow(row, "strength", "str"));
    const dex = toNumber(getFromRow(row, "dexterity", "dex"));
    const con = toNumber(getFromRow(row, "constitution", "con"));
    const int = toNumber(getFromRow(row, "intelligence", "int"));
    const wis = toNumber(getFromRow(row, "wisdom", "wis"));
    const cha = toNumber(getFromRow(row, "charisma", "cha"));

    const skillsRaw =
      getFromRow(row, "skills", "skill") ||
      getFromRow(row, "abilities", "ability");
    const skills = stripQuotes(skillsRaw);

    const portraitUrl =
      stripQuotes(
        getFromRow(row, "portraiturl", "portrait url", "avatar", "image")
      ) || undefined;

    const idBase = `${homeroom}-${first}-${last}` || name || `row-${rowIndex}`;
    const id = idBase.replace(/\s+/g, "_");

    const student: Student = {
      id,
      first,
      last,
      homeroom,
      guild,
      str: str ?? 0,
      dex: dex ?? 0,
      con: con ?? 0,
      int: int ?? 0,
      wis: wis ?? 0,
      cha: cha ?? 0,
      skills,
      portraitUrl,
    };

    students.push(student);
  });

  return students;
}

/* ----------------------------- Public API ----------------------------- */

let cache: Student[] | null = null;

export async function loadStudents(): Promise<Student[]> {
  if (cache) return cache;

  const res = await fetch(SHEET_CSV_URL);
  if (!res.ok) {
    console.error("Failed to fetch CSV", res.status, res.statusText);
    cache = [];
    return cache;
  }

  const text = await res.text();
  const { headers, rows } = parseCSV(text);
  cache = rowsToStudents(headers, rows);
  return cache;
}
