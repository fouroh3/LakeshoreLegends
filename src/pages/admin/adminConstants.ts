// src/pages/admin/adminConstants.ts

export const ADMIN_GUILDS = [
  "Scouts",
  "Guardians",
  "Blades",
  "Shadows",
  "Scholars",
  "Diplomats",
] as const;

export const ADMIN_HOMEROOMS = [
  "8-1",
  "8-2",
  "8-3",
  "8-4",
  "8-5",
  "8-6",
  "8-7",
  "8-8",
  "8-9",
  "8-10",
] as const;

// These match the ranges currently rolled into Master!A2.
export const ADMIN_CLASS_MAX_ROW: Record<string, number> = {
  "8-1": 49,
  "8-2": 50,
  "8-3": 51,
  "8-4": 50,
  "8-5": 50,
  "8-6": 50,
  "8-7": 50,
  "8-8": 50,
  "8-9": 50,
  "8-10": 50,
};

export type AdminSection = "students" | "guilds";

export type PasteFormat =
  | "last-first"
  | "first-last"
  | "full-name";
