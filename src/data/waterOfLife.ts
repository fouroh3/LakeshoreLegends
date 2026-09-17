// Water of Life card definition
import type { InventoryCard } from "../types/inventory";

export const waterOfLife: InventoryCard = {
  id: "water_of_life",
  name: "Water of Life",
  type: "potion",
  effect: "When a Hero reaches 0 Health, another Hero may use the Water of Life to revive them with half of their total Health.",
  useText: "One-time use",
  isConsumed: true,
  rarity: "rare",
  lore: "Drawn from the Well of Waters, this potion holds the power to call a fallen Hero back.",
  whisper: "Heroes help Heroes.",
  source: "The Well of Waters",
};
