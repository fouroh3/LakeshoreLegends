// src/data/skillLibrary.ts

export type StoreSkill = {
  id: string;
  name: string;
};

export const skillLibrary: StoreSkill[] = [
  { id: "acrobatics", name: "Acrobatics" },
  { id: "animal-handling", name: "Animal Handling" },
  { id: "arcana", name: "Arcana" },
  { id: "athletic", name: "Athletic" },
  { id: "deception", name: "Deception" },
  { id: "defensive", name: "Defensive" },
  { id: "endurance", name: "Endurance" },
  { id: "history", name: "History" },
  { id: "insight", name: "Insight" },
  { id: "intimidation", name: "Intimidation" },
  { id: "investigation", name: "Investigation" },
  { id: "medicine", name: "Medicine" },
  { id: "nature", name: "Nature" },
  { id: "perception", name: "Perception" },
  { id: "persuasion", name: "Persuasion" },
  { id: "religious", name: "Religious" },
  { id: "sleight-of-hand", name: "Sleight of Hand" },
  { id: "spontaneous", name: "Spontaneous" },
  { id: "stealthy", name: "Stealthy" },
  { id: "survival", name: "Survival" },
  { id: "team-player", name: "Team Player" },
];

export function normalizeSkillName(value: string) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
