import type { AttrKey } from "../xpApi";
import type { AttributeValues } from "../types";
import { normalizeSkillName } from "./skillLibrary";

export type GuildBenefit = {
  attribute: AttrKey;
  amount: number;
  skill: string;
};

export const GUILD_BENEFITS: Record<string, GuildBenefit> = {
  blades: { attribute: "STR", amount: 2, skill: "Spontaneous" },
  shadows: { attribute: "DEX", amount: 2, skill: "Stealthy" },
  guardians: { attribute: "CON", amount: 2, skill: "Endurance" },
  scholars: { attribute: "INT", amount: 2, skill: "History" },
  scouts: { attribute: "WIS", amount: 2, skill: "Perception" },
  diplomats: { attribute: "CHA", amount: 2, skill: "Team Player" },
};

export function getGuildBenefit(guild: unknown): GuildBenefit | null {
  const key = String(guild ?? "").trim().toLowerCase();
  return GUILD_BENEFITS[key] ?? null;
}

export function getGuildAttributeValues(guild: unknown): AttributeValues {
  const benefit = getGuildBenefit(guild);
  return {
    str: benefit?.attribute === "STR" ? benefit.amount : 0,
    dex: benefit?.attribute === "DEX" ? benefit.amount : 0,
    con: benefit?.attribute === "CON" ? benefit.amount : 0,
    int: benefit?.attribute === "INT" ? benefit.amount : 0,
    wis: benefit?.attribute === "WIS" ? benefit.amount : 0,
    cha: benefit?.attribute === "CHA" ? benefit.amount : 0,
  };
}

export function addGuildSkill(skills: string[], guild: unknown): string[] {
  const benefit = getGuildBenefit(guild);
  if (!benefit?.skill) return skills;
  const wanted = normalizeSkillName(benefit.skill);
  return skills.some((skill) => normalizeSkillName(skill) === wanted)
    ? skills
    : [...skills, benefit.skill];
}
