// src/data.ts
import type { Student } from "./types";

// ✅ Your published-to-web CSV URL
export const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSsHQNK1vvVY-V6nI4kOEilMlAdcnPCdM50QC3-mO4OQsoBDN0l_ROeTUoob3OhJpKD7zIZPXP1VrJw/pub?gid=0&single=true&output=csv";

/** Simple CSV parser (handles quotes) */
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i],
      n = text[i + 1];
    if (inQuotes) {
      if (c === '"' && n === '"') {
        cur += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        cur += c;
      }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") {
        row.push(cur);
        cur = "";
      } else if (c === "\r" && n === "\n") {
        row.push(cur);
        rows.push(row);
        row = [];
        cur = "";
        i++;
      } else if (c === "\n" || c === "\r") {
        row.push(cur);
        rows.push(row);
        row = [];
        cur = "";
      } else {
        cur += c;
      }
    }
  }
  if (cur.length || row.length) {
    row.push(cur);
    rows.push(row);
  }
  return rows;
}

const nk = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, ""); // normalize key

function toNumber(v?: string): number | undefined {
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/** Convert Google Drive links to direct image links */
function normalizeDrive(url: string): string {
  if (!url) return url;
  try {
    const u = new URL(url);
    if (u.hostname.includes("drive.google.com")) {
      let id = u.searchParams.get("id") || "";
      if (!id) {
        const parts = u.pathname.split("/").filter(Boolean);
        const di = parts.indexOf("d");
        if (di !== -1 && parts[di + 1]) id = parts[di + 1];
      }
      if (id) return `https://drive.google.com/uc?export=view&id=${id}`;
    }
  } catch {}
  return url;
}

function splitName(full: string): { first: string; last: string } {
  const s = (full || "").trim();
  if (!s) return { first: "", last: "" };
  if (s.includes(",")) {
    const [last, first] = s.split(",").map((x) => x.trim());
    return { first: first || "", last: last || "" };
  }
  const parts = s.split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: "" };
  return {
    first: parts.slice(0, -1).join(" "),
    last: parts.slice(-1).join(" "),
  };
}

export async function loadStudents(): Promise<Student[]> {
  const res = await fetch(SHEET_CSV_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`CSV fetch failed: ${res.status}`);
  const text = await res.text();
  const rows = parseCSV(text);
  if (!rows.length) return [];

  const headers = rows[0].map((h) => (h || "").trim());
  const idx: Record<string, number> = {};
  headers.forEach((h, i) => (idx[nk(h)] = i));

  // 👀 Log what we see
  console.log("Parsed headers:", headers);

  // helpers
  const get = (r: string[], aliases: string[]) => {
    for (const a of aliases) {
      const j = idx[nk(a)];
      if (j != null && j < r.length) {
        const v = r[j]?.trim();
        if (v) return v;
      }
    }
    return undefined;
  };

  const out: Student[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.every((c) => !c || !c.trim())) continue;

    // ---- Names ----
    let first =
      get(r, [
        "First",
        "First Name",
        "Given",
        "GivenName",
        "FName",
        "FirstName",
      ]) || "";
    let last =
      get(r, [
        "Last",
        "Last Name",
        "Surname",
        "FamilyName",
        "LName",
        "LastName",
      ]) || "";

    if (!first && !last) {
      const fullName =
        get(r, [
          "Name",
          "Student Name",
          "Full Name",
          "Student",
          "StudentName",
        ]) || "";
      if (fullName) {
        const split = splitName(fullName);
        first = split.first;
        last = split.last;
      }
    }

    // ---- Homeroom ----
    const homeroom =
      get(r, [
        "Homeroom",
        "HR",
        "Home Room",
        "Class",
        "Room",
        "Homeroom #",
        "Homeroom Number",
        "HR#",
        "HR Number",
      ]) || "";

    // ---- Abilities ----
    const str = toNumber(get(r, ["STR", "Strength"]));
    const dex = toNumber(get(r, ["DEX", "Dexterity"]));
    const con = toNumber(get(r, ["CON", "Constitution"]));
    const int = toNumber(get(r, ["INT", "Intelligence"]));
    const wis = toNumber(get(r, ["WIS", "Wisdom"]));
    const cha = toNumber(get(r, ["CHA", "Charisma"]));

    // ---- Skills ----
    const skillsRaw =
      get(r, ["Skills", "Skill", "Tags", "Skill(s)"]) ||
      [get(r, ["Skill 1"]), get(r, ["Skill 2"]), get(r, ["Skill 3"])]
        .filter(Boolean)
        .join(", ");
    const skills = skillsRaw
      ? skillsRaw
          .split(/[;,]/)
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    // ---- Portrait ----
    const portraitRaw =
      get(r, [
        "PortraitURL",
        "Portrait Url",
        "Portrait",
        "ImageURL",
        "Image Url",
        "Image",
        "Photo",
        "Picture",
        "Avatar",
        "Headshot",
        "Portrait Link",
        "Photo URL",
        "Image Link",
      ]) || "";
    const portraitUrl = normalizeDrive(portraitRaw);

    // ---- ID ----
    const id =
      get(r, ["ID", "StudentID", "Student Id", "Key"]) ||
      `${first}_${last}_${homeroom}_${i}`;

    out.push({
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
      skills,
      portraitUrl: portraitUrl || undefined,
    });
  }

  console.log(`✅ Loaded ${out.length} students`, out[0]);
  return out;
}
