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

  // core stats
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;

  // gameplay data
  skills: string[] | string;
  inventory?: string[];

// optional visuals / metadata
portraitUrl?: string;
companionUrl?: string;
companionStatus?: "Active" | "Fallen" | string;
guild?: Guild;

  // HP (from Apps Script)
  baseHP?: number;
  currentHP?: number;
};