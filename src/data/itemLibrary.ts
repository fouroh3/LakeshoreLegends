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

  // NEW
  whisper?: string;
  lore?: string;
  source?: string;
};

// ===== IMAGE LOADERS =====

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

const getItemImage = (key: string) => itemImageLookup[normalizeFileKey(key)];
const getPotionImage = (key: string) => potionImageLookup[normalizeFileKey(key)];
const getRelicImage = (key: string) => relicImageLookup[normalizeFileKey(key)];


// ===== CARD LIBRARY =====

export const itemLibrary: InventoryCard[] = [

  // ===== ITEMS =====

  {
    id: "item_phoenix_feather",
    name: "Phoenix Feather",
    type: "item",
    effect: "Revives any fallen player and gives them 5 HP.",
    useText: "One-time use",
    isConsumed: true,
    imageUrl: getItemImage("item_phoenix_feather"),

    whisper: "Even ash remembers how to rise.",
    lore: "Found burning in the remains of the Plagueborne Woods after everything else had withered, this feather was the only sign something survived.",
    source: "The Plagueborne Woods",
  },

  {
    id: "item_echoing_horn",
    name: "Echoing Horn",
    type: "item",
    effect:
      "Enables the player to summon an additional ally during a strike move.",
    useText: "One-time use",
    isConsumed: true,
    imageUrl: getItemImage("item_echoing_horn"),

    whisper: "Some calls are still answered.",
    lore: "Discovered in the Ensnaring Crypt, this horn once summoned warriors to a battle that never truly ended.",
    source: "The Ensnaring Crypt",
  },


  // ===== POTIONS =====

  {
    id: "potion_alchemists_brew",
    name: "Alchemist's Brew",
    type: "potion",
    effect: "Doubles the effect of any one card played during battle.",
    useText: "One-time use",
    isConsumed: true,
    imageUrl: getPotionImage("potion_alchemists_brew"),

    whisper: "Power grows. So does risk.",
    lore: "Taken during a failed experiment in the Alchemist’s Lair, this unstable brew amplifies any power it touches.",
    source: "The Alchemist's Lair",
  },

  {
    id: "potion_giants_brew",
    name: "Giant's Brew",
    type: "potion",
    effect: "Grants +5 damage to the next strike for one player.",
    useText: "One-time use",
    isConsumed: true,
    imageUrl: getPotionImage("potion_giants_brew"),

    whisper: "For one strike, become unstoppable.",
    lore: "One of the Alchemist’s closest successes, this brew channels immense strength into a single devastating blow.",
    source: "The Alchemist's Lair",
  },

  {
    id: "potion_shadow_veil",
    name: "Shadow Veil",
    type: "potion",
    effect:
      "Provides invisibility and immunity for one turn for all group members.",
    useText: "One-time use",
    isConsumed: true,
    imageUrl: getPotionImage("potion_shadow_veil"),

    whisper: "Not all shadows belong to you.",
    lore: "Woven from the darkness of the Lake of Shadows, this veil was found where the shoreline simply ends—and where others vanished.",
    source: "The Lake of Shadows",
  },


  // ===== RELICS =====

  {
    id: "relic_amulet_of_insight",
    name: "Amulet of Insight",
    type: "relic",
    effect: "Grants +2 to Wisdom rolls.",
    useText: "Permanent - Active",
    isEquipped: true,
    imageUrl: getRelicImage("relic_amulet_of_insight"),

    whisper: "Some truths refuse to stay hidden.",
    lore: "Recovered from the highest chamber of the Prism Tower, this amulet sharpens judgment in critical moments.",
    source: "The Prism Tower",
  },

  {
    id: "relic_cloak_of_resilience",
    name: "Cloak of Resilience",
    type: "relic",
    effect: "Reduces incoming damage by 1.",
    useText: "Permanent - Active",
    isEquipped: true,
    imageUrl: getRelicImage("relic_cloak_of_resilience"),

    whisper: "It remembers every blow.",
    lore: "Discovered among the remains at the Lake of Shadows, this cloak softens every strike as if it has endured far worse.",
    source: "The Lake of Shadows",
  },

  {
    id: "relic_pendant_of_luck",
    name: "Pendant of Luck",
    type: "relic",
    effect: "Grants +5 to one roll per quest.",
    useText: "Semi-Permanent",
    imageUrl: getRelicImage("relic_pendant_of_luck"),

    whisper: "Fate bends once. Choose well.",
    lore: "Found at the center of the Webs of Chance, this pendant grants one moment where probability shifts in your favor.",
    source: "Webs of Chance",
  },

  {
    id: "relic_crystal_orb",
    name: "Crystal Orb",
    type: "relic",
    effect: "Reveals the boss’s next move.",
    useText: "Semi-Permanent",
    imageUrl: getRelicImage("relic_crystal_orb"),

    whisper: "The next move is never secret.",
    lore: "Hidden within the Prism Tower, this orb reveals what comes next—not what might.",
    source: "The Prism Tower",
  },

  {
    id: "relic_brawlers_gauntlets",
    name: "Brawler's Gauntlets",
    type: "relic",
    effect: "Adds +2 damage to all strikes.",
    useText: "Permanent - Active",
    isEquipped: true,
    imageUrl: getRelicImage("relic_brawlers_gauntlets"),

    whisper: "Hit harder. Then harder still.",
    lore: "Unearthed beneath the Necropolis, these gauntlets amplify every strike with the force of past battles.",
    source: "The Necropolis of the Damned",
  },

  {
    id: "relic_glimmering_amulet",
    name: "Glimmering Amulet",
    type: "relic",
    effect: "Heals 2 HP at the end of each quest.",
    useText: "Permanent - Active",
    isEquipped: true,
    imageUrl: getRelicImage("relic_glimmering_amulet"),

    whisper: "Its light lingers after battle.",
    lore: "A rare stabilizing creation from the Alchemist’s Lair, it slowly restores strength over time.",
    source: "The Alchemist's Lair",
  },

  {
    id: "relic_mystic_compass",
    name: "Mystic Compass",
    type: "relic",
    effect: "Allows one re-roll per quest.",
    useText: "Semi-Permanent",
    imageUrl: getRelicImage("relic_mystic_compass"),

    whisper: "One wrong turn may be undone.",
    lore: "Created by the Prism Seers, this compass allows its bearer to correct a single misstep.",
    source: "The Prism Tower",
  },

  {
    id: "relic_stamina_helm",
    name: "Stamina Helm",
    type: "relic",
    effect: "Recover +1 extra HP on heal rolls.",
    useText: "Permanent - Active",
    isEquipped: true,
    imageUrl: getRelicImage("relic_stamina_helm"),

    whisper: "Endure when others would fall.",
    lore: "Recovered at the edge of the Lake of Shadows, this helm belonged to one who refused to collapse.",
    source: "The Lake of Shadows",
  },
];


// ===== LOOKUPS =====

export const itemLibraryById = Object.fromEntries(
  itemLibrary.map((card) => [card.id, card])
) as Record<string, InventoryCard>;

export const itemLibraryByName = Object.fromEntries(
  itemLibrary.map((card) => [card.name.trim().toLowerCase(), card])
) as Record<string, InventoryCard>;
