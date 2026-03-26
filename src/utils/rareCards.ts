import type { InventoryCard } from "../data/itemLibrary";

const RARE_CARD_NAMES = new Set([
  "phoenix feather",
  "echoing horn",
  "stamina helm",
  "alchemist's brew",
  "giant's brew",
  "shadow veil",
  "cloak of resilience",
  "pendant of luck",
  "crystal orb",
  "brawler's gauntlets",
  "glimmering amulet",
  "mystic compass",
]);

function normalizeName(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function isRareCard(card: Partial<InventoryCard> | null | undefined) {
  if (!card) return false;
  return RARE_CARD_NAMES.has(normalizeName(card.name));
}

export function rareCardBadgeClass() {
  return "border-red-400/30 bg-red-500/12 text-red-200 shadow-[0_0_18px_rgba(239,68,68,0.16)]";
}

export function rareCardGlowClass() {
  return "shadow-[0_0_0_1px_rgba(239,68,68,0.14),0_14px_34px_rgba(239,68,68,0.18)]";
}