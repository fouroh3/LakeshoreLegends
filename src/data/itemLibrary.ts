// src/data/itemLibrary.ts
import type { InventoryCard } from "../types/inventory";

export const itemLibrary: InventoryCard[] = [
  {
    id: "defenders_shield",
    name: "Defender's Shield",
    type: "item",
    effect: "Reduces incoming damage by 1.",
    rarity: "common",
    lore: "Worn smooth from use, this shield has turned aside more blows than its bearer can remember.",
    whisper: "It prefers to be between you and something dangerous.",
  },

  {
    id: "fortune_token",
    name: "Fortune Token",
    type: "item",
    effect: "Allows the group to take an extra action.",
    rarity: "rare",
    lore: "These tokens appear when paths begin to split. Some say they do not grant luck—only reveal it.",
    whisper: "Spend it. Or regret not knowing what would have happened.",
    loreChain: "prism",
  },

  {
    id: "focus_brew",
    name: "Focus Brew",
    type: "potion",
    effect: "Restores clarity and minor HP.",
    rarity: "common",
    lore: "A simple mixture of herbs and heat, often brewed before moments that matter.",
    whisper: "Steady hands. Quiet mind.",
  },

  {
    id: "healing_elixir",
    name: "Healing Elixir",
    type: "potion",
    effect: "Restores HP.",
    rarity: "uncommon",
    lore: "The liquid glows faintly in darkness, as if remembering warmth.",
    whisper: "Not all wounds stay closed.",
  },

  {
    id: "belt_of_strength",
    name: "Belt of Strength",
    type: "relic",
    effect: "Temporarily increases strength.",
    rarity: "rare",
    lore: "Forged for someone larger than you. It tightens when needed.",
    whisper: "Lift it. Prove it.",
  },

  {
    id: "bracelet_of_agility",
    name: "Bracelet of Agility",
    type: "relic",
    effect: "Increases speed and evasion.",
    rarity: "uncommon",
    lore: "It shifts slightly on its own, as if anticipating movement.",
    whisper: "Too slow.",
  },

  {
    id: "glimmering_amulet",
    name: "Glimmering Amulet",
    type: "relic",
    effect: "Improves awareness and perception.",
    rarity: "rare",
    lore: "Light bends differently around this amulet. Some reflections linger too long.",
    whisper: "Look again.",
    loreChain: "prism",
  },

  {
    id: "cloak_of_resilience",
    name: "Cloak of Resilience",
    type: "relic",
    effect: "Reduces incoming damage.",
    rarity: "rare",
    lore: "Recovered near the Lake of Shadows, it carries the memory of blows long past.",
    whisper: "It has endured worse.",
    loreChain: "lake",
  },

  {
    id: "shadow_veil",
    name: "Shadow Veil",
    type: "potion",
    effect: "Grants invisibility for one turn.",
    rarity: "rare",
    lore: "Woven where the shoreline fades into nothing. Those beneath it are not always seen again.",
    whisper: "Step out of the world.",
    loreChain: "lake",
  },

  {
    id: "stamina_helm",
    name: "Stamina Helm",
    type: "relic",
    effect: "Improves endurance.",
    rarity: "rare",
    lore: "Its interior is warmer than it should be, as if it remembers its last wearer.",
    whisper: "Do not stop.",
    loreChain: "alchemist",
  },

  {
    id: "alchemists_brew",
    name: "Alchemist's Brew",
    type: "potion",
    effect: "Unpredictable effect.",
    rarity: "epic",
    lore: "Every batch differs. The formula was never written down—only remembered incorrectly.",
    whisper: "Try it.",
    loreChain: "alchemist",
  },

  {
    id: "giants_brew",
    name: "Giant's Brew",
    type: "potion",
    effect: "Massive strength boost for one turn.",
    rarity: "epic",
    lore: "Too strong for most. The bottle is always slightly too heavy.",
    whisper: "More.",
    loreChain: "alchemist",
  },

  {
    id: "pendant_of_luck",
    name: "Pendant of Luck",
    type: "relic",
    effect: "Increases chance-based outcomes.",
    rarity: "rare",
    lore: "It hums faintly when choices matter.",
    whisper: "Pick one.",
    loreChain: "prism",
  },

  {
    id: "crystal_orb",
    name: "Crystal Orb",
    type: "relic",
    effect: "Reveals hidden information.",
    rarity: "rare",
    lore: "It never shows the same thing twice.",
    whisper: "You’re not supposed to see that.",
    loreChain: "prism",
  },

  {
    id: "mystic_compass",
    name: "Mystic Compass",
    type: "relic",
    effect: "Guides toward objectives.",
    rarity: "uncommon",
    lore: "The needle does not point north.",
    whisper: "Not that way.",
  },

  {
    id: "brawlers_gauntlets",
    name: "Brawler's Gauntlets",
    type: "relic",
    effect: "Enhances melee attacks.",
    rarity: "uncommon",
    lore: "They tighten slightly before impact.",
    whisper: "Again.",
  },
];

// lookup maps (important — do NOT remove)
export const itemLibraryById: Record<string, InventoryCard> =
  Object.fromEntries(itemLibrary.map((c) => [c.id, c]));

export const itemLibraryByName: Record<string, InventoryCard> =
  Object.fromEntries(itemLibrary.map((c) => [c.name.toLowerCase(), c]));
