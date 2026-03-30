// src/data/itemLibrary.ts

export type InventoryCardType = "relic" | "potion" | "item" | "other";

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
  rarity?: "common" | "uncommon" | "rare" | "epic" | "legendary";

  // NEW
  whisper?: string;
  lore?: string;
  source?: string;
};

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
    rarity: "epic",

    whisper: "Even ash remembers how to rise.",
    lore: "Found burning in the remains of the Plagueborne Woods after everything else had withered, this feather was the
