// src/data/itemLibrary.ts

import type { InventoryCard } from "../types/inventory";

const itemImages = import.meta.glob("../assets/cards/items/*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

const potionImages = import.meta.glob("../assets/cards/potions/*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

const relicImages = import.meta.glob("../assets/cards/relics/*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

function normalizeFileKey(value: string) {
  return value
    .toLowerCase()
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function buildImageLookup(modules: Record<string, string>) {
  const lookup: Record<string, string> = {};
  for (const [path, url] of Object.entries(modules)) {
    const fileName = path.split("/").pop() || "";
    lookup[normalizeFileKey(fileName)] = url;
  }
  return lookup;
}

const itemImageLookup = buildImageLookup(itemImages);
const potionImageLookup = buildImageLookup(potionImages);
const relicImageLookup = buildImageLookup(relicImages);

const getItemImage = (k: string) => itemImageLookup[normalizeFileKey(k)];
const getPotionImage = (k: string) => potionImageLookup[normalizeFileKey(k)];
const getRelicImage = (k: string) => relicImageLookup[normalizeFileKey(k)];

export const itemLibrary: InventoryCard[] = [
  // =========================
  // 🔥 RARE / LORE CARDS
  // =========================

  {
    id: "item_phoenix_feather",
    name: "Phoenix Feather",
    type: "item",
    rarity: "rare",
    loreChain: "prism",
    effect: "Revives any fallen player and gives them 5 HP.",
    useText: "One-time use",
    isConsumed: true,
    imageUrl: getItemImage("item_phoenix_feather"),
    lore: "A feather that burns without turning to ash. It remembers every life it has restored.",
    whisper: "Death is only a doorway.",
    source: "Recovered from the Ashen Trial",
  },

  {
    id: "item_echoing_horn",
    name: "Echoing Horn",
    type: "item",
    rarity: "rare",
    loreChain: "lake",
    effect:
      "Summon an additional ally during a strike move.",
    useText: "One-time use",
    isConsumed: true,
    imageUrl: getItemImage("item_echoing_horn"),
    lore: "Blown once, it calls not the living… but those who remember you.",
    whisper: "You are not alone.",
    source: "Found near the Lake of Shadows",
  },

  {
    id: "potion_shadow_veil",
    name: "Shadow Veil",
    type: "potion",
    rarity: "rare",
    loreChain: "lake",
    effect:
      "Grants invisibility and immunity for one turn.",
    useText: "One-time use",
    isConsumed: true,
    imageUrl: getPotionImage("potion_shadow_veil"),
    lore: "A liquid darkness that erases your place in the world.",
    whisper: "Step between moments.",
  },

  {
    id: "relic_cloak_of_resilience",
    name: "Cloak of Resilience",
    type: "relic",
    rarity: "rare",
    effect: "Reduces incoming damage by 1.",
    isEquipped: true,
    imageUrl: getRelicImage("relic_cloak_of_resilience"),
    lore: "Threads woven from battles survived.",
    whisper: "Endure.",
  },

  {
    id: "relic_stamina_helm",
    name: "Stamina Helm",
    type: "relic",
    rarity: "rare",
    effect: "Recover +1 HP on heals.",
    isEquipped: true,
    imageUrl: getRelicImage("relic_stamina_helm"),
    lore: "Forged for those who refuse to fall.",
    whisper: "Stand again.",
  },

  {
    id: "relic_glimmering_amulet",
    name: "Glimmering Amulet",
    type: "relic",
    rarity: "rare",
    effect: "Heals 2 HP after each quest.",
    isEquipped: true,
    imageUrl: getRelicImage("relic_glimmering_amulet"),
    lore: "Light that lingers even after hope fades.",
    whisper: "You are not finished.",
  },

  // =========================
  // 🧪 ALCHEMIST CHAIN
  // =========================

  {
    id: "potion_alchemists_brew",
    name: "Alchemist's Brew",
    type: "potion",
    rarity: "epic",
    loreChain: "alchemist",
    effect: "Doubles the effect of a card.",
    useText: "One-time use",
    isConsumed: true,
    imageUrl: getPotionImage("potion_alchemists_brew"),
    lore: "A formula never meant to be completed.",
    whisper: "Everything has a cost.",
  },

  {
    id: "potion_giants_brew",
    name: "Giant's Brew",
    type: "potion",
    rarity: "uncommon",
    effect: "+5 damage to one player.",
    useText: "One-time use",
    isConsumed: true,
    imageUrl: getPotionImage("potion_giants_brew"),
  },

  // =========================
  // ⚙️ STANDARD ITEMS
  // =========================

  {
    id: "item_fortune_token",
    name: "Fortune Token",
    type: "item",
    rarity: "common",
    effect: "Gain an extra action.",
    useText: "One-time use",
    isConsumed: true,
    imageUrl: getItemImage("item_fortune_token"),
  },

  {
    id: "item_defenders_shield",
    name: "Defender's Shield",
    type: "item",
    rarity: "common",
    effect: "Reduce incoming damage by 2.",
    useText: "One-time use",
    isConsumed: true,
    imageUrl: getItemImage("item_defenders_shield"),
  },

  // =========================
  // 🧿 RELICS (BASE SET)
  // =========================

  {
    id: "relic_crystal_orb",
    name: "Crystal Orb",
    type: "relic",
    rarity: "uncommon",
    effect: "Reveal boss move.",
    imageUrl: getRelicImage("relic_crystal_orb"),
  },

  {
    id: "relic_mystic_compass",
    name: "Mystic Compass",
    type: "relic",
    rarity: "uncommon",
    effect: "Re-roll once per quest.",
    imageUrl: getRelicImage("relic_mystic_compass"),
  },
];

export const itemLibraryById = Object.fromEntries(
  itemLibrary.map((c) => [c.id, c])
);

export const itemLibraryByName = Object.fromEntries(
  itemLibrary.map((c) => [c.name.toLowerCase(), c])
);
