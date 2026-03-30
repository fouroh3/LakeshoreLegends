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
  whisper?: string;
  lore?: string;
  source?: string;
  loreChain?: "lake" | "prism" | "alchemist";
};

export function groupInventory(cards: InventoryCard[]) {
  return {
    relic: cards.filter((c) => c.type === "relic"),
    potion: cards.filter((c) => c.type === "potion"),
    item: cards.filter((c) => c.type === "item"),
    other: cards.filter((c) => c.type === "other"),
  };
}

export function getItemRarityClasses(rarity?: InventoryCard["rarity"]) {
  switch (rarity) {
    case "legendary":
      return {
        badge: "border-amber-500/40 bg-amber-500/10 text-amber-200",
        glow: "shadow-[0_0_26px_rgba(245,158,11,0.14)]",
      };
    case "epic":
      return {
        badge: "border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-200",
        glow: "shadow-[0_0_26px_rgba(217,70,239,0.14)]",
      };
    case "rare":
      return {
        badge: "border-sky-500/40 bg-sky-500/10 text-sky-200",
        glow: "shadow-[0_0_26px_rgba(14,165,233,0.14)]",
      };
    case "uncommon":
      return {
        badge: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
        glow: "shadow-[0_0_26px_rgba(16,185,129,0.14)]",
      };
    default:
      return {
        badge: "border-zinc-700 bg-zinc-900 text-zinc-300",
        glow: "",
      };
  }
}
