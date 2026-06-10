// src/pages/battle/battleBossMeta.ts

import lakeOfShadowsLogo from "../../assets/quests/Quest Logo - Lake of Shadows.png";
import alchemistsLairLogo from "../../assets/quests/Quest Logo - Alchemists Lair.png";
import ensnaringCryptLogo from "../../assets/quests/Quest Logo - Ensnaring Crypt.png";
import finalExaminerLogo from "../../assets/quests/Quest Logo - Final Examiner.png";
import plaguebornWoodsLogo from "../../assets/quests/Quest Logo - Plagueborn Woods.png";
import prismTowerLogo from "../../assets/quests/Quest Logo - The Prism Tower.png";
import hotelOfDespairLogo from "../../assets/quests/Quest Logo - Hotel of Despair.png";
import websOfChanceLogo from "../../assets/quests/Quest Logo - Webs of Chance.png";

export type BossMeta = {
  bossKey: string;
  questName: string;
  bossName: string;
  logo: string;
};

const BOSS_META: BossMeta[] = [
  {
    bossKey: "KEEPER_SHADOWS",
    questName: "The Lake of Shadows",
    bossName: "The Keeper of Shadows",
    logo: lakeOfShadowsLogo,
  },
  {
    bossKey: "THE_ALCHEMIST",
    questName: "The Alchemists Lair",
    bossName: "The Alchemist",
    logo: alchemistsLairLogo,
  },
  {
    bossKey: "CRYPT_WARDEN",
    questName: "The Ensnaring Crypt",
    bossName: "The Crypt Warden",
    logo: ensnaringCryptLogo,
  },
  {
    bossKey: "FINAL_EXAMINER",
    questName: "The Final Examiner",
    bossName: "The Final Examiner",
    logo: finalExaminerLogo,
  },
  {
    bossKey: "PLAGUEBEARER",
    questName: "The Plagueborn Woods",
    bossName: "The Plaguebearer",
    logo: plaguebornWoodsLogo,
  },
  {
    bossKey: "PRISM_SENTINEL",
    questName: "The Prism Tower",
    bossName: "The Prism Sentinel",
    logo: prismTowerLogo,
  },
  {
    bossKey: "HOTEL_OF_DESPAIR",
    questName: "Hotel of Despair",
    bossName: "The Ghostly Bellhop",
    logo: hotelOfDespairLogo,
  },
  {
    bossKey: "WEBS_OF_CHANCE",
    questName: "Webs of Chance",
    bossName: "The Riddle Weaver",
    logo: websOfChanceLogo,
  },
];

function norm(s: string) {
  return String(s || "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function getBossMeta(value: string): BossMeta | null {
  const target = norm(value);
  if (!target) return null;

  return (
    BOSS_META.find((m) => norm(m.bossName) === target) ??
    BOSS_META.find((m) => norm(m.questName) === target) ??
    BOSS_META.find((m) => norm(m.bossKey) === target) ??
    BOSS_META.find((m) => target.includes(norm(m.bossName))) ??
    BOSS_META.find((m) => norm(m.bossName).includes(target)) ??
    BOSS_META.find((m) => target.includes(norm(m.questName))) ??
    BOSS_META.find((m) => norm(m.questName).includes(target)) ??
    BOSS_META.find((m) => target.includes(norm(m.bossKey))) ??
    BOSS_META.find((m) => norm(m.bossKey).includes(target)) ??
    null
  );
}