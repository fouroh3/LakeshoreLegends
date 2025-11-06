export type Student = {
  id: string;
  first: string;
  last: string;
  homeroom: string; // "8-3"
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
  skills: string[] | string;
  portraitUrl?: string; // optional, from sheet
};
