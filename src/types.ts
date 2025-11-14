// src/types.ts

export type Guild =
  | "Scouts"
  | "Guardians"
  | "Blades"
  | "Shadows"
  | "Scholars"
  | "Diplomats";

export interface Student {
  id: string;
  first: string;
  last: string;
  homeroom: string;

  // NEW
  guild?: Guild;

  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;

  skills: string[] | string;
  portraitUrl?: string;
}
