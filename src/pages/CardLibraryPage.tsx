import { useEffect, useMemo, useState } from "react";
import AppTopBar from "../components/AppTopBar";
import CardLibraryModal from "../components/CardLibraryModal";
import { loadStudents } from "../data";
import {
  itemLibraryById,
  itemLibraryByName,
  type InventoryCard,
} from "../data/itemLibrary";

type CardTypeFilter = "all" | "relic" | "potion" | "item" | "pet" | "other";

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
  "pet",
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
  pet: {
    label: "Companions",
    active:
      "border-violet-300/35 bg-violet-500/16 text-violet-100 shadow-[0_0_20px_rgba(168,85,247,0.14)]",
    idle: "border-violet-400/16 bg-violet-500/[0.05] text-violet-100/75 hover:bg-violet-500/[0.1]",
    glow: "from-violet-400/20 to-fuchsia-300/10",
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
    .toLowerCase();
}

function titleize(value: string) {
  if (!value) return "Other";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function resolveCardImage(id: string) {
  return `/assets/cards/${id}.png`;
}

function typeKey(card: InventoryCard): CardTypeFilter {
  const value = normalize(card.type);
  if (value === "relic") return "relic";
  if (value === "potion") return "potion";
  if (value === "item") return "item";
  if (value === "pet") return "pet";
  return "other";
}

function matchesQuery(card: ResolvedLibraryCard, query: string) {
  const q = normalize(query);
  if (!q) return true;

  return [card.name, card.type, card.effect, card.useText].some((value) =>
    normalize(value).includes(q)
  );
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
      const key = String(card.id ?? card.name ?? "")
        .trim()
        .toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((card) => ({
      ...card,
      imageUrl: resolveCardImage(String(card.id ?? "")),
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
      // fall through
    }

    return text
      .split(/[;,|]/g)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  return [];
}

function entryMatchesCard(
  entry: string | Record<string, unknown>,
  card: InventoryCard
) {
  const cardId = normalize(card.id);
  const cardName = normalize(card.name);

  if (typeof entry === "string") {
    const raw = normalize(entry);
    if (!raw) return false;
    return raw === cardId || raw === cardName;
  }

  const row = entry as Record<string, unknown>;
  const entryId = normalize(row.id);
  const entryName = normalize(row.name);
  const entryItemId = normalize(row.itemId);
  const entryCardId = normalize(row.cardId);

  if (entryId && entryId === cardId) return true;
  if (entryItemId && entryItemId === cardId) return true;
  if (entryCardId && entryCardId === cardId) return true;
  if (entryName && entryName === cardName) return true;

  if (entryName) {
    const libByName = itemLibraryByName?.[entryName];
    if (libByName && normalize(libByName.id) === cardId) return true;
  }

  return false;
}

export default function CardLibraryPage({ onBack }: Props) {
  const allCards = useMemo(() => resolveCards(), []);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<CardTypeFilter>("all");
  const [selectedId, setSelectedId] = useState<string>("");
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

  const selectedCard =
    filteredCards.find((card) => String(card.id) === selectedId) ??
    filteredCards[0] ??
    null;

  const counts = useMemo(() => {
    return {
      all: allCards.length,
      relic: allCards.filter((c) => typeKey(c) === "relic").length,
      potion: allCards.filter((c) => typeKey(c) === "potion").length,
      item: allCards.filter((c) => typeKey(c) === "item").length,
      pet: allCards.filter((c) => typeKey(c) === "pet").length,
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

            const url = new URL(window.location.href);
            if (next === "cards") {
              url.searchParams.set("view", "cards");
            } else {
              url.searchParams.set("view", next);
            }
            window.location.href = url.toString();
          }}
        />

        <div className="relative z-[1] px-3 pt-3 sm:px-4 sm:pt-4">
          <div className="mx-auto max-w-[1480px]">
            <div className="overflow-hidden rounded-[22px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.06),transparent_45%),linear-gradient(180deg,rgba(9,14,25,0.94),rgba(6,10,18,0.94))] shadow-[0_14px_38px_rgba(0,0,0,0.28)] backdrop-blur-xl">
              <div className="px-4 py-4 sm:px-5 sm:py-5">
                <div className="inline-flex rounded-full border border-cyan-300/15 bg-cyan-400/[0.08] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-100/65">
                  Card Library
                </div>

                <h1 className="mt-3 text-xl font-semibold text-white sm:text-2xl">
                  Browse every available card
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/62">
                  Search effects, compare uses, and inspect full card details.
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

        <div className="relative z-[1] px-3 pb-8 pt-4 sm:px-4 sm:pt-5">
          <div className="mx-auto max-w-[1480px]">
            <div className="grid gap-4 xl:grid-cols-[290px_minmax(0,1fr)]">
              <aside className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(9,14,25,0.92),rgba(7,10,18,0.92))] p-4 shadow-[0_12px_34px_rgba(0,0,0,0.24)] backdrop-blur-xl">
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/42">
                  Search & Filter
                </div>

                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search cards, effects, uses..."
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

              <section className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(9,14,25,0.92),rgba(7,10,18,0.92))] p-4 shadow-[0_12px_34px_rgba(0,0,0,0.24)] backdrop-blur-xl sm:p-5">
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
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,320px))] justify-center gap-6">
                    {filteredCards.map((card) => {
                      const selected =
                        String(card.id) === String(selectedCard?.id);
                      const type = typeKey(card);
                      const meta = TYPE_META[type];

                      return (
                        <button
                          key={String(card.id)}
                          type="button"
                          onClick={() => {
                            setSelectedId(String(card.id));
                            setActiveCard(card);
                          }}
                          className={[
                            "group w-full overflow-hidden rounded-[26px] border text-left transition",
                            selected
                              ? `${meta.active} bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03))]`
                              : "border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] hover:border-white/18 hover:bg-white/[0.06]",
                          ].join(" ")}
                        >
                          <div className="relative px-6 pb-0 pt-6">
                            <div className="absolute left-5 top-5 z-10 rounded-full border border-white/12 bg-black/35 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/82 backdrop-blur-sm">
                              {titleize(type)}
                            </div>

                            <div className="flex justify-center">
                              <div className="w-full max-w-[240px]">
                                <img
                                  src={card.imageUrl}
                                  alt={card.name}
                                  className="block h-auto w-full transition duration-300 group-hover:scale-[1.03]"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="px-5 pb-5 pt-4">
                            <div className="text-[1.15rem] font-semibold text-white">
                              {card.name}
                            </div>

                            <div className="mt-2 line-clamp-2 min-h-[3.25rem] text-sm leading-6 text-white/58">
                              {card.effect || "No effect text available."}
                            </div>

                            <div className="mt-5 flex items-center justify-between gap-3">
                              <div className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
                                {inventoryCounts[String(card.id ?? "")] ?? 0}{" "}
                                players
                              </div>

                              <div className="rounded-full border border-cyan-300/18 bg-cyan-500/[0.08] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-100/78">
                                View Card
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
