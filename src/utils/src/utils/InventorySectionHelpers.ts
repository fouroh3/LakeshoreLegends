import {
  itemLibraryById,
  itemLibraryByName,
  type InventoryCard,
} from "../data/itemLibrary";

export type ResolvedInventoryCard = Omit<InventoryCard, "imageUrl"> & {
  imageUrl: string;
};

function resolveCardImage(id: string): string {
  return `/assets/cards/${id}.png`;
}

export function normalizeInventory(rawInventory: any): ResolvedInventoryCard[] {
  if (!rawInventory) return [];

  const rawItems = Array.isArray(rawInventory)
    ? rawInventory
    : String(rawInventory)
        .split(/[,;|]/g)
        .map((s) => s.trim())
        .filter(Boolean);

  const out: ResolvedInventoryCard[] = [];

  for (const entry of rawItems) {
    // STRING FORMAT (most common)
    if (typeof entry === "string") {
      const trimmed = entry.trim();

      const base =
        itemLibraryById[trimmed] ||
        itemLibraryByName[trimmed.toLowerCase()] ||
        null;

      if (!base) continue;

      out.push({
        ...base,
        imageUrl: resolveCardImage(base.id),
      });

      continue;
    }

    // OBJECT FORMAT (future-proof)
    if (entry && typeof entry === "object") {
      const rawId = String(entry.id ?? "").trim();
      const rawName = String(entry.name ?? "")
        .trim()
        .toLowerCase();

      const base =
        (rawId ? itemLibraryById[rawId] : null) ||
        (rawName ? itemLibraryByName[rawName] : null);

      if (!base) continue;

      out.push({
        ...base,
        quantity:
          entry.quantity != null ? Number(entry.quantity) : base.quantity,
        isConsumed:
          entry.isConsumed != null
            ? Boolean(entry.isConsumed)
            : base.isConsumed,
        isEquipped:
          entry.isEquipped != null
            ? Boolean(entry.isEquipped)
            : base.isEquipped,
        imageUrl: resolveCardImage(base.id),
      });
    }
  }

  return out;
}

export function groupInventory(cards: ResolvedInventoryCard[]) {
  return {
    relic: cards.filter((c) => c.type === "relic"),
    potion: cards.filter((c) => c.type === "potion"),
    item: cards.filter((c) => c.type === "item"),
    other: cards.filter((c) => c.type === "other"),
  };
}
