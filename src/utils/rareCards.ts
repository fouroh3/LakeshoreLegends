import type { InventoryCard } from "../types/inventory";

const VISUAL_RARE_CARD_IDS = new Set([
  "brawlers_gauntlets",
  "cloak_of_resilience",
  "crystal_orb",
  "glimmering_amulet",
  "mystic_compass",
  "pendant_of_luck",
  "stamina_helm",
  "alchemists_brew",
  "giants_brew",
  "shadow_veil",
  "echoing_horn",
  "phoenix_feather",
]);

export function isRareCard(card?: Pick<InventoryCard, "id"> | null): boolean {
  if (!card?.id) return false;
  return VISUAL_RARE_CARD_IDS.has(String(card.id).trim().toLowerCase());
}

export function rareCardBadgeClass() {
  return "border-red-400/30 bg-red-500/10 text-red-100";
}

export function rareCardGlowClass() {
  return "shadow-[0_0_24px_rgba(239,68,68,0.16)]";
}