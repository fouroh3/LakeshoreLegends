import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Avatar from "./Avatar";
import StatBar from "./StatBar";
import { GuildBadge } from "./GuildBadge";
import { hpBarColorFromPct } from "../utils/hpColor";
import {
  itemLibraryById,
  itemLibraryByName,
  type InventoryCard,
} from "../data/itemLibrary";

type Props = {
  person: any | null;
  open: boolean;
  onClose: () => void;
};

type InventoryFilter = "all" | "relic" | "potion" | "item" | "other";

type ResolvedInventoryCard = Omit<InventoryCard, "imageUrl"> & {
  imageUrl: string;
};

type CompanionInfo = {
  name: string;
  imageUrl?: string;
  effect?: string;
} | null;

function skillsToArray(skills: any): string[] {
  if (!skills) return [];
  if (Array.isArray(skills)) return skills.filter(Boolean).map(String);
  return String(skills)
    .split(/[,;|]/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

function resolveCardImage(id: string): string {
  return `/assets/cards/${id}.png`;
}

function normalizeInventory(rawInventory: any): ResolvedInventoryCard[] {
  if (!rawInventory) return [];

  const rawItems = Array.isArray(rawInventory)
    ? rawInventory
    : String(rawInventory)
        .split(/[,;|]/g)
        .map((s) => s.trim())
        .filter(Boolean);

  const out: ResolvedInventoryCard[] = [];

  for (const entry of rawItems) {
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

function groupInventory(cards: ResolvedInventoryCard[]) {
  return {
    relic: cards.filter((c) => c.type === "relic"),
    potion: cards.filter((c) => c.type === "potion"),
    item: cards.filter((c) => c.type === "item"),
    other: cards.filter((c) => c.type === "other"),
  };
}

function getCompanionInfo(person: any): CompanionInfo {
  const raw =
    person?.companion ??
    person?.pet ??
    person?.companionPet ??
    person?.familiar ??
    null;

  if (!raw) return null;

  if (typeof raw === "string") {
    const name = raw.trim();
    return name ? { name } : null;
  }

  const name = String(raw.name ?? raw.title ?? raw.id ?? "").trim();
  if (!name) return null;

  return {
    name,
    imageUrl:
      raw.imageUrl ||
      raw.image ||
      raw.portraitUrl ||
      raw.avatarUrl ||
      undefined,
    effect: raw.effect || raw.description || undefined,
  };
}

function getGuildSigil(guild?: string) {
  switch ((guild || "").trim()) {
    case "Scholars":
      return "✦";
    case "Shadows":
      return "✹";
    case "Guardians":
      return "⬡";
    case "Blades":
      return "❖";
    case "Scouts":
      return "✧";
    case "Diplomats":
      return "◈";
    default:
      return "✷";
  }
}

function getGuildTheme(guild?: string) {
  switch ((guild || "").trim()) {
    case "Scholars":
      return {
        softBorder: "border-amber-700/35",
        softGlow: "shadow-[0_0_22px_rgba(245,158,11,0.10)]",
        bannerText: "text-amber-100",
        portraitGlow:
          "bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.14),transparent_72%)]",
        accentLine: "from-amber-500/30 via-amber-300/30 to-transparent",
        sigilText: "text-amber-300/6",
        modalGlow:
          "shadow-[0_0_0_1px_rgba(245,158,11,0.06),0_0_26px_rgba(245,158,11,0.08),0_30px_100px_rgba(0,0,0,0.65)]",
      };
    case "Shadows":
      return {
        softBorder: "border-violet-700/35",
        softGlow: "shadow-[0_0_22px_rgba(168,85,247,0.10)]",
        bannerText: "text-violet-100",
        portraitGlow:
          "bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.14),transparent_72%)]",
        accentLine: "from-violet-500/30 via-violet-300/30 to-transparent",
        sigilText: "text-violet-300/6",
        modalGlow:
          "shadow-[0_0_0_1px_rgba(168,85,247,0.08),0_0_26px_rgba(168,85,247,0.08),0_30px_100px_rgba(0,0,0,0.65)]",
      };
    case "Guardians":
      return {
        softBorder: "border-sky-700/35",
        softGlow: "shadow-[0_0_22px_rgba(56,189,248,0.10)]",
        bannerText: "text-sky-100",
        portraitGlow:
          "bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.14),transparent_72%)]",
        accentLine: "from-sky-500/30 via-sky-300/30 to-transparent",
        sigilText: "text-sky-300/6",
        modalGlow:
          "shadow-[0_0_0_1px_rgba(56,189,248,0.08),0_0_26px_rgba(56,189,248,0.08),0_30px_100px_rgba(0,0,0,0.65)]",
      };
    case "Blades":
      return {
        softBorder: "border-rose-700/35",
        softGlow: "shadow-[0_0_22px_rgba(244,63,94,0.10)]",
        bannerText: "text-rose-100",
        portraitGlow:
          "bg-[radial-gradient(circle_at_center,rgba(244,63,94,0.14),transparent_72%)]",
        accentLine: "from-rose-500/30 via-rose-300/30 to-transparent",
        sigilText: "text-rose-300/6",
        modalGlow:
          "shadow-[0_0_0_1px_rgba(244,63,94,0.08),0_0_26px_rgba(244,63,94,0.08),0_30px_100px_rgba(0,0,0,0.65)]",
      };
    case "Scouts":
      return {
        softBorder: "border-emerald-700/35",
        softGlow: "shadow-[0_0_22px_rgba(16,185,129,0.10)]",
        bannerText: "text-emerald-100",
        portraitGlow:
          "bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.14),transparent_72%)]",
        accentLine: "from-emerald-500/30 via-emerald-300/30 to-transparent",
        sigilText: "text-emerald-300/6",
        modalGlow:
          "shadow-[0_0_0_1px_rgba(16,185,129,0.08),0_0_26px_rgba(16,185,129,0.08),0_30px_100px_rgba(0,0,0,0.65)]",
      };
    case "Diplomats":
      return {
        softBorder: "border-cyan-700/35",
        softGlow: "shadow-[0_0_22px_rgba(34,211,238,0.10)]",
        bannerText: "text-cyan-100",
        portraitGlow:
          "bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.14),transparent_72%)]",
        accentLine: "from-cyan-500/30 via-cyan-300/30 to-transparent",
        sigilText: "text-cyan-300/6",
        modalGlow:
          "shadow-[0_0_0_1px_rgba(34,211,238,0.08),0_0_26px_rgba(34,211,238,0.08),0_30px_100px_rgba(0,0,0,0.65)]",
      };
    default:
      return {
        softBorder: "border-zinc-700/40",
        softGlow: "",
        bannerText: "text-zinc-100",
        portraitGlow:
          "bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08),transparent_72%)]",
        accentLine: "from-zinc-500/20 via-zinc-300/10 to-transparent",
        sigilText: "text-white/6",
        modalGlow:
          "shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_30px_100px_rgba(0,0,0,0.65)]",
      };
  }
}

function getHealthState(current: number, max: number) {
  const pct = current / Math.max(1, max);

  if (current <= 0) {
    return {
      label: "Defeated",
      classes: "border-zinc-700 bg-zinc-900 text-zinc-300",
    };
  }

  if (pct <= 0.5) {
    return {
      label: "Wounded",
      classes: "border-amber-700/40 bg-amber-950/30 text-amber-200",
    };
  }

  return {
    label: "Healthy",
    classes: "border-emerald-700/40 bg-emerald-950/30 text-emerald-200",
  };
}

function SectionHeading({
  icon,
  title,
  right,
  className = "",
}: {
  icon: string;
  title: string;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mb-2 flex items-center justify-between ${className}`}>
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-zinc-500">
        <span className="text-[11px]">{icon}</span>
        <span>{title}</span>
      </div>
      {right ? <div className="text-[10px] text-zinc-500">{right}</div> : null}
    </div>
  );
}

function Surface({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[24px] border border-zinc-800/70 bg-[linear-gradient(180deg,rgba(24,24,27,0.86),rgba(9,9,11,0.9))] ${className}`}
    >
      {children}
    </section>
  );
}

function CompanionPanel({ companion }: { companion: CompanionInfo }) {
  if (!companion) {
    return (
      <div className="rounded-[20px] border border-dashed border-zinc-800 bg-zinc-950/25 p-3">
        <SectionHeading icon="🐾" title="Companion" className="mb-2" />
        <div className="flex items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 text-xl text-zinc-600">
            ✦
          </div>
          <div>
            <div className="text-sm font-medium text-zinc-300">
              No companion
            </div>
            <div className="mt-1 text-xs text-zinc-500">
              This legend has no active pet or companion.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[20px] border border-zinc-800 bg-zinc-950/35 p-3">
      <SectionHeading icon="🐾" title="Companion" className="mb-2" />
      <div className="flex items-center gap-3">
        <div className="h-16 w-16 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
          {companion.imageUrl ? (
            <img
              src={companion.imageUrl}
              alt={companion.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xl text-zinc-500">
              🐾
            </div>
          )}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-zinc-100">
            {companion.name}
          </div>
          {companion.effect ? (
            <div className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-400">
              {companion.effect}
            </div>
          ) : (
            <div className="mt-1 text-xs text-zinc-500">
              Companion is ready for adventure.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InventoryFilterTabs({
  grouped,
  selected,
  onSelect,
}: {
  grouped: ReturnType<typeof groupInventory>;
  selected: InventoryFilter;
  onSelect: (value: InventoryFilter) => void;
}) {
  const allTabs: { key: InventoryFilter; label: string; count: number }[] = [
    {
      key: "all",
      label: "All",
      count:
        grouped.relic.length +
        grouped.potion.length +
        grouped.item.length +
        grouped.other.length,
    },
    { key: "relic", label: "Relics", count: grouped.relic.length },
    { key: "potion", label: "Potions", count: grouped.potion.length },
    { key: "item", label: "Items", count: grouped.item.length },
    { key: "other", label: "Other", count: grouped.other.length },
  ];

  const tabs = allTabs.filter((tab) => tab.count > 0);

  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const active = selected === tab.key;

        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onSelect(tab.key)}
            className={`rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] transition ${
              active
                ? "border-zinc-500 bg-zinc-100 text-zinc-950"
                : "border-zinc-800 bg-zinc-900/70 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
            }`}
          >
            {tab.label}
            <span
              className={`ml-1 ${active ? "text-zinc-700" : "text-zinc-500"}`}
            >
              {tab.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function InventoryCardTile({
  card,
  isSelected,
  onSelect,
}: {
  card: ResolvedInventoryCard;
  isSelected: boolean;
  onSelect: (card: ResolvedInventoryCard) => void;
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <button
      type="button"
      onClick={() => onSelect(card)}
      className={`group w-full overflow-hidden rounded-[20px] border text-left transition duration-200 ${
        isSelected
          ? "border-zinc-500 bg-zinc-900/95 shadow-[0_14px_30px_rgba(0,0,0,0.34)]"
          : "border-zinc-800 bg-zinc-950/70 hover:-translate-y-[2px] hover:border-zinc-700 hover:bg-zinc-900/90"
      }`}
    >
      <div className="flex aspect-[5/6.7] w-full items-center justify-center overflow-hidden bg-zinc-950 p-2">
        {!imgError ? (
          <img
            src={card.imageUrl}
            alt={card.name}
            className="h-full w-full rounded-[14px] object-contain"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.05),transparent_55%)] p-3 text-center text-[10px] uppercase tracking-[0.16em] text-zinc-500">
            {card.type}
          </div>
        )}
      </div>
    </button>
  );
}

function EmptyDetailPanel({
  inventory,
  grouped,
}: {
  inventory: ResolvedInventoryCard[];
  grouped: ReturnType<typeof groupInventory>;
}) {
  return (
    <div className="h-full min-h-0 overflow-y-auto rounded-[22px] border border-zinc-800 bg-zinc-950/45 p-4">
      <div className="space-y-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            Card Details
          </div>
          <div className="mt-2 text-lg font-semibold text-zinc-100">
            Select a card
          </div>
          <div className="mt-2 text-sm leading-6 text-zinc-400">
            Click any card in the inventory grid to view its details here.
          </div>
        </div>

        <div className="grid gap-2 pt-2">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/55 px-3 py-2.5">
            <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">
              Total Items
            </div>
            <div className="mt-1 text-xl font-semibold text-zinc-100">
              {inventory.length}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 px-3 py-2">
              <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                Relics
              </div>
              <div className="mt-1 text-sm font-semibold text-zinc-200">
                {grouped.relic.length}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 px-3 py-2">
              <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                Potions
              </div>
              <div className="mt-1 text-sm font-semibold text-zinc-200">
                {grouped.potion.length}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 px-3 py-2">
              <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                Items
              </div>
              <div className="mt-1 text-sm font-semibold text-zinc-200">
                {grouped.item.length}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 px-3 py-2">
              <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                Other
              </div>
              <div className="mt-1 text-sm font-semibold text-zinc-200">
                {grouped.other.length}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SelectedCardPanel({
  card,
  inventory,
  grouped,
}: {
  card: ResolvedInventoryCard | null;
  inventory: ResolvedInventoryCard[];
  grouped: ReturnType<typeof groupInventory>;
}) {
  if (!card) {
    return <EmptyDetailPanel inventory={inventory} grouped={grouped} />;
  }

  return (
    <div className="h-full min-h-0 overflow-y-auto rounded-[22px] border border-zinc-800 bg-zinc-950/55 p-4">
      <div className="space-y-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            Card Details
          </div>
          <div className="mt-2 text-xl font-semibold leading-tight text-zinc-100">
            {card.name}
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            {card.type}
          </div>
        </div>

        <div className="rounded-[18px] border border-zinc-800 bg-zinc-900/40 p-3 text-sm leading-6 text-zinc-300">
          {card.effect}
        </div>

        <div className="flex flex-wrap gap-2">
          {card.useText ? (
            <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[10px] text-zinc-300">
              {card.useText}
            </span>
          ) : null}

          {card.isEquipped ? (
            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] text-emerald-200">
              Equipped
            </span>
          ) : null}

          {card.isConsumed ? (
            <span className="rounded-full border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-[10px] text-zinc-300">
              Used
            </span>
          ) : null}

          {card.quantity && card.quantity > 1 ? (
            <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[10px] text-zinc-300">
              Quantity: {card.quantity}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function EmptyInventoryArea() {
  return (
    <div className="grid min-h-0 gap-3 xl:grid-cols-[minmax(0,1fr)_250px] xl:flex-1">
      <div className="flex min-h-[320px] items-center justify-center rounded-[22px] border border-zinc-800 bg-zinc-950/35 p-6">
        <div className="text-center">
          <div className="text-base font-semibold text-zinc-200">
            No items collected yet.
          </div>
          <div className="mt-2 text-sm text-zinc-500">
            This legend’s inventory is currently empty.
          </div>
        </div>
      </div>

      <div className="rounded-[22px] border border-zinc-800 bg-zinc-950/45 p-4">
        <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
          Card Details
        </div>
        <div className="mt-2 text-lg font-semibold text-zinc-100">
          No card selected
        </div>
        <div className="mt-2 text-sm leading-6 text-zinc-400">
          When this player collects cards, details will appear here.
        </div>
      </div>
    </div>
  );
}

function InventorySection({
  inventory,
}: {
  inventory: ResolvedInventoryCard[];
}) {
  const grouped = useMemo(() => groupInventory(inventory), [inventory]);
  const [filter, setFilter] = useState<InventoryFilter>("all");
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  const visibleCards = useMemo((): ResolvedInventoryCard[] => {
    switch (filter) {
      case "relic":
        return grouped.relic;
      case "potion":
        return grouped.potion;
      case "item":
        return grouped.item;
      case "other":
        return grouped.other;
      default:
        return inventory;
    }
  }, [filter, grouped, inventory]);

  useEffect(() => {
    if (!visibleCards.length) {
      setSelectedCardId(null);
      return;
    }

    if (!selectedCardId) return;

    const stillExists = visibleCards.some((card) => card.id === selectedCardId);
    if (!stillExists) {
      setSelectedCardId(null);
    }
  }, [visibleCards, selectedCardId]);

  const selectedCard =
    visibleCards.find((card) => card.id === selectedCardId) ||
    inventory.find((card) => card.id === selectedCardId) ||
    null;

  return (
    <Surface className="flex h-full min-h-0 flex-col p-4">
      <SectionHeading
        icon="🎒"
        title="Inventory"
        right={`${inventory.length} item${inventory.length === 1 ? "" : "s"}`}
      />

      {!inventory.length ? (
        <div className="flex min-h-0 flex-1 pt-1">
          <EmptyInventoryArea />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col space-y-3">
          <InventoryFilterTabs
            grouped={grouped}
            selected={filter}
            onSelect={setFilter}
          />

          <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[minmax(0,1fr)_250px]">
            <div className="min-h-0 rounded-[22px] border border-zinc-800 bg-zinc-950/35 p-3">
              <div className="grid max-h-full grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
                {visibleCards.map((card) => (
                  <InventoryCardTile
                    key={card.id}
                    card={card}
                    isSelected={selectedCardId === card.id}
                    onSelect={(next) =>
                      setSelectedCardId((prev) =>
                        prev === next.id ? null : next.id
                      )
                    }
                  />
                ))}
              </div>
            </div>

            <div className="min-h-0 overflow-hidden">
              <SelectedCardPanel
                card={selectedCard}
                inventory={inventory}
                grouped={grouped}
              />
            </div>
          </div>
        </div>
      )}
    </Surface>
  );
}

function AttributeSection({ person }: { person: any }) {
  return (
    <Surface className="p-3">
      <SectionHeading icon="⚔️" title="Attributes" className="mb-2" />
      <div className="grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
        <StatBar label="Strength" value={person.str} />
        <StatBar label="Dexterity" value={person.dex} />
        <StatBar label="Constitution" value={person.con} />
        <StatBar label="Intelligence" value={person.int} />
        <StatBar label="Wisdom" value={person.wis} />
        <StatBar label="Charisma" value={person.cha} />
      </div>
    </Surface>
  );
}

function SkillsSection({ skillList }: { skillList: string[] }) {
  return (
    <Surface className="p-3 pr-16">
      <SectionHeading
        icon="✨"
        title="Skills"
        right={`${skillList.length} unlocked`}
        className="mb-2"
      />
      {skillList.length === 0 ? (
        <div className="rounded-[16px] bg-zinc-950/35 p-2.5 text-xs italic text-zinc-500">
          No skills unlocked yet.
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {skillList.map((skill) => (
            <span
              key={skill}
              className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-[11px] text-zinc-200"
            >
              {skill}
            </span>
          ))}
        </div>
      )}
    </Surface>
  );
}

export default function CharacterProfileModal({
  person,
  open,
  onClose,
}: Props) {
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

  const skillList = useMemo(
    () => skillsToArray(person?.skills),
    [person?.skills]
  );

  const inventory = useMemo(
    () => normalizeInventory(person?.inventory),
    [person?.inventory]
  );

  const companion = useMemo(() => getCompanionInfo(person), [person]);

  if (!open || !person) return null;

  const fullName =
    `${person.first ?? ""} ${person.last ?? ""}`.trim() || "Unnamed Legend";

  const hpBase = Math.max(1, Number(person.baseHP ?? 20));
  const hpCur = Math.max(
    0,
    Math.min(hpBase, Number(person.currentHP ?? hpBase))
  );

  const hpPct = Math.max(0, Math.min(1, hpCur / Math.max(1, hpBase)));
  const isDead = hpCur <= 0;
  const hpFill = isDead ? "rgba(113,113,122,1)" : hpBarColorFromPct(hpPct);

  const guildTheme = getGuildTheme(person.guild);
  const healthState = getHealthState(hpCur, hpBase);

  return (
    <div className="fixed inset-0 z-[100]">
      <button
        aria-label="Close profile"
        className="absolute inset-0 bg-black/78 backdrop-blur-md"
        onClick={onClose}
      />

      <div className="absolute inset-0 flex items-center justify-center p-3 md:p-5">
        <div
          className={`relative flex h-[94vh] w-full max-w-[1480px] overflow-hidden rounded-[34px] border border-zinc-800 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.03),transparent_24%),linear-gradient(180deg,#0d0d11_0%,#08080a_100%)] shadow-2xl shadow-black/70 ${guildTheme.modalGlow}`}
        >
          <button
            onClick={onClose}
            className="absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900/90 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
            aria-label="Close"
            title="Close"
          >
            ✕
          </button>

          <div className="grid h-full w-full grid-cols-1 gap-4 overflow-auto p-4 xl:grid-cols-[270px_minmax(0,1fr)] xl:overflow-hidden">
            <aside className="min-h-0">
              <div className="flex h-full flex-col rounded-[30px] border border-zinc-800/80 bg-[linear-gradient(180deg,rgba(17,17,21,0.96),rgba(8,8,10,0.96))] p-4">
                <div className="relative flex justify-center">
                  <div
                    className={`pointer-events-none absolute inset-0 flex items-center justify-center text-[108px] font-black leading-none ${guildTheme.sigilText}`}
                  >
                    {getGuildSigil(person.guild)}
                  </div>

                  <div
                    className={`relative h-[168px] w-[168px] overflow-hidden rounded-[28px] border border-zinc-800 bg-zinc-950 shadow-[0_12px_30px_rgba(0,0,0,0.35)] ${guildTheme.softGlow}`}
                  >
                    <div
                      className={`absolute inset-0 ${guildTheme.portraitGlow}`}
                    />
                    <div className="relative flex h-full w-full items-center justify-center">
                      <Avatar
                        name={fullName}
                        src={person.portraitUrl}
                        size={168}
                        className="h-full w-full"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 text-center">
                  <div className="text-[1.75rem] font-semibold leading-tight tracking-[-0.03em] text-zinc-50">
                    {fullName}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                    <span className="rounded-full border border-zinc-800 bg-zinc-900/80 px-3 py-1 text-[11px] font-medium text-zinc-300">
                      {person.homeroom || "—"}
                    </span>
                    <span
                      className={`rounded-full border px-3 py-1 text-[11px] font-medium ${healthState.classes}`}
                    >
                      {healthState.label}
                    </span>
                  </div>

                  {person.guild ? (
                    <div className="mt-4 flex justify-center">
                      <div
                        className={`inline-flex min-h-[46px] items-center gap-2.5 rounded-2xl border bg-zinc-900/85 px-4 py-2 ${guildTheme.softBorder}`}
                      >
                        <GuildBadge guild={person.guild} size={28} />
                        <span
                          className={`text-sm font-semibold leading-none tracking-[0.06em] ${guildTheme.bannerText}`}
                        >
                          {person.guild}
                        </span>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div
                  className={`mx-auto my-4 h-px w-20 bg-gradient-to-r ${guildTheme.accentLine}`}
                />

                <div className="space-y-3">
                  <div className="rounded-[20px] border border-zinc-800 bg-zinc-950/35 p-3.5 text-left">
                    <SectionHeading
                      icon="❤️"
                      title="Health"
                      right={
                        <span className="text-xs font-semibold text-zinc-100">
                          {hpCur}/{hpBase}
                        </span>
                      }
                      className="mb-2"
                    />

                    <div className="overflow-hidden rounded-full bg-zinc-950/80 p-[2px] shadow-[inset_0_0_8px_rgba(0,0,0,0.55)]">
                      <div className="h-3.5 overflow-hidden rounded-full bg-zinc-900/60">
                        <div
                          className="h-full rounded-full transition-[width] duration-300"
                          style={{
                            width: `${Math.round(hpPct * 100)}%`,
                            backgroundColor: hpFill,
                            boxShadow: isDead ? "none" : `0 0 10px ${hpFill}55`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <CompanionPanel companion={companion} />
                </div>

                <div className="mt-auto pt-1 text-center text-[10px] uppercase tracking-[0.22em] text-zinc-600">
                  Character Profile
                </div>
              </div>
            </aside>

            <main className="min-h-0 xl:overflow-hidden">
              <div className="flex h-full min-h-0 flex-col gap-3">
                <div className="grid gap-3 xl:grid-cols-[minmax(0,1.45fr)_minmax(260px,0.55fr)]">
                  <AttributeSection person={person} />
                  <SkillsSection skillList={skillList} />
                </div>

                <div className="min-h-0 flex-1 xl:overflow-hidden">
                  <InventorySection inventory={inventory} />
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
