// src/pages/battle/battleBossMeta.ts

import lakeOfShadowsLogo from "../../assets/quests/Quest Logo - Lake of Shadows.png";
import alchemistsLairLogo from "../../assets/quests/Quest Logo - Alchemists Lair.png";
import ensnaringCryptLogo from "../../assets/quests/Quest Logo - Ensnaring Crypt.png";
import finalExaminerLogo from "../../assets/quests/Quest Logo - Final Examiner.png";
import plaguebornWoodsLogo from "../../assets/quests/Quest Logo - Plagueborn Woods.png";
import prismTowerLogo from "../../assets/quests/Quest Logo - The Prism Tower.png";

export type BossMeta = {
  questName: string;
  bossName: string;
  logo: string;
};

const BOSS_META: BossMeta[] = [
  {
    questName: "The Lake of Shadows",
    bossName: "The Keeper of Shadows",
    logo: lakeOfShadowsLogo,
  },
  {
    questName: "The Alchemists Lair",
    bossName: "The Alchemist",
    logo: alchemistsLairLogo,
  },
  {
    questName: "The Ensnaring Crypt",
    bossName: "The Crypt Warden",
    logo: ensnaringCryptLogo,
  },
  {
    questName: "The Final Examiner",
    bossName: "The Final Examiner",
    logo: finalExaminerLogo,
  },
  {
    questName: "The Plagueborn Woods",
    bossName: "The Plaguebearer",
    logo: plaguebornWoodsLogo,
  },
  {
    questName: "The Prism Tower",
    bossName: "The Prism Sentinel",
    logo: prismTowerLogo,
  },
];

function norm(s: string) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function getBossMeta(bossName: string): BossMeta | null {
  const target = norm(bossName);
  if (!target) return null;

  return (
    BOSS_META.find((m) => norm(m.bossName) === target) ??
    BOSS_META.find((m) => target.includes(norm(m.bossName))) ??
    null
  );
}
