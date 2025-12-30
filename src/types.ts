// src/types.ts
export type Guild =
  | "Scouts"
  | "Guardians"
  | "Blades"
  | "Shadows"
  | "Scholars"
  | "Diplomats"
  | string;

export type Student = {
  id: string;
  first: string;
  last: string;
  homeroom: string;

  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;

  skills: string[] | string;
  portraitUrl?: string;
  guild?: Guild;

  // ✅ NEW: HP (from Apps Script)
  baseHP?: number;
  currentHP?: number;
};
