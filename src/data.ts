// src/data.ts
import type { Student, Guild } from "./types";

export const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSsHQNK1vvVY-V6nI4kOEilMlAdcnPCdM50QC3-mO4OQsoBDN0l_ROeTUoob3OhJpKD7zIZPXP1VrJw/pub?gid=1383364809&single=true&output=csv";

function stripQuotes(s: string | undefined | null): string {
  if (!s) return "";
  const t = String(s).trim();
  return t.replace(/^["'‘’“”]+|["'‘’“”]+$/g, "");
}

function toNumber(n: string | undefined | null, fallback = 0): number {
  if (n == null || n === "") return fallback;
  const cleaned = String(n).replace(/[^\d\-\.]/g, "");
  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** CSV parser (quotes + commas-in-quotes) */
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

function idxMap(headers: string[]) {
  const m = new Map<string, number>();
  headers.forEach((h, i) => m.set(h.toLowerCase(), i));
  return m;
}

function getCell(row: string[], map: Map<string, number>, ...keys: string[]) {
  for (const k of keys) {
    const idx = map.get(k.toLowerCase());
    if (idx == null) continue;
    const v = row[idx];
    if (v != null && String(v).trim() !== "") return String(v);
  }
  return "";
}

function asGuild(v: string): Guild | undefined {
  const s = stripQuotes(v).trim();
  if (!s) return undefined;
  const ok = [
    "Scouts",
    "Guardians",
    "Blades",
    "Shadows",
    "Scholars",
    "Diplomats",
  ];
  return ok.includes(s) ? (s as Guild) : undefined;
}

let cache: Student[] | null = null;

export async function loadStudents(): Promise<Student[]> {
  if (cache) return cache;

  const text = await fetch(SHEET_CSV_URL).then((r) => r.text());
  const { headers, rows } = parseCSV(text);
  const map = idxMap(headers);

  const students: Student[] = rows.map((r) => {
    const name = stripQuotes(
      getCell(r, map, "Name", "Student", "Student Name")
    ).trim();
    const homeroom = stripQuotes(
      getCell(r, map, "Homeroom", "HR", "Class")
    ).trim();
    const id = stripQuotes(
      getCell(r, map, "StudentID", "Student Id", "ID", "Id")
    ).trim();

    const guild = asGuild(getCell(r, map, "Guild", "House"));
    const portraitUrl = stripQuotes(
      getCell(r, map, "PortraitURL", "Portrait Url", "Photo", "Image")
    ).trim();
    const skills = stripQuotes(
      getCell(r, map, "Skills", "Skill", "Abilities")
    ).trim();

    // "Last, First" or "First Last"
    let first = "";
    let last = "";
    if (name.includes(",")) {
      const [l, f] = name.split(",").map((x) => x.trim());
      last = l || "";
      first = f || "";
    } else {
      const parts = name.split(/\s+/).filter(Boolean);
      first = parts[0] || "";
      last = parts.slice(1).join(" ") || "";
    }

    return {
      id,
      first,
      last,
      homeroom,
      guild,
      str: toNumber(getCell(r, map, "Strength", "STR"), 0),
      dex: toNumber(getCell(r, map, "Dexterity", "DEX"), 0),
      con: toNumber(getCell(r, map, "Constitution", "CON"), 0),
      int: toNumber(getCell(r, map, "Intelligence", "INT"), 0),
      wis: toNumber(getCell(r, map, "Wisdom", "WIS"), 0),
      cha: toNumber(getCell(r, map, "Charisma", "CHA"), 0),
      skills,
      portraitUrl: portraitUrl || undefined,
    };
  });

  cache = students;
  return students;
}
