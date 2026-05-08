// src/pages/CardLibraryPage.tsx

import { useEffect, useMemo, useState } from "react";
import AppTopBar from "../components/AppTopBar";
import CardLibraryModal from "../components/CardLibraryModal";
import { loadStudents } from "../data";
import type { InventoryCard } from "../types/inventory";
import { itemLibraryById, itemLibraryByName } from "../data/itemLibrary";
import { isRareCard, rareCardBadgeClass } from "../utils/rareCards";

type CardTypeFilter = "all" | "relic" | "potion" | "item" | "other";

type ResolvedLibraryCard = Omit<InventoryCard, "imageUrl"> & {
  imageUrl: string;
};

type Props = {
  onBack?: () => void;
};

const TYPE_ORDER: CardTypeFilter[] = [
  "all",
  "relic",
  "potion",
  "item",
  "other",
];

const TYPE_META: Record<
  CardTypeFilter,
  {
    label: string;
    active: string;
    idle: string;
    glow: string;
  }
> = {
  all: {
    label: "All Cards",
    active:
      "border-cyan-300/35 bg-cyan-400/16 text-cyan-100 shadow-[0_0_20px_rgba(34,211,238,0.14)]",
    idle: "border-white/10 bg-white/[0.05] text-white/75 hover:border-white/18 hover:bg-white/[0.09] hover:text-white",
    glow: "from-cyan-400/20 to-sky-400/10",
  },
  relic: {
    label: "Relics",
    active:
      "border-amber-300/35 bg-amber-500/16 text-amber-100 shadow-[0_0_20px_rgba(245,158,11,0.14)]",
    idle: "border-amber-400/16 bg-amber-500/[0.05] text-amber-100/75 hover:bg-amber-500/[0.1]",
    glow: "from-amber-400/20 to-yellow-300/10",
  },
  potion: {
    label: "Potions",
    active:
      "border-emerald-300/35 bg-emerald-500/16 text-emerald-100 shadow-[0_0_20px_rgba(16,185,129,0.14)]",
    idle: "border-emerald-400/16 bg-emerald-500/[0.05] text-emerald-100/75 hover:bg-emerald-500/[0.1]",
    glow: "from-emerald-400/20 to-teal-300/10",
  },
  item: {
    label: "Items",
    active:
      "border-cyan-300/35 bg-cyan-500/16 text-cyan-100 shadow-[0_0_20px_rgba(34,211,238,0.14)]",
    idle: "border-cyan-400/16 bg-cyan-500/[0.05] text-cyan-100/75 hover:bg-cyan-500/[0.1]",
    glow: "from-cyan-400/20 to-sky-300/10",
  },
  other: {
    label: "Other",
    active:
      "border-white/20 bg-white/12 text-white shadow-[0_0_20px_rgba(255,255,255,0.08)]",
    idle: "border-white/10 bg-white/[0.05] text-white/75 hover:border-white/18 hover:bg-white/[0.09] hover:text-white",
    glow: "from-white/12 to-white/4",
  },
};

function normalize(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function normalizeKey(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/\s+/g, " ");
}

