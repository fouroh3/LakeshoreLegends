// src/data/fateCardLibrary.ts

import type { InventoryCard } from "../types/inventory";

const fate_blistering_infection =
  "/assets/cards/fate_blistering_infection.png";

const fate_healing_rejection =
  "/assets/cards/fate_healing_rejection.png";

const fate_leeching_curse =
  "/assets/cards/fate_leeching_curse.png";

const fate_mind_fog =
  "/assets/cards/fate_mind_fog.png";

const fate_plague_echo =
  "/assets/cards/fate_plague_echo.png";

const fate_withering_grip =
  "/assets/cards/fate_withering_grip.png";


export const fateCardLibrary: InventoryCard[] = [
  {
    id: "fate_blistering_infection",
    name: "Blistering Infection",
    type: "fate",
    quest: "Plagueborn Woods",
    flavorText: "Boils fester on your skin, pulsing with plague.",
    effect: "You start the next battle at -2 HP per group member.",
    imageUrl: fate_blistering_infection,
    rarity: "rare",
  },
  {
    id: "fate_healing_rejection",
    name: "Healing Rejection",
    type: "fate",
    quest: "Plagueborn Woods",
    flavorText: "The infection twists every attempt to make you whole.",
    effect: "You are unable to heal during the first 2 rounds of the next battle.",
    imageUrl: fate_healing_rejection,
    rarity: "rare",
  },
  {
    id: "fate_leeching_curse",
    name: "Leeching Curse",
    type: "fate",
    quest: "Plagueborn Woods",
    flavorText: "The woods take more than blood. They take what made you you.",
    effect: "You lose 1 skill permanently.",
    imageUrl: fate_leeching_curse,
    rarity: "epic",
  },
  {
    id: "fate_mind_fog",
    name: "Mind Fog",
    type: "fate",
    quest: "Plagueborn Woods",
    flavorText: "A thick mental haze clouds your thoughts.",
    effect: "Your Intelligence category is reduced by 1.",
    imageUrl: fate_mind_fog,
    rarity: "rare",
  },
  {
    id: "fate_plague_echo",
    name: "Plague Echo",
    type: "fate",
    quest: "Plagueborn Woods",
    flavorText: "You hear whispers that aren’t there...and maybe never were.",
    effect: "You’re disoriented and miss your first turn in the next battle.",
    imageUrl: fate_plague_echo,
    rarity: "epic",
  },
  {
    id: "fate_withering_grip",
    name: "Withering Grip",
    type: "fate",
    quest: "Plagueborn Woods",
    flavorText: "Your limbs are stiff and brittle from the infection.",
    effect: "Your Strength category is reduced by 1.",
    imageUrl: fate_withering_grip,
    rarity: "rare",
  },
];

export const plaguebornWoodsFateCards = fateCardLibrary.filter(
  (card) => card.quest === "Plagueborn Woods"
);