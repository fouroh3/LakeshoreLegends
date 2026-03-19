// src/data/itemLibrary.ts

export type InventoryCardType = "relic" | "potion" | "item" | "pet" | "other";

export type InventoryCard = {
  id: string;
  name: string;
  type: InventoryCardType;
  effect: string;
  useText?: string;
  quantity?: number;
  isConsumed?: boolean;
  isEquipped?: boolean;
  imageUrl?: string;
};

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
    const normalized = normalizeFileKey(fileName);
    lookup[normalized] = url;
  }

  return lookup;
}

const itemImageLookup = buildImageLookup(itemImages);
const potionImageLookup = buildImageLookup(potionImages);
const relicImageLookup = buildImageLookup(relicImages);

function getItemImage(fileKey: string) {
  return itemImageLookup[normalizeFileKey(fileKey)];
}

function getPotionImage(fileKey: string) {
  return potionImageLookup[normalizeFileKey(fileKey)];
}

function getRelicImage(fileKey: string) {
  return relicImageLookup[normalizeFileKey(fileKey)];
}

export const itemLibrary: InventoryCard[] = [
  // ITEMS
  {
    id: "item_tactical_map",
    name: "Tactical Map",
    type: "item",
    effect: "Provides +2 to damage rolls for one Quest for each group member.",
    useText: "Semi-Permanent (Use for one Quest only)",
    imageUrl: getItemImage("item_tactical_map"),
  },
  {
    id: "item_fortune_token",
    name: "Fortune Token",
    type: "item",
    effect:
      "Allows the group to take an extra action (heal, strike, or card activation).",
    useText: "One-time use",
    isConsumed: true,
    imageUrl: getItemImage("item_fortune_token"),
  },
  {
    id: "item_defenders_shield",
    name: "Defender's Shield",
    type: "item",
    effect: "Reduces incoming damage by 2 for all group members.",
    useText: "One-time use",
    isConsumed: true,
    imageUrl: getItemImage("item_defenders_shield"),
  },
  {
    id: "item_phoenix_feather",
    name: "Phoenix Feather",
    type: "item",
    effect: "Revives any fallen player and gives them 5 HP.",
    useText: "One-time use",
    isConsumed: true,
    imageUrl: getItemImage("item_phoenix_feather"),
  },
  {
    id: "item_echoing_horn",
    name: "Echoing Horn",
    type: "item",
    effect:
      "Enables the player to summon an additional ally during a strike move, allowing support from another group.",
    useText: "One-time use",
    isConsumed: true,
    imageUrl: getItemImage("item_echoing_horn"),
  },

  // POTIONS
  {
    id: "potion_healing_elixir",
    name: "Healing Elixir",
    type: "potion",
    effect: "Restores 3 HP for one player.",
    useText: "One-time use",
    isConsumed: true,
    imageUrl: getPotionImage("potion_healing_elixir"),
  },
  {
    id: "potion_vision_potion",
    name: "Vision Potion",
    type: "potion",
    effect:
      "Grants +2 to any single roll (heal or strike) for the next turn for all group members.",
    useText: "One-time use",
    isConsumed: true,
    imageUrl: getPotionImage("potion_vision_potion"),
  },
  {
    id: "potion_endurance_elixir",
    name: "Endurance Elixir",
    type: "potion",
    effect: "Reduces damage by 1 for the next attack for all group members.",
    useText: "One-time use",
    isConsumed: true,
    imageUrl: getPotionImage("potion_endurance_elixir"),
  },
  {
    id: "potion_strength_potion",
    name: "Strength Potion",
    type: "potion",
    effect:
      "Grants +3 damage to strikes for the next turn for each group member.",
    useText: "One-time use",
    isConsumed: true,
    imageUrl: getPotionImage("potion_strength_potion"),
  },
  {
    id: "potion_focus_brew",
    name: "Focus Brew",
    type: "potion",
    effect: "Allows 1 player to re-roll a dice roll once during the turn.",
    useText: "One-time use",
    isConsumed: true,
    imageUrl: getPotionImage("potion_focus_brew"),
  },
  {
    id: "potion_speed_serum",
    name: "Speed Serum",
    type: "potion",
    effect:
      "You may activate 3 cards the next time you choose 'Activate a Card'.",
    useText: "One-time use",
    isConsumed: true,
    imageUrl: getPotionImage("potion_speed_serum"),
  },
  {
    id: "potion_protection_potion",
    name: "Protection Potion",
    type: "potion",
    effect: "Grants immunity to one attack (damage is nullified) for 1 player.",
    useText: "One-time use",
    isConsumed: true,
    imageUrl: getPotionImage("potion_protection_potion"),
  },
  {
    id: "potion_alchemists_brew",
    name: "Alchemist's Brew",
    type: "potion",
    effect: "Doubles the effect of any one card played during the battle.",
    useText: "One-time use",
    isConsumed: true,
    imageUrl: getPotionImage("potion_alchemists_brew"),
  },
  {
    id: "potion_giants_brew",
    name: "Giant's Brew",
    type: "potion",
    effect: "Grants +5 damage to strike for the next turn for 1 player.",
    useText: "One-time use",
    isConsumed: true,
    imageUrl: getPotionImage("potion_giants_brew"),
  },
  {
    id: "potion_shadow_veil",
    name: "Shadow Veil",
    type: "potion",
    effect:
      "Provides invisibility for one turn for all group members and immunity from attack in that turn.",
    useText: "One-time use",
    isConsumed: true,
    imageUrl: getPotionImage("potion_shadow_veil"),
  },

  // RELICS
  {
    id: "relic_amulet_of_insight",
    name: "Amulet of Insight",
    type: "relic",
    effect: "Grants +2 to Wisdom rolls.",
    useText: "Permanent - Active",
    isEquipped: true,
    imageUrl: getRelicImage("relic_amulet_of_insight"),
  },
  {
    id: "relic_ring_of_resilience",
    name: "Ring of Resilience",
    type: "relic",
    effect: "Provides +2 to all Constitution rolls.",
    useText: "Permanent - Active",
    isEquipped: true,
    imageUrl: getRelicImage("relic_ring_of_resilience"),
  },
  {
    id: "relic_bracelet_of_agility",
    name: "Bracelet of Agility",
    type: "relic",
    effect: "Provides +2 to Dexterity rolls.",
    useText: "Permanent - Active",
    isEquipped: true,
    imageUrl: getRelicImage("relic_bracelet_of_agility"),
  },
  {
    id: "relic_pendant_of_knowledge",
    name: "Pendant of Knowledge",
    type: "relic",
    effect: "Grants +2 to Intelligence rolls.",
    useText: "Permanent - Active",
    isEquipped: true,
    imageUrl: getRelicImage("relic_pendant_of_knowledge"),
  },
  {
    id: "relic_belt_of_strength",
    name: "Belt of Strength",
    type: "relic",
    effect: "Provides +2 to Strength rolls.",
    useText: "Permanent - Active",
    isEquipped: true,
    imageUrl: getRelicImage("relic_belt_of_strength"),
  },
  {
    id: "relic_talisman_of_courage",
    name: "Talisman of Courage",
    type: "relic",
    effect: "Reduces fear effects and grants +2 to all Charisma rolls.",
    useText: "Permanent - Active",
    isEquipped: true,
    imageUrl: getRelicImage("relic_talisman_of_courage"),
  },
  {
    id: "relic_cloak_of_resilience",
    name: "Cloak of Resilience",
    type: "relic",
    effect: "Provides a buffer to HP damage (reduces incoming damage by 1).",
    useText: "Permanent - Active",
    isEquipped: true,
    imageUrl: getRelicImage("relic_cloak_of_resilience"),
  },
  {
    id: "relic_pendant_of_luck",
    name: "Pendant of Luck",
    type: "relic",
    effect: "Grants a +5 bonus to any single dice roll once per quest.",
    useText: "Semi-Permanent",
    imageUrl: getRelicImage("relic_pendant_of_luck"),
  },
  {
    id: "relic_crystal_orb",
    name: "Crystal Orb",
    type: "relic",
    effect: "Reveals the boss’s next move or attack in advance for all groups.",
    useText: "Semi-Permanent",
    imageUrl: getRelicImage("relic_crystal_orb"),
  },
  {
    id: "relic_brawlers_gauntlets",
    name: "Brawler's Gauntlets",
    type: "relic",
    effect: "Adds +2 damage to all strikes made by the player.",
    useText: "Permanent - Active",
    isEquipped: true,
    imageUrl: getRelicImage("relic_brawlers_gauntlets"),
  },
  {
    id: "relic_glimmering_amulet",
    name: "Glimmering Amulet",
    type: "relic",
    effect: "Automatically heals 2 HP at the end of each quest.",
    useText: "Permanent - Active",
    isEquipped: true,
    imageUrl: getRelicImage("relic_glimmering_amulet"),
  },
  {
    id: "relic_mystic_compass",
    name: "Mystic Compass",
    type: "relic",
    effect: "Allows player to re-roll a dice once per quest.",
    useText: "Semi-Permanent",
    imageUrl: getRelicImage("relic_mystic_compass"),
  },
  {
    id: "relic_stamina_helm",
    name: "Stamina Helm",
    type: "relic",
    effect: "Allows the player to recover an additional 1 HP on a heal roll.",
    useText: "Permanent - Active",
    isEquipped: true,
    imageUrl: getRelicImage("relic_stamina_helm"),
  },
];

export const itemLibraryById = Object.fromEntries(
  itemLibrary.map((card) => [card.id, card])
) as Record<string, InventoryCard>;

export const itemLibraryByName = Object.fromEntries(
  itemLibrary.map((card) => [card.name.trim().toLowerCase(), card])
) as Record<string, InventoryCard>;