function titleize(value: string) {
  if (!value) return "Other";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function resolveCardImage(id: string, type?: string) {
  const cleanId = String(id ?? "").trim().toLowerCase();
  const cleanType = String(type ?? "").trim().toLowerCase();

  if (cleanType) {
    return `/assets/cards/${cleanType}_${cleanId}.png`;
  }

  return `/assets/cards/${cleanId}.png`;
}

function typeKey(card: InventoryCard): CardTypeFilter {
  const value = normalize(card.type);
  if (value === "relic") return "relic";
  if (value === "potion") return "potion";
  if (value === "item") return "item";
  return "other";
}

function resonancePillClass(loreChain?: InventoryCard["loreChain"]) {
  switch (loreChain) {
    case "lake":
      return "border-sky-400/40 bg-sky-500/[0.16] text-sky-200 shadow-[0_0_18px_rgba(56,189,248,0.35)]";
    case "prism":
      return "border-violet-400/40 bg-violet-500/[0.16] text-violet-200 shadow-[0_0_18px_rgba(167,139,250,0.35)]";
    case "alchemist":
      return "border-amber-400/40 bg-amber-500/[0.16] text-amber-200 shadow-[0_0_18px_rgba(251,191,36,0.35)]";
    default:
      return "border-cyan-300/20 bg-cyan-400/[0.08] text-cyan-100";
  }
}

function resonanceCardGlow(loreChain?: InventoryCard["loreChain"]) {
  switch (loreChain) {
    case "lake":
      return "ring-1 ring-sky-400/20 shadow-[0_10px_28px_rgba(56,189,248,0.12)]";
    case "prism":
      return "ring-1 ring-violet-400/20 shadow-[0_10px_28px_rgba(167,139,250,0.12)]";
    case "alchemist":
      return "ring-1 ring-amber-400/20 shadow-[0_10px_28px_rgba(251,191,36,0.12)]";
    default:
      return "";
  }
}

function matchesQuery(card: ResolvedLibraryCard, query: string) {
  const q = normalize(query);
  if (!q) return true;

  return [
    card.name,
    card.type,
    card.effect,
    card.useText,
    card.lore,
    card.whisper,
    card.source,
  ].some((value) => normalize(value).includes(q));
}

function cardCountLabel(count: number) {
  return `${count} card${count === 1 ? "" : "s"}`;
}

function resolveCards(): ResolvedLibraryCard[] {
  const cards = Object.values(itemLibraryById ?? {}).filter(
    Boolean
  ) as InventoryCard[];

  const seen = new Set<string>();

  return cards
    .filter((card) => {
      const key = String(card.id ?? card.name ?? "").trim().toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((card) => ({
      ...card,
      imageUrl: resolveCardImage(String(card.id ?? ""), card.type),
    }))
    .sort((a, b) => {
      const typeA = typeKey(a);
      const typeB = typeKey(b);

      if (typeA !== typeB) {
        return TYPE_ORDER.indexOf(typeA) - TYPE_ORDER.indexOf(typeB);
      }

      return String(a.name ?? "").localeCompare(String(b.name ?? ""));
    });
}

function inventoryEntries(
  raw: unknown
): Array<string | Record<string, unknown>> {
  if (!raw) return [];

  if (Array.isArray(raw)) {
    return raw as Array<string | Record<string, unknown>>;
  }

  if (typeof raw === "string") {
    const text = raw.trim();
    if (!text) return [];

    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // ignore
    }

    return text
      .split(/[;,|]/g)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  return [];
}

function typedCardKey(card: InventoryCard) {
  const type = String(card.type ?? "").trim().toLowerCase();
  const id = String(card.id ?? "").trim().toLowerCase();
  return type && id ? `${type}_${id}` : "";
}

function entryMatchesCard(
  entry: string | Record<string, unknown>,
  card: InventoryCard
) {
  const cardId = normalize(card.id);
  const cardName = normalize(card.name);
  const cardTypedKey = normalizeKey(typedCardKey(card));

  if (typeof entry === "string") {
    const rawKey = normalizeKey(entry);
    const rawLabel = normalize(entry);

    if (!rawKey && !rawLabel) return false;

    const normalizedCardName = cardName
      .replace(/[_\s]+/g, " ")
      .replace(/[^a-z0-9 ]/g, "")
      .trim();

    const normalizedRawLabel = rawLabel
      .replace(/[_\s]+/g, " ")
      .replace(/[^a-z0-9 ]/g, "")
      .trim();

    return (
      rawKey === cardTypedKey ||
      rawLabel === cardId ||
      rawLabel === cardName ||
      normalizedRawLabel === normalizedCardName
    );
  }

  const row = entry as Record<string, unknown>;

  const possibleKeyValues = [
    row.id,
    row.itemId,
    row.cardId,
    row.key,
    row.inventoryKey,
  ]
    .map((v) => normalizeKey(v))
    .filter(Boolean);

  if (possibleKeyValues.some((v) => v === cardTypedKey)) return true;

  const possibleNameValues = [
    row.name,
    row.title,
    row.label,
    row.item,
    row.card,
    row.cardName,
  ]
    .map((v) => normalize(v))
    .filter(Boolean);

  if (possibleNameValues.some((v) => v === cardName || v === cardId)) {
    return true;
  }

  const possibleName =
    possibleNameValues.find(Boolean) || normalize(row.name) || "";

  if (possibleName) {
    const libByName = itemLibraryByName?.[possibleName];
    if (libByName) {
      const libTypedKey = normalizeKey(typedCardKey(libByName));
      const libId = normalize(libByName.id);
      return libTypedKey === cardTypedKey || libId === cardId;
    }
  }

  return false;
}

function CardImage({ card }: { card: ResolvedLibraryCard }) {
  const cleanId = String(card.id ?? "").trim().toLowerCase();

  const candidates = [
    `/assets/cards/${card.type}_${cleanId}.png`,
    `/assets/cards/${card.type}_${cleanId}.jpg`,
    `/assets/cards/${card.type}_${cleanId}.jpeg`,
    `/assets/cards/${card.type}_${cleanId}.webp`,
    `/assets/cards/${cleanId}.png`,
    `/assets/cards/${cleanId}.jpg`,
    `/assets/cards/${cleanId}.jpeg`,
    `/assets/cards/${cleanId}.webp`,
  ];

  const [index, setIndex] = useState(0);

  if (index >= candidates.length) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-white/35">
        No art
      </div>
    );
  }

  return (
    <img
      src={candidates[index]}
      alt={card.name}
      className="h-full w-full object-cover object-center transition duration-300 group-hover:scale-[1.02]"
      onError={() => setIndex((prev) => prev + 1)}
    />
  );
}

export default function CardLibraryPage({ onBack }: Props) {
  const allCards = useMemo(() => resolveCards(), []);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<CardTypeFilter>("all");
  const [activeCard, setActiveCard] = useState<ResolvedLibraryCard | null>(
    null
  );
  const [inventoryCounts, setInventoryCounts] = useState<
    Record<string, number>
  >({});

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const students = await loadStudents();
        if (!alive) return;

        const counts: Record<string, number> = {};

        for (const card of allCards) {
          const cardKey = String(card.id ?? "");
          let count = 0;

          for (const student of students) {
            const row = student as Record<string, unknown>;
            const entries = inventoryEntries(
              row.inventory ??
                row.items ??
                row.itemInventory ??
                row.cardInventory
            );

            if (entries.some((entry) => entryMatchesCard(entry, card))) {
              count += 1;
            }
          }

          counts[cardKey] = count;
        }

        setInventoryCounts(counts);
      } catch {
        if (!alive) return;
        setInventoryCounts({});
      }
    })();

    return () => {
      alive = false;
    };
  }, [allCards]);

  const filteredCards = useMemo(() => {
    return allCards.filter((card) => {
      const typeMatch = filter === "all" ? true : typeKey(card) === filter;
      return typeMatch && matchesQuery(card, query);
    });
  }, [allCards, filter, query]);

  const counts = useMemo(() => {
    return {
      all: allCards.length,
      relic: allCards.filter((c) => typeKey(c) === "relic").length,
      potion: allCards.filter((c) => typeKey(c) === "potion").length,
      item: allCards.filter((c) => typeKey(c) === "item").length,
      other: allCards.filter((c) => typeKey(c) === "other").length,
    };
  }, [allCards]);

  return (
    <>
      <div className="min-h-screen w-full bg-[radial-gradient(circle_at_top,rgba(40,60,120,0.12),transparent_40%),#0a0a0a] text-zinc-100">
        <div className="pointer-events-none fixed inset-0 z-0 hidden lg:block">
          <div className="absolute left-1/2 top-[160px] h-[440px] w-[1100px] -translate-x-1/2 rounded-full bg-cyan-500/[0.035] blur-3xl" />
          <div className="absolute left-[22%] top-[260px] h-[320px] w-[320px] rounded-full bg-violet-500/[0.045] blur-3xl" />
          <div className="absolute right-[18%] top-[340px] h-[360px] w-[360px] rounded-full bg-emerald-500/[0.04] blur-3xl" />
        </div>

        <AppTopBar
          title="Card Library"
          activeView="cards"
          onNavigate={(next) => {
            if (next === "dashboard") {
              onBack?.();
              return;
            }

            const routes: Record<string, string> = {
              dashboard: "/",
              store: "/store",
              cards: "/cards",
              battle: "/battle",
            };

            window.location.href = routes[next] || "/";
          }}
        />

        <div className="relative z-[1] px-3 pt-3 sm:px-4 sm:pt-4">
          <div className="mx-auto max-w-[1480px]">
            <div className="overflow-hidden rounded-[22px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.06),transparent_45%),linear-gradient(180deg,rgba(9,14,25,0.94),rgba(6,10,18,0.94))] shadow-[0_14px_38px_rgba(0,0,0,0.28)] backdrop-blur-xl">
              <div className="px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6">
                <div className="inline-flex rounded-full border border-cyan-300/15 bg-cyan-400/[0.08] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-100/65">
                  Card Library
                </div>

                <h1 className="mt-3 text-xl font-semibold text-white sm:text-2xl lg:text-[2rem]">
                  Browse every available card
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/62 lg:text-[15px]">
                  Search effects, compare uses, and inspect lore, whispers, and
                  resonance-linked cards.
                </p>

                <div className="mt-4 flex flex-wrap gap-2.5">
                  <div className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/72">
                    {cardCountLabel(allCards.length)}
                  </div>
                  <div className="rounded-full border border-amber-300/15 bg-amber-500/[0.08] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-100/72">
                    {counts.relic} relics
                  </div>
                  <div className="rounded-full border border-emerald-300/15 bg-emerald-500/[0.08] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-100/72">
                    {counts.potion} potions
                  </div>
                  <div className="rounded-full border border-cyan-300/15 bg-cyan-500/[0.08] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-100/72">
                    {counts.item} items
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-[1] px-3 pb-8 pt-4 sm:px-4 sm:pt-5 lg:pb-10">
          <div className="mx-auto max-w-[1480px]">
            <div className="grid gap-4 lg:grid-cols-[290px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)]">
              <aside className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(9,14,25,0.92),rgba(7,10,18,0.92))] p-4 shadow-[0_12px_34px_rgba(0,0,0,0.24)] backdrop-blur-xl lg:sticky lg:top-4 lg:self-start">
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/42">
                  Search & Filter
                </div>

                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search cards, lore, whispers..."
                  className="mt-3 h-11 w-full rounded-full border border-white/10 bg-white/[0.06] px-4 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-cyan-300/30 focus:bg-white/[0.09]"
                />

                <div className="mt-4 space-y-2">
                  {TYPE_ORDER.map((type) => {
                    const meta = TYPE_META[type];
                    const active = filter === type;
                    const count = counts[type];

                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setFilter(type)}
                        className={[
                          "flex w-full items-center justify-between rounded-[18px] border px-3 py-3 text-left transition",
                          active ? meta.active : meta.idle,
                        ].join(" ")}
                      >
                        <div>
                          <div className="text-sm font-semibold">
                            {meta.label}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-current/70">
                            {cardCountLabel(count)}
                          </div>
                        </div>

                        <div
                          className={`h-9 w-9 rounded-full border border-white/10 bg-gradient-to-br ${meta.glow}`}
                        />
                      </button>
                    );
                  })}
                </div>
              </aside>

              <section className="min-w-0 rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(9,14,25,0.92),rgba(7,10,18,0.92))] p-4 shadow-[0_12px_34px_rgba(0,0,0,0.24)] backdrop-blur-xl sm:p-5 lg:p-6">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/42">
                      Available Cards
                    </div>
                    <div className="mt-1 text-sm text-white/68">
                      Showing {filteredCards.length} of {allCards.length}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setFilter("all");
                    }}
                    className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/72 transition hover:bg-white/[0.09] hover:text-white"
                  >
                    Reset
                  </button>
                </div>

                {filteredCards.length === 0 ? (
                  <div className="rounded-[22px] border border-white/10 bg-white/[0.03] px-5 py-8 text-center">
                    <div className="text-base font-semibold text-white/86">
                      No cards found
                    </div>
                    <div className="mt-2 text-sm text-white/52">
                      Try a different search term or category.
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                    {filteredCards.map((card) => {
                      const type = typeKey(card);
                      const rare = isRareCard(card);

                      return (
                        <button
                          key={String(card.id)}
                          type="button"
                          onClick={() => {
                            setActiveCard(card);
                          }}
                          className={[
                            "group relative flex h-full min-w-0 w-full flex-col overflow-hidden rounded-[26px] border text-left transition",
                            "border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] hover:border-white/18 hover:bg-white/[0.06]",
                            rare
                              ? "ring-1 ring-red-500/25 shadow-[0_10px_26px_rgba(239,68,68,0.14)]"
                              : resonanceCardGlow(card.loreChain),
                          ].join(" ")}
                        >
                          <div className="px-5 pt-5 lg:px-6 lg:pt-6">
                            <div className="flex justify-center">
                              <div className="w-full max-w-[220px] lg:max-w-[240px]">
                                <div className="relative aspect-[3/4.2] w-full">
                                  <div className="absolute inset-0 rounded-[18px] border border-white/10 bg-black/40 shadow-inner" />
                                  <div className="absolute inset-x-[8.5%] inset-y-[6.5%] overflow-hidden rounded-[12px] bg-black">
                                    <CardImage card={card} />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-1 flex-col px-5 pb-5 pt-4 lg:px-6 lg:pb-6">
                            <div className="text-[1.1rem] font-semibold text-white lg:text-[1.15rem]">
                              {card.name}
                            </div>

                            <div className="mt-2 line-clamp-2 min-h-[3.25rem] text-sm leading-6 text-white/58">
                              {card.effect || "No effect text available."}
                            </div>

                            <div className="mt-5 flex flex-1 flex-col justify-end">
                              <div className="flex min-h-[38px] flex-wrap items-center gap-2">
                                <div className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
                                  {inventoryCounts[String(card.id ?? "")] ?? 0}{" "}
                                  players
                                </div>

                                <div className="rounded-full border border-white/12 bg-black/30 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/80">
                                  {titleize(type)}
                                </div>

                                <div
                                  className={`rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] ${
                                    rare
                                      ? rareCardBadgeClass()
                                      : "border-zinc-700 bg-zinc-900 text-zinc-300"
                                  }`}
                                >
                                  {rare ? "Rare" : "Common"}
                                </div>
                              </div>

                              <div className="mt-2 min-h-[38px]">
                                {card.loreChain ? (
                                  <div
                                    className={`relative inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] backdrop-blur-sm ${resonancePillClass(
                                      card.loreChain
                                    )}`}
                                  >
                                    <div className="absolute inset-0 rounded-full opacity-30 blur-md" />

                                    <div className="relative flex items-center gap-2">
                                      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-90" />

                                      {card.loreChain === "lake"
                                        ? "Lake Resonance"
                                        : card.loreChain === "prism"
                                        ? "Prism Resonance"
                                        : card.loreChain === "alchemist"
                                        ? "Alchemist Resonance"
                                        : "Resonance"}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="invisible inline-flex rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em]">
                                    Resonance
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      </div>

      <CardLibraryModal
        card={activeCard}
        open={Boolean(activeCard)}
        onClose={() => setActiveCard(null)}
        inventoryCount={
          activeCard ? inventoryCounts[String(activeCard.id ?? "")] ?? 0 : 0
        }
      />
    </>
  );
}