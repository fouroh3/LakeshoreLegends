import type { Student } from "./types";

/** Published-to-web CSV */
export const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSsHQNK1vvVY-V6nI4kOEilMlAdcnPCdM50QC3-mO4OQsoBDN0l_ROeTUoob3OhJpKD7zIZPXP1VrJw/pub?gid=0&single=true&output=csv";

/* ---------- CSV utils ---------- */
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let i = 0,
    field = "",
    row: string[] = [],
    inQuotes = false;

  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    } else {
      if (c === '"') {
        inQuotes = true;
        i++;
        continue;
      }
      if (c === ",") {
        row.push(field);
        field = "";
        i++;
        continue;
      }
      if (c === "\r") {
        i++;
        continue;
      }
      if (c === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
        i++;
        continue;
      }
      field += c;
      i++;
    }
  }
  row.push(field);
  rows.push(row);
  return rows;
}

const toNumber = (n: any) => (Number.isFinite(Number(n)) ? Number(n) : 0);
const norm = (h: string) => h.toLowerCase().trim().replace(/\s+/g, "_");

function splitName(full: string): { last: string; first: string } {
  const raw = (full || "").trim();
  if (!raw) return { last: "", first: "" };
  // Expect "Last, First" but handle "First Last" fallback
  if (raw.includes(",")) {
    const [last, first] = raw.split(",").map((s) => s.trim());
    return { last: last || "", first: first || "" };
  }
  const parts = raw.split(" ").filter(Boolean);
  if (parts.length === 1) return { last: parts[0], first: "" };
  return { last: parts[0], first: parts.slice(1).join(" ") };
}

function rowsToStudents(rows: string[][]): Student[] {
  if (!rows.length) return [];
  const headers = rows[0].map(norm);
  const H = (k: string[]) =>
    k.map((x) => headers.indexOf(x)).find((i) => i >= 0) ?? -1;

  // Your sheet headers (per screenshot):
  // Name | Homeroom | Strength | Dexterity | Constitution | Intelligence | Wisdom | Charisma | PortraitURL | Skills
  const cName = H(["name"]);
  const cFirst = H(["first", "first_name", "given", "given_name"]);
  const cLast = H(["last", "last_name", "family", "family_name", "surname"]);
  const cRoom = H(["homeroom", "hr", "class", "classroom"]);
  const cSkills = H(["skills", "skill_list"]);
  const cPort = H(["portraiturl", "portrait_url", "avatar", "image"]);

  const cStr = H(["str", "strength"]);
  const cDex = H(["dex", "dexterity"]);
  const cCon = H(["con", "constitution"]);
  const cInt = H(["int", "intelligence"]);
  const cWis = H(["wis", "wisdom"]);
  const cCha = H(["cha", "charisma"]);

  const out: Student[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.every((x) => !String(x || "").trim())) continue;

    // Prefer explicit First/Last; else split Name
    let first = cFirst >= 0 ? row[cFirst] : "";
    let last = cLast >= 0 ? row[cLast] : "";
    if ((!first || !last) && cName >= 0) {
      const { first: f, last: l } = splitName(row[cName] || "");
      if (!first) first = f;
      if (!last) last = l;
    }

    const homeroom = cRoom >= 0 ? row[cRoom] : "";

    // Need at least a name to include
    if (!first && !last) continue;

    out.push({
      id: `r${r}`,
      first: (first || "").trim(),
      last: (last || "").trim(),
      homeroom: (homeroom || "").trim(),
      str: toNumber(cStr >= 0 ? row[cStr] : 0),
      dex: toNumber(cDex >= 0 ? row[cDex] : 0),
      con: toNumber(cCon >= 0 ? row[cCon] : 0),
      int: toNumber(cInt >= 0 ? row[cInt] : 0),
      wis: toNumber(cWis >= 0 ? row[cWis] : 0),
      cha: toNumber(cCha >= 0 ? row[cCha] : 0),
      skills: cSkills >= 0 ? row[cSkills] || "" : "",
      // PortraitURL is optional; your UI can use it later if desired
      // @ts-ignore - allowed extra prop ignored elsewhere
      portraitUrl: cPort >= 0 ? row[cPort] || "" : "",
    });
  }
  return out;
}

let cache: Student[] | null = null;

export async function loadStudents(): Promise<Student[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyWindow = window as any;
    if (anyWindow && Array.isArray(anyWindow.__SHEET_DATA__)) {
      return anyWindow.__SHEET_DATA__ as Student[];
    }

    if (cache) return cache;

    const res = await fetch(SHEET_CSV_URL);
    if (!res.ok) {
      console.error(
        "Sheet fetch failed:",
        res.status,
        res.statusText,
        SHEET_CSV_URL
      );
      return [];
    }
    const text = await res.text();
    if (!text || text.trim().length === 0) {
      console.warn(
        "CSV response empty. Check publish settings:",
        SHEET_CSV_URL
      );
      return [];
    }
    const rows = parseCSV(text);
    const students = rowsToStudents(rows);
    if (students.length === 0) {
      console.warn("Parsed 0 students. Headers seen:", rows[0]);
    }
    cache = students;
    return students;
  } catch (e) {
    console.error("loadStudents() error:", e);
    return [];
  }
}
