// src/pages/admin/adminRosterUtils.ts

import type { Student } from "../../types";
import {
  ADMIN_CLASS_MAX_ROW,
  ADMIN_HOMEROOMS,
  type PasteFormat,
} from "./adminConstants";

export type ParsedStudent = {
  rowNumber: number;
  raw: string;
  first: string;
  last: string;
  homeroom: string;
  guild: string;
  previewId: string;
  error?: string;
};

export function normId(value: unknown) {
  return String(value ?? "")
    .replace(/\u00A0/g, " ")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, "")
    .trim()
    .toUpperCase();
}

export function clean(value: unknown) {
  return String(value ?? "")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function fullName(student: Student) {
  return [student.first, student.last]
    .map(clean)
    .filter(Boolean)
    .join(" ");
}

function rosterName(first: string, last: string) {
  const f = clean(first);
  const l = clean(last);
  return l && f ? `${l}, ${f}` : l || f;
}

function splitPasteLine(line: string) {
  const raw = String(line ?? "").trim();

  if (!raw) return [];
  if (raw.includes("\t")) return raw.split("\t").map(clean);
  if (raw.includes(",")) return raw.split(",").map(clean);

  return raw.split(/\s{2,}/g).map(clean);
}

function looksLikeHeader(line: string) {
  const s = line.toLowerCase();
  return (
    s.includes("first") ||
    s.includes("last") ||
    s.includes("homeroom") ||
    s.includes("class") ||
    s.includes("student name")
  );
}

function usedSuffixesByHomeroom(
  students: Student[],
  reservedStudentIds: string[]
) {
  const used = new Map<string, Set<number>>();

  const addId = (value: unknown) => {
    const studentId = normId(value);
    const match = studentId.match(/^(8-\d+)-(\d+)$/);

    if (!match) return;

    const homeroom = match[1];
    const suffix = Number(match[2]);

    if (!Number.isFinite(suffix) || suffix < 1) return;

    const set = used.get(homeroom) ?? new Set<number>();
    set.add(suffix);
    used.set(homeroom, set);
  };

  students.forEach((student) => addId(student.id));
  reservedStudentIds.forEach(addId);

  return used;
}

function nextAvailableSuffix(homeroom: string, used: Set<number>) {
  const maxRow = ADMIN_CLASS_MAX_ROW[homeroom];
  const maxSuffix = Math.max(0, (maxRow ?? 1) - 1);

  for (let suffix = 1; suffix <= maxSuffix; suffix++) {
    if (!used.has(suffix)) return suffix;
  }

  return 0;
}

function buildPreviewId(homeroom: string, suffix: number) {
  return `${homeroom}-${String(suffix).padStart(3, "0")}`;
}

function existingNameKeys(students: Student[]) {
  const keys = new Set<string>();

  for (const student of students) {
    const homeroom = clean(student.homeroom);
    const name = rosterName(student.first, student.last).toLowerCase();

    if (!homeroom || !name) continue;
    keys.add(`${homeroom}|${name}`);
  }

  return keys;
}

export function parseStudentPaste(args: {
  raw: string;
  format: PasteFormat;
  defaultHomeroom: string;
  students: Student[];
  reservedStudentIds?: string[];
}): ParsedStudent[] {
  const lines = String(args.raw ?? "")
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean);

  const usedByHr = usedSuffixesByHomeroom(
    args.students,
    Array.isArray(args.reservedStudentIds) ? args.reservedStudentIds : []
  );
  const existingKeys = existingNameKeys(args.students);
  const incomingKeys = new Set<string>();
  const parsed: ParsedStudent[] = [];

  lines.forEach((line, index) => {
    if (index === 0 && looksLikeHeader(line)) return;

    const parts = splitPasteLine(line);
    let first = "";
    let last = "";
    let homeroom = clean(args.defaultHomeroom);
    let error = "";

    if (args.format === "last-first") {
      last = clean(parts[0]);
      first = clean(parts[1]);
      if (!homeroom) homeroom = clean(parts[2]);
    }

    if (args.format === "first-last") {
      first = clean(parts[0]);
      last = clean(parts[1]);
      if (!homeroom) homeroom = clean(parts[2]);
    }

    if (args.format === "full-name") {
      const full = clean(parts[0]);
      if (!homeroom) homeroom = clean(parts[1]);

      const nameParts = full.split(" ").filter(Boolean);
      first = nameParts.slice(0, -1).join(" ");
      last = nameParts.slice(-1).join(" ");
    }

    if (!first || !last) {
      error = "Missing first or last name.";
    }

    if (!homeroom) {
      error = "Choose a homeroom or include one in the pasted rows.";
    } else if (!ADMIN_HOMEROOMS.includes(homeroom as (typeof ADMIN_HOMEROOMS)[number])) {
      error = "Homeroom should be 8-1 through 8-10.";
    }

    const nameKey = `${homeroom}|${rosterName(first, last).toLowerCase()}`;

    if (!error && existingKeys.has(nameKey)) {
      error = "Student already exists in this homeroom.";
    }

    if (!error && incomingKeys.has(nameKey)) {
      error = "Duplicate student in pasted rows.";
    }

    let previewId = "";

    if (!error) {
      const used = usedByHr.get(homeroom) ?? new Set<number>();
      const suffix = nextAvailableSuffix(homeroom, used);

      if (!suffix) {
        error = `${homeroom} has no unused roster slots left.`;
      } else {
        previewId = buildPreviewId(homeroom, suffix);
        used.add(suffix);
        usedByHr.set(homeroom, used);
        incomingKeys.add(nameKey);
      }
    }

    parsed.push({
      rowNumber: index + 1,
      raw: line,
      first,
      last,
      homeroom,
      guild: "",
      previewId,
      error: error || undefined,
    });
  });

  return parsed;
}

export function studentSort(a: Student, b: Student) {
  const hr = clean(a.homeroom).localeCompare(clean(b.homeroom), "en", {
    numeric: true,
  });

  if (hr !== 0) return hr;

  const guild = clean(a.guild).localeCompare(clean(b.guild), "en");
  if (guild !== 0) return guild;

  return `${a.last} ${a.first}`.localeCompare(`${b.last} ${b.first}`, "en");
}

export function countByGuild(students: Student[]) {
  const counts = new Map<string, number>();

  for (const student of students) {
    const guild = clean(student.guild) || "Unassigned";
    counts.set(guild, (counts.get(guild) ?? 0) + 1);
  }

  return counts;
}
