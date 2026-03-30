// src/components/ItemLibraryModal.tsx

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { InventoryCard, InventoryCardType } from "../types/inventory";
import { getItemRarityClasses } from "../types/inventory";

type Props = {
  open: boolean;
  onClose: () => void;
  cards: InventoryCard[];
  ownedIds?: string[];
  title?: string;
};

function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={[
        "relative overflow-hidden rounded-[28px] border border-zinc-800/90",
        "bg-[linear-gradient(180deg,rgba(39,39,42,0.72),rgba(9,9,11,0.9))]",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_20px_50px_rgba(0,0,0,0.35)]",
        className,
      ].join(" ")}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.04),transparent_38%)]" />
      <div className="relative">{children}</div>
    </div>
  );
}

function SectionHeading({
  icon,
  title,
  right,
}: {
  icon: string;
  title: string;
  right?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-zinc-500">
        <span className="text-[11px]">{icon}</span>
        <span>{title}</span>
      </div>
      {right ? <div className="text-[10px] text-zinc-500">{right}</div> : null}
    </div>
  );
}

function LibraryTile({
  card,
  selected,
  owned,
  onSelect,
}: {
  card: InventoryCard;
  selected?: boolean;
  owned?: boolean;
  onSelect?: (card: InventoryCard) => void;
}) {
  const rarity = getItemRarityClasses(card.rarity);

  return (
    <button
      type="button"
      onClick={() => onSelect?.(card)}
      className={[
        "group relative w-full overflow-hidden rounded-2xl border p-3 text-left transition duration-200",
        selected
          ? `border-cyan-500/50 bg-zinc-900 shadow-[0_0_0_1px_rgba(34,211,238,0.15),0_0_24px_rgba(34,211,238,0.10)] ${rarity.glow}`
          : "border-zinc-800/90 bg-zinc-950/70 hover:-translate-y-[2px] hover:border-cyan-700/40 hover:bg-zinc-900/90",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-zinc-100">
            {card.name}
          </div>
          {card.whisper ? (
            <div className="mt-1 truncate text-[11px] italic text-cyan-200/55">
              {card.whisper}
            </div>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-[9px] uppercase tracking-[0.18em] text-zinc-500">
              {card.type}
            </span>
            {card.rarity ? (
              <span
                className={`rounded-full border px-1.5 py-0.5 text-[8px] uppercase tracking-[0.16em] ${rarity.badge}`}
              >
                {card.rarity}
              </span>
            ) : null}
            {owned ? (
              <span className="rounded-full border border-emerald-800 bg-emerald-950/40 px-1.5 py-0.5 text-[8px] uppercase tracking-[0.16em] text-emerald-200">
                Owned
              </span>
            ) : (
              <span className="rounded-full border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 text-[8px] uppercase tracking-[0.16em] text-zinc-400">
                Unowned
              </span>
            )}
          </div>
        </div>

        {card.quantity && owned ? (
          <span className="rounded-full border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 text-[9px] text-zinc-300">
            x{card.quantity}
          </span>
        ) : null}
      </div>

      <div className="mt-2 line-clamp-2 text-[11px] text-zinc-400">
        {card.effect}
      </div>
    </button>
  );
}

function LibraryDetail({
  card,
  owned,
}: {
  card: InventoryCard | null;
  owned?: boolean;
}) {
  const rarity = getItemRarityClasses(card?.rarity);
  const showChainHook =
    card?.loreChain === "lake" ||
    card?.loreChain === "prism" ||
    card?.loreChain === "alchemist";

  return (
    <Panel className="h-full p-4">
      <SectionHeading icon="📚" title="Codex Entry" />

      {!card ? (
        <div className="flex h-full min-h-[260px] items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 p-6 text-center">
          <div>
            <div className="text-3xl opacity-40">📚</div>
            <div className="mt-3 text-sm font-medium text-zinc-300">
              Select an entry
            </div>
            <div className="mt-1 text-xs text-zinc-500">
              Inspect any discovered or catalogued item.
            </div>
          </div>
        </div>
      ) : (
        <div
          className={`rounded-[24px] border border-zinc-800 bg-[linear-gradient(180deg,rgba(39,39,42,0.95),rgba(9,9,11,0.95))] p-4 ${rarity.glow}`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">
                  {card.type}
                </span>

                {card.rarity ? (
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] ${rarity.badge}`}
                  >
                    {card.rarity}
                  </span>
                ) : null}

                {owned ? (
                  <span className="rounded-full border border-emerald-800 bg-emerald-950/40 px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] text-emerald-200">
                    Owned
                  </span>
                ) : null}
              </div>

              <div className="mt-1 text-xl font-semibold text-zinc-100">
                {card.name}
              </div>

              {card.whisper ? (
                <div className="mt-1 text-sm italic text-cyan-200/60">
                  {card.whisper}
                </div>
              ) : null}
            </div>

            {owned && card.quantity ? (
              <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-300">
                x{card.quantity}
              </span>
            ) : null}
          </div>

          <div className="mt-4 flex aspect-[4/5] items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950/70 text-5xl text-zinc-600">
            {card.imageUrl ? (
              <img
                src={card.imageUrl}
                alt={card.name}
                className="h-full w-full rounded-2xl object-cover"
              />
            ) : (
              <span>✦</span>
            )}
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                Effect
              </div>
              <div className="mt-1 text-sm leading-relaxed text-zinc-300">
                {card.effect}
              </div>
            </div>

            {card.lore ? (
              <div className="rounded-[18px] border border-zinc-800 bg-zinc-900/35 p-3.5">
                <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                  Lore
                </div>
                <div className="mt-1 text-sm leading-relaxed text-zinc-400">
                  {card.lore}
                </div>

                {showChainHook ? (
                  <div className="mt-3 border-t border-cyan-500/10 pt-2 text-[10px] uppercase tracking-[0.18em] text-cyan-200/35">
                    Part of something larger.
                  </div>
                ) : null}
              </div>
            ) : null}

            {card.useText ? (
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                  Usage
                </div>
                <div className="mt-1 text-sm text-zinc-300">
                  {card.useText}
                </div>
              </div>
            ) : null}

            {card.source ? (
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                  Source
                </div>
                <div className="mt-1 text-sm text-zinc-300">{card.source}</div>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              {card.isEquipped ? (
                <span className="rounded-full border border-emerald-800 bg-emerald-950/40 px-2 py-1 text-[10px] text-emerald-200">
                  Equipped
                </span>
              ) : null}
              {card.isConsumed ? (
                <span className="rounded-full border border-zinc-700 bg-zinc-800 px-2 py-1 text-[10px] text-zinc-300">
                  Consumable
                </span>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}

export default function ItemLibraryModal({
  open,
  onClose,
  cards,
  ownedIds = [],
  title = "Item Library",
}: Props) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<InventoryCardType | "all">(
    "all"
  );
  const [ownershipFilter, setOwnershipFilter] = useState<
    "all" | "owned" | "unowned"
  >("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const ownedSet = useMemo(() => new Set(ownedIds), [ownedIds]);

  const filteredCards = useMemo(() => {
    const q = query.trim().toLowerCase();

    return cards.filter((card) => {
      const matchesQuery =
        !q ||
        card.name.toLowerCase().includes(q) ||
        card.effect.toLowerCase().includes(q) ||
        String(card.useText || "")
          .toLowerCase()
          .includes(q) ||
        String(card.source || "")
          .toLowerCase()
          .includes(q) ||
        String(card.lore || "")
          .toLowerCase()
          .includes(q) ||
        String(card.whisper || "")
          .toLowerCase()
          .includes(q);

      const matchesType = typeFilter === "all" || card.type === typeFilter;

      const isOwned = ownedSet.has(card.id);
      const matchesOwnership =
        ownershipFilter === "all" ||
        (ownershipFilter === "owned" && isOwned) ||
        (ownershipFilter === "unowned" && !isOwned);

      return matchesQuery && matchesType && matchesOwnership;
    });
  }, [cards, ownedSet, ownershipFilter, query, typeFilter]);

  const selectedCard = useMemo(
    () =>
      filteredCards.find((card) => card.id === selectedId) ??
      filteredCards[0] ??
      null,
    [filteredCards, selectedId]
  );

  useEffect(() => {
    if (!open) return;

    if (!filteredCards.length) {
      setSelectedId(null);
      return;
    }

    setSelectedId((prev) =>
      prev && filteredCards.some((c) => c.id === prev)
        ? prev
        : filteredCards[0].id
    );
  }, [open, filteredCards]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110]">
      <button
        aria-label="Close library"
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      />

      <div className="absolute inset-0 flex items-center justify-center p-3 md:p-5">
        <div className="relative h-[94vh] w-full max-w-[1650px] overflow-hidden rounded-[32px] border border-zinc-800 bg-zinc-950 shadow-[0_30px_100px_rgba(0,0,0,0.7)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.04),transparent_30%)]" />
          <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] [background-size:24px_24px]" />

          <button
            onClick={onClose}
            className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900/90 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
            aria-label="Close"
            title="Close"
          >
            ✕
          </button>

          <div className="grid h-full w-full grid-cols-1 gap-4 p-4 xl:p-5 2xl:grid-cols-[minmax(0,1fr)_380px]">
            <main className="grid min-h-0 grid-cols-1 grid-rows-[auto_minmax(0,1fr)] gap-4">
              <Panel className="p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">
                      Codex
                    </div>
                    <div className="mt-1 text-2xl font-semibold text-zinc-100">
                      {title}
                    </div>
                    <div className="mt-1 text-sm text-zinc-400">
                      Browse discovered and undiscovered items across the world.
                    </div>
                  </div>

                  <div className="rounded-full border border-zinc-800 bg-zinc-950/80 px-3 py-1 text-xs text-zinc-300">
                    {filteredCards.length} shown / {cards.length} total
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_180px_180px]">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search name, effect, whisper, lore..."
                    className="h-11 rounded-2xl border border-zinc-800 bg-zinc-950/70 px-4 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-cyan-700/40"
                  />

                  <select
                    value={typeFilter}
                    onChange={(e) =>
                      setTypeFilter(e.target.value as InventoryCardType | "all")
                    }
                    className="h-11 rounded-2xl border border-zinc-800 bg-zinc-950/70 px-4 text-sm text-zinc-100 outline-none focus:border-cyan-700/40"
                  >
                    <option value="all">All Types</option>
                    <option value="relic">Relics</option>
                    <option value="potion">Potions</option>
                    <option value="item">Items</option>
                    <option value="other">Other</option>
                  </select>

                  <select
                    value={ownershipFilter}
                    onChange={(e) =>
                      setOwnershipFilter(
                        e.target.value as "all" | "owned" | "unowned"
                      )
                    }
                    className="h-11 rounded-2xl border border-zinc-800 bg-zinc-950/70 px-4 text-sm text-zinc-100 outline-none focus:border-cyan-700/40"
                  >
                    <option value="all">All Entries</option>
                    <option value="owned">Owned Only</option>
                    <option value="unowned">Unowned Only</option>
                  </select>
                </div>
              </Panel>

              <Panel className="min-h-0 p-4">
                <SectionHeading icon="🗂️" title="Library Entries" />

                {filteredCards.length === 0 ? (
                  <div className="flex h-full min-h-[260px] items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 p-6 text-center">
                    <div>
                      <div className="text-3xl opacity-40">🗂️</div>
                      <div className="mt-3 text-sm font-medium text-zinc-300">
                        No entries match your filters
                      </div>
                      <div className="mt-1 text-xs text-zinc-500">
                        Try broadening the search or switching the filters.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid max-h-full grid-cols-1 gap-3 overflow-auto pr-1 md:grid-cols-2 xl:grid-cols-3">
                    {filteredCards.map((card) => (
                      <LibraryTile
                        key={card.id}
                        card={card}
                        owned={ownedSet.has(card.id)}
                        selected={selectedCard?.id === card.id}
                        onSelect={(next) => setSelectedId(next.id)}
                      />
                    ))}
                  </div>
                )}
              </Panel>
            </main>

            <aside className="min-h-0">
              <LibraryDetail
                card={selectedCard}
                owned={selectedCard ? ownedSet.has(selectedCard.id) : false}
              />
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
