// src/components/CharacterProfileModal.tsx

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import Avatar from "./Avatar";
import { hpStatus } from "../utils/hpStatus";
import { GuildBadge } from "./GuildBadge";
import { hpBarColorFromPct } from "../utils/hpColor";
import { itemLibraryById, itemLibraryByName } from "../data/itemLibrary";
import type { InventoryCard } from "../types/inventory";
import {
  isRareCard,
  rareCardBadgeClass,
  rareCardGlowClass,
} from "../utils/rareCards";

type Props = {
  person: any | null;
  open: boolean;
  onClose: () => void;
  allStudents?: any[];
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

type GuildTheme = {
  softBorder: string;
  softGlow: string;
  bannerText: string;
  portraitGlow: string;
  accentLine: string;
  sigilText: string;
  modalGlow: string;
  selectedCardClass: string;
  selectedCardGlow: string;
  accentText: string;
  accentBadge: string;
  accentPanel: string;
  accentBorder: string;
  accentBgSoft: string;
  accentGlowSoft: string;
  shimmerClass: string;
};

function skillsToArray(skills: any): string[] {
  if (!skills) return [];
  if (Array.isArray(skills)) return skills.filter(Boolean).map(String);
  return String(skills)
    .split(/[,;|]/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

function resolveCardImage(id: string, type?: string): string {
  const cleanId = String(id ?? "").trim().toLowerCase();
  const cleanType = String(type ?? "").trim().toLowerCase();

  if (cleanType) {
    return `/assets/cards/${cleanType}_${cleanId}.png`;
  }

  return `/assets/cards/${cleanId}.png`;
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
      const normalized = entry
        .toLowerCase()
        .trim()
        .replace(/[_\s]+/g, " ")
        .replace(/[^a-z0-9 ]/g, "");

      const underscored = normalized.replace(/\s+/g, "_");

      const candidates = [
        underscored,
        underscored.replace(/^item_/, ""),
        underscored.replace(/^potion_/, ""),
        underscored.replace(/^relic_/, ""),
        `item_${underscored}`,
        `potion_${underscored}`,
        `relic_${underscored}`,
      ];

      const base =
        candidates.map((id) => itemLibraryById[id]).find(Boolean) ||
        itemLibraryByName[normalized] ||
        null;

      if (!base) continue;

      out.push({
        ...base,
        imageUrl: resolveCardImage(base.id, base.type),
      });
      continue;
    }

    if (entry && typeof entry === "object") {
      const rawId = String(entry.id ?? "").trim().toLowerCase();
      const rawName = String(entry.name ?? "")
        .trim()
        .toLowerCase();

      const normalizedName = rawName
        .replace(/[_\s]+/g, " ")
        .replace(/[^a-z0-9 ]/g, "");

      const normalizedId = rawId
        .replace(/[_\s]+/g, "_")
        .replace(/[^a-z0-9_]/g, "");

      const candidates = [
        normalizedId,
        normalizedId.replace(/^item_/, ""),
        normalizedId.replace(/^potion_/, ""),
        normalizedId.replace(/^relic_/, ""),
        `item_${normalizedId}`,
        `potion_${normalizedId}`,
        `relic_${normalizedId}`,
      ];

      const base =
        candidates.map((id) => itemLibraryById[id]).find(Boolean) ||
        itemLibraryByName[normalizedName] ||
        null;

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
        imageUrl: resolveCardImage(base.id, base.type),
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

function getGuildTheme(guild?: string): GuildTheme {
  switch ((guild || "").trim()) {
    case "Scholars":
      return {
        softBorder: "border-amber-700/35",
        softGlow: "shadow-[0_0_22px_rgba(245,158,11,0.10)]",
        bannerText: "text-amber-100",
        portraitGlow:
          "bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.16),transparent_72%)]",
        accentLine: "from-amber-500/30 via-amber-300/30 to-transparent",
        sigilText: "text-amber-300/6",
        modalGlow:
          "shadow-[0_0_0_1px_rgba(245,158,11,0.06),0_0_26px_rgba(245,158,11,0.08),0_30px_100px_rgba(0,0,0,0.65)]",
        selectedCardClass:
          "border-amber-400/70 bg-amber-950/20 ring-1 ring-amber-400/35",
        selectedCardGlow: "shadow-[0_14px_34px_rgba(245,158,11,0.22)]",
        accentText: "text-amber-200",
        accentBadge: "border-amber-500/30 bg-amber-500/10 text-amber-200",
        accentPanel:
          "before:bg-[linear-gradient(90deg,rgba(245,158,11,0.55),rgba(245,158,11,0.02))]",
        accentBorder: "border-amber-400/25",
        accentBgSoft: "bg-amber-500/[0.06]",
        accentGlowSoft: "shadow-[0_0_18px_rgba(245,158,11,0.12)]",
        shimmerClass: "from-transparent via-amber-200/12 to-transparent",
      };
    case "Shadows":
      return {
        softBorder: "border-violet-700/35",
        softGlow: "shadow-[0_0_22px_rgba(168,85,247,0.10)]",
        bannerText: "text-violet-100",
        portraitGlow:
          "bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.16),transparent_72%)]",
        accentLine: "from-violet-500/30 via-violet-300/30 to-transparent",
        sigilText: "text-violet-300/6",
        modalGlow:
          "shadow-[0_0_0_1px_rgba(168,85,247,0.08),0_0_26px_rgba(168,85,247,0.08),0_30px_100px_rgba(0,0,0,0.65)]",
        selectedCardClass:
          "border-violet-400/70 bg-violet-950/20 ring-1 ring-violet-400/35",
        selectedCardGlow: "shadow-[0_14px_34px_rgba(168,85,247,0.22)]",
        accentText: "text-violet-200",
        accentBadge: "border-violet-500/30 bg-violet-500/10 text-violet-200",
        accentPanel:
          "before:bg-[linear-gradient(90deg,rgba(168,85,247,0.55),rgba(168,85,247,0.02))]",
        accentBorder: "border-violet-400/25",
        accentBgSoft: "bg-violet-500/[0.06]",
        accentGlowSoft: "shadow-[0_0_18px_rgba(168,85,247,0.12)]",
        shimmerClass: "from-transparent via-violet-200/12 to-transparent",
      };
    case "Guardians":
      return {
        softBorder: "border-sky-700/35",
        softGlow: "shadow-[0_0_22px_rgba(56,189,248,0.10)]",
        bannerText: "text-sky-100",
        portraitGlow:
          "bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.16),transparent_72%)]",
        accentLine: "from-sky-500/30 via-sky-300/30 to-transparent",
        sigilText: "text-sky-300/6",
        modalGlow:
          "shadow-[0_0_0_1px_rgba(56,189,248,0.08),0_0_26px_rgba(56,189,248,0.08),0_30px_100px_rgba(0,0,0,0.65)]",
        selectedCardClass:
          "border-sky-400/70 bg-sky-950/20 ring-1 ring-sky-400/35",
        selectedCardGlow: "shadow-[0_14px_34px_rgba(56,189,248,0.22)]",
        accentText: "text-sky-200",
        accentBadge: "border-sky-500/30 bg-sky-500/10 text-sky-200",
        accentPanel:
          "before:bg-[linear-gradient(90deg,rgba(56,189,248,0.55),rgba(56,189,248,0.02))]",
        accentBorder: "border-sky-400/25",
        accentBgSoft: "bg-sky-500/[0.06]",
        accentGlowSoft: "shadow-[0_0_18px_rgba(56,189,248,0.12)]",
        shimmerClass: "from-transparent via-sky-200/12 to-transparent",
      };
    case "Blades":
      return {
        softBorder: "border-rose-700/35",
        softGlow: "shadow-[0_0_22px_rgba(244,63,94,0.10)]",
        bannerText: "text-rose-100",
        portraitGlow:
          "bg-[radial-gradient(circle_at_center,rgba(244,63,94,0.16),transparent_72%)]",
        accentLine: "from-rose-500/30 via-rose-300/30 to-transparent",
        sigilText: "text-rose-300/6",
        modalGlow:
          "shadow-[0_0_0_1px_rgba(244,63,94,0.08),0_0_26px_rgba(244,63,94,0.08),0_30px_100px_rgba(0,0,0,0.65)]",
        selectedCardClass:
          "border-rose-400/70 bg-rose-950/20 ring-1 ring-rose-400/35",
        selectedCardGlow: "shadow-[0_14px_34px_rgba(244,63,94,0.26)]",
        accentText: "text-rose-200",
        accentBadge: "border-rose-500/30 bg-rose-500/10 text-rose-200",
        accentPanel:
          "before:bg-[linear-gradient(90deg,rgba(244,63,94,0.58),rgba(244,63,94,0.02))]",
        accentBorder: "border-rose-400/25",
        accentBgSoft: "bg-rose-500/[0.06]",
        accentGlowSoft: "shadow-[0_0_18px_rgba(244,63,94,0.14)]",
        shimmerClass: "from-transparent via-rose-200/14 to-transparent",
      };
    case "Scouts":
      return {
        softBorder: "border-emerald-700/35",
        softGlow: "shadow-[0_0_22px_rgba(16,185,129,0.10)]",
        bannerText: "text-emerald-100",
        portraitGlow:
          "bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.16),transparent_72%)]",
        accentLine: "from-emerald-500/30 via-emerald-300/30 to-transparent",
        sigilText: "text-emerald-300/6",
        modalGlow:
          "shadow-[0_0_0_1px_rgba(16,185,129,0.08),0_0_26px_rgba(16,185,129,0.08),0_30px_100px_rgba(0,0,0,0.65)]",
        selectedCardClass:
          "border-emerald-400/70 bg-emerald-950/20 ring-1 ring-emerald-400/35",
        selectedCardGlow: "shadow-[0_14px_34px_rgba(16,185,129,0.22)]",
        accentText: "text-emerald-200",
        accentBadge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
        accentPanel:
          "before:bg-[linear-gradient(90deg,rgba(16,185,129,0.58),rgba(16,185,129,0.02))]",
        accentBorder: "border-emerald-400/25",
        accentBgSoft: "bg-emerald-500/[0.06]",
        accentGlowSoft: "shadow-[0_0_18px_rgba(16,185,129,0.14)]",
        shimmerClass: "from-transparent via-emerald-200/12 to-transparent",
      };
    case "Diplomats":
      return {
        softBorder: "border-cyan-700/35",
        softGlow: "shadow-[0_0_22px_rgba(34,211,238,0.10)]",
        bannerText: "text-cyan-100",
        portraitGlow:
          "bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.16),transparent_72%)]",
        accentLine: "from-cyan-500/30 via-cyan-300/30 to-transparent",
        sigilText: "text-cyan-300/6",
        modalGlow:
          "shadow-[0_0_0_1px_rgba(34,211,238,0.08),0_0_26px_rgba(34,211,238,0.08),0_30px_100px_rgba(0,0,0,0.65)]",
        selectedCardClass:
          "border-cyan-400/70 bg-cyan-950/20 ring-1 ring-cyan-400/35",
        selectedCardGlow: "shadow-[0_14px_34px_rgba(34,211,238,0.22)]",
        accentText: "text-cyan-200",
        accentBadge: "border-cyan-500/30 bg-cyan-500/10 text-cyan-200",
        accentPanel:
          "before:bg-[linear-gradient(90deg,rgba(34,211,238,0.58),rgba(34,211,238,0.02))]",
        accentBorder: "border-cyan-400/25",
        accentBgSoft: "bg-cyan-500/[0.06]",
        accentGlowSoft: "shadow-[0_0_18px_rgba(34,211,238,0.14)]",
        shimmerClass: "from-transparent via-cyan-200/12 to-transparent",
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
        selectedCardClass:
          "border-zinc-400/70 bg-zinc-900/95 ring-1 ring-zinc-400/25",
        selectedCardGlow: "shadow-[0_14px_30px_rgba(0,0,0,0.34)]",
        accentText: "text-zinc-200",
        accentBadge: "border-zinc-500/30 bg-zinc-500/10 text-zinc-200",
        accentPanel:
          "before:bg-[linear-gradient(90deg,rgba(255,255,255,0.20),rgba(255,255,255,0.02))]",
        accentBorder: "border-white/10",
        accentBgSoft: "bg-white/[0.03]",
        accentGlowSoft: "",
        shimmerClass: "from-transparent via-white/10 to-transparent",
      };
  }
}

function getCardTypeBadgeClass(type: string, guildTheme: GuildTheme) {
  switch (type) {
    case "relic":
      return guildTheme.accentBadge;
    case "potion":
      return "border-sky-500/30 bg-sky-500/10 text-sky-200";
    case "item":
      return "border-zinc-500/30 bg-zinc-500/10 text-zinc-200";
    default:
      return "border-zinc-600/30 bg-zinc-800/50 text-zinc-300";
  }
}

function getCardFrameClasses(type: string) {
  switch (type) {
    case "relic":
      return {
        shell:
          "border-amber-500/20 bg-[linear-gradient(180deg,rgba(120,90,20,0.10),rgba(10,10,12,0.95))]",
        topGlow:
          "bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.14),transparent_50%)]",
        corner: "text-amber-300/70",
      };
    case "potion":
      return {
        shell:
          "border-sky-500/20 bg-[linear-gradient(180deg,rgba(20,70,120,0.10),rgba(10,10,12,0.95))]",
        topGlow:
          "bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.14),transparent_50%)]",
        corner: "text-sky-300/70",
      };
    case "item":
      return {
        shell:
          "border-zinc-500/20 bg-[linear-gradient(180deg,rgba(120,120,120,0.08),rgba(10,10,12,0.95))]",
        topGlow:
          "bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.07),transparent_50%)]",
        corner: "text-zinc-300/60",
      };
    default:
      return {
        shell:
          "border-zinc-700/20 bg-[linear-gradient(180deg,rgba(70,70,70,0.07),rgba(10,10,12,0.95))]",
        topGlow:
          "bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.05),transparent_50%)]",
        corner: "text-zinc-400/50",
      };
  }
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
    <div
      className={`mb-2 flex items-center justify-between gap-3 ${className}`}
    >
      <div className="flex min-w-0 items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-zinc-500">
        <span className="text-[11px]">{icon}</span>
        <span>{title}</span>
      </div>
      {right ? (
        <div className="shrink-0 text-[10px] text-zinc-500">{right}</div>
      ) : null}
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
      className={`min-w-0 rounded-[24px] border border-zinc-800/70 bg-[linear-gradient(180deg,rgba(24,24,27,0.86),rgba(9,9,11,0.9))] ${className}`}
    >
      {children}
    </section>
  );
}

function ShimmerSweep({
  active,
  className = "",
}: {
  active?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 rotate-[18deg] bg-gradient-to-r opacity-0 ${
        active ? "animate-[shimmerSweep_1.2s_ease-out]" : ""
      } ${className}`}
    />
  );
}

function CompanionPanel({
  companion,
  guildTheme,
}: {
  companion: CompanionInfo;
  guildTheme: GuildTheme;
}) {
  if (!companion) {
    return (
      <div
        className={`rounded-[20px] border border-dashed border-zinc-800 bg-zinc-950/25 p-3 ${guildTheme.accentGlowSoft}`}
      >
        <SectionHeading icon="🐾" title="Companion" className="mb-2" />
        <div className="flex items-center gap-3">
          <div
            className={`relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 ${guildTheme.accentBgSoft}`}
          >
            <div
              className={`absolute inset-0 rounded-2xl ${guildTheme.portraitGlow} opacity-60`}
            />
            <div className="relative text-xl text-zinc-500">✦</div>
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-zinc-200">
              No companion equipped
            </div>
            <div className="mt-1 text-xs leading-5 text-zinc-500">
              This slot is empty. A bonded pet or companion will appear here.
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
        <div
          className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 ${guildTheme.accentGlowSoft}`}
        >
          <div
            className={`absolute inset-0 ${guildTheme.portraitGlow} opacity-40`}
          />
          {companion.imageUrl ? (
            <img
              src={companion.imageUrl}
              alt={companion.name}
              className="relative h-full w-full object-cover"
            />
          ) : (
            <div className="relative flex h-full w-full items-center justify-center text-xl text-zinc-500">
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
  guildTheme,
}: {
  card: ResolvedInventoryCard;
  isSelected: boolean;
  onSelect: (card: ResolvedInventoryCard) => void;
  guildTheme: GuildTheme;
}) {
  const [imgIndex, setImgIndex] = useState(0);
  const frame = getCardFrameClasses(card.type);
  const rare = isRareCard(card);

  const cleanId = String(card.id ?? "").trim().toLowerCase();
  const imageCandidates = [
    `/assets/cards/${card.type}_${cleanId}.png`,
    `/assets/cards/${card.type}_${cleanId}.jpg`,
    `/assets/cards/${card.type}_${cleanId}.jpeg`,
    `/assets/cards/${card.type}_${cleanId}.webp`,
    `/assets/cards/${cleanId}.png`,
    `/assets/cards/${cleanId}.jpg`,
    `/assets/cards/${cleanId}.jpeg`,
    `/assets/cards/${cleanId}.webp`,
  ];

  const showFallback = imgIndex >= imageCandidates.length;

  return (
    <button
      type="button"
      onClick={() => onSelect(card)}
      className={`group relative flex h-full min-h-[300px] w-full flex-col overflow-hidden rounded-[22px] border text-left transition-all duration-250 ${
        isSelected
          ? `${guildTheme.selectedCardClass} ${guildTheme.selectedCardGlow} -translate-y-[2px]`
          : `${frame.shell} hover:-translate-y-[2px] hover:border-zinc-600 hover:shadow-[0_12px_28px_rgba(0,0,0,0.26)]`
      } ${rare ? `border-red-500/45 ${rareCardGlowClass()}` : ""}`}
    >
      <ShimmerSweep
        active={isSelected}
        className={`bg-gradient-to-r ${guildTheme.shimmerClass}`}
      />

      <div className="relative flex h-[190px] w-full items-center justify-center overflow-hidden p-2.5">
        <div
          className={`pointer-events-none absolute inset-0 ${frame.topGlow} opacity-90`}
        />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),transparent_22%,transparent_78%,rgba(255,255,255,0.02))]" />
        <div
          className={`pointer-events-none absolute right-2 top-2 text-[11px] ${frame.corner}`}
        >
          ✦
        </div>

        {!showFallback ? (
          <div className="relative h-full w-full overflow-hidden rounded-[14px] bg-black">
            <img
              src={imageCandidates[imgIndex]}
              alt={card.name}
              className="h-full w-full object-contain object-center drop-shadow-[0_8px_18px_rgba(0,0,0,0.6)]"
              loading="lazy"
              onError={() => setImgIndex((prev) => prev + 1)}
            />
          </div>
        ) : (
          <div className="relative flex h-full w-full items-center justify-center rounded-[14px] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.05),transparent_55%)] p-3 text-center text-[10px] uppercase tracking-[0.16em] text-zinc-500">
            {card.type}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col border-t border-white/5 px-3 pb-3 pt-2">
        <div className="min-h-[40px]">
          <div className="line-clamp-2 text-[12px] font-medium leading-5 text-zinc-200">
            {card.name}
          </div>
        </div>

        <div className="mt-2 flex min-h-[44px] flex-wrap content-start items-start gap-2">
          <span
            className={`inline-flex h-[22px] items-center rounded-full border px-2 py-0 text-[9px] uppercase tracking-[0.12em] ${getCardTypeBadgeClass(
              card.type,
              guildTheme
            )}`}
          >
            {card.type}
          </span>

          {rare ? (
            <span
              className={`inline-flex h-[22px] items-center rounded-full border px-2 py-0 text-[9px] uppercase tracking-[0.12em] ${rareCardBadgeClass()}`}
            >
              Rare
            </span>
          ) : null}

          {card.quantity && card.quantity > 1 ? (
            <span className="inline-flex h-[22px] items-center text-[10px] text-zinc-500">
              x{card.quantity}
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
}

function SelectedPanelImage({
  card,
  candidates,
}: {
  card: ResolvedInventoryCard;
  candidates: string[];
}) {
  const [index, setIndex] = useState(0);

  if (index >= candidates.length) {
    return (
      <div className="flex h-full w-full items-center justify-center text-[10px] uppercase tracking-[0.14em] text-zinc-500">
        No art
      </div>
    );
  }

  return (
    <img
      src={candidates[index]}
      alt={card.name}
      className="h-full w-full object-contain object-center"
      onError={() => setIndex((prev) => prev + 1)}
    />
  );
}

function AnimatedSelectedCardPanel({
  selected,
}: {
  selected: ResolvedInventoryCard | null;
}) {
  if (!selected) {
    return (
      <div className="rounded-[22px] border border-zinc-800 bg-zinc-950/45 p-4">
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
    );
  }

  const rare = isRareCard(selected);
  const showChainHook =
    selected.loreChain === "lake" ||
    selected.loreChain === "prism" ||
    selected.loreChain === "alchemist";

  const cleanId = String(selected.id ?? "").trim().toLowerCase();
  const imageCandidates = [
    `/assets/cards/${selected.type}_${cleanId}.png`,
    `/assets/cards/${selected.type}_${cleanId}.jpg`,
    `/assets/cards/${selected.type}_${cleanId}.jpeg`,
    `/assets/cards/${selected.type}_${cleanId}.webp`,
    `/assets/cards/${cleanId}.png`,
    `/assets/cards/${cleanId}.jpg`,
    `/assets/cards/${cleanId}.jpeg`,
    `/assets/cards/${cleanId}.webp`,
  ];

  return (
    <div
      className={`rounded-[22px] border p-4 transition-all ${
        rare
          ? "border-red-400/40 bg-[linear-gradient(180deg,rgba(60,10,18,0.22),rgba(10,10,12,0.94))] shadow-[0_0_26px_rgba(255,0,0,0.16)]"
          : "border-zinc-800 bg-zinc-950/45"
      }`}
    >
      <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
        Arcane Archive
      </div>

      <div className="mt-1 text-[17px] font-semibold text-zinc-100">
        {selected.name}
      </div>

      {selected.whisper ? (
        <div
          className={`mt-1 text-[12px] italic ${
            rare ? "text-red-200/75" : "text-cyan-200/70"
          }`}
        >
          {selected.whisper}
        </div>
      ) : null}

      <div className="mt-4 flex justify-center">
        <div className="w-full max-w-[118px]">
          <div className="relative aspect-[3/4] w-full">
            <div className="absolute inset-0 rounded-[14px] border border-white/10 bg-black/40 shadow-inner" />
            <div className="absolute inset-0 overflow-hidden rounded-[8px]">
              <SelectedPanelImage
                card={selected}
                candidates={imageCandidates}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-full border border-white/15 bg-white/5 px-3 py-[5px] text-[10px] uppercase tracking-[0.12em] text-white/80">
          {selected.type}
        </span>

        {rare ? (
          <span
            className={`rounded-full border px-3 py-[5px] text-[10px] uppercase tracking-[0.12em] ${rareCardBadgeClass()}`}
          >
            Rare
          </span>
        ) : null}
      </div>

      <div className="mt-5 rounded-[18px] border border-zinc-800 bg-zinc-900/35 p-3.5">
        <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">
          Effect
        </div>
        <div className="mt-2.5 text-[14px] leading-7 text-zinc-200">
          {selected.effect}
        </div>
      </div>

      {selected.lore ? (
        <div className="mt-4 rounded-[18px] border border-zinc-800 bg-zinc-900/35 p-3.5">
          <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">
            Lore
          </div>
          <div className="mt-2.5 text-[14px] leading-7 text-zinc-300">
            {selected.lore}
          </div>

          {showChainHook ? (
            <div
              className={`mt-3 border-t pt-2 text-[10px] uppercase tracking-[0.18em] ${
                rare
                  ? "border-red-500/15 text-red-200/40"
                  : "border-cyan-500/10 text-cyan-200/35"
              }`}
            >
              Part of something larger.
            </div>
          ) : null}
        </div>
      ) : null}

      {selected.useText ? (
        <div className="mt-4 rounded-[18px] border border-zinc-800 bg-zinc-900/35 p-3.5">
          <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">
            Use
          </div>
          <div className="mt-2 text-[13px] text-zinc-300">
            {selected.useText}
          </div>
        </div>
      ) : null}

      {selected.source ? (
        <div className="mt-4 rounded-[18px] border border-zinc-800 bg-zinc-900/35 p-3.5">
          <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">
            Discovered In
          </div>
          <div className="mt-2 text-[13px] text-zinc-300">
            {selected.source}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function EmptyInventoryArea() {
  return (
    <div className="grid gap-3 min-[1320px]:grid-cols-[minmax(0,1fr)_250px]">
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
  guildTheme,
}: {
  inventory: ResolvedInventoryCard[];
  guildTheme: GuildTheme;
}) {
  const grouped = useMemo(() => groupInventory(inventory), [inventory]);
  const [filter, setFilter] = useState<InventoryFilter>("all");
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const inlineDetailRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    if (!selectedCard || !inlineDetailRef.current) return;

    const hasRightRail = window.matchMedia("(min-width: 1320px)").matches;
    if (hasRightRail) return;

    inlineDetailRef.current.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [selectedCard]);

  return (
    <Surface className="p-4">
      <SectionHeading
        icon="🎒"
        title="Inventory"
        right={`${inventory.length} item${inventory.length === 1 ? "" : "s"}`}
      />

      {!inventory.length ? (
        <div className="pt-1">
          <EmptyInventoryArea />
        </div>
      ) : (
        <div className="space-y-3">
          <InventoryFilterTabs
            grouped={grouped}
            selected={filter}
            onSelect={setFilter}
          />

          <div className="min-[1320px]:hidden">
            <div ref={inlineDetailRef}>
              <AnimatedSelectedCardPanel selected={selectedCard} />
            </div>
          </div>

          <div className="grid gap-3 min-[1320px]:grid-cols-[minmax(0,1fr)_250px]">
            <div className="rounded-[22px] border border-zinc-800 bg-zinc-950/35 p-3">
              <div className="grid grid-cols-2 items-stretch gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
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
                    guildTheme={guildTheme}
                  />
                ))}
              </div>
            </div>

            <div className="hidden min-w-0 min-[1320px]:block">
              <AnimatedSelectedCardPanel selected={selectedCard} />
            </div>
          </div>
        </div>
      )}
    </Surface>
  );
}

function HeroBanner({
  fullName,
  person,
  healthState,
  guildTheme,
}: {
  fullName: string;
  person: any;
  healthState: { label: string; pillClass: string };
  guildTheme: GuildTheme;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-[30px] border border-zinc-800/80 bg-[linear-gradient(180deg,rgba(17,17,21,0.96),rgba(8,8,10,0.96))] p-5 ${guildTheme.softGlow}`}
    >
      <ShimmerSweep
        active
        className={`bg-gradient-to-r ${guildTheme.shimmerClass}`}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.05),transparent_38%)]" />
      <div
        className={`pointer-events-none absolute -top-10 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full blur-3xl ${guildTheme.portraitGlow} opacity-80`}
      />
      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r ${guildTheme.accentLine}`}
      />

      <div className="relative flex flex-col items-center text-center">
        <div className="relative flex justify-center">
          <div
            className={`pointer-events-none absolute inset-0 flex items-center justify-center text-[120px] font-black leading-none ${guildTheme.sigilText}`}
          >
            {getGuildSigil(person.guild)}
          </div>

          <div
            className={`relative h-[176px] w-[176px] overflow-hidden rounded-[30px] border border-zinc-800 bg-zinc-950 shadow-[0_18px_38px_rgba(0,0,0,0.42)] ${guildTheme.softGlow}`}
          >
            <div className={`absolute inset-0 ${guildTheme.portraitGlow}`} />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_48%)]" />
            <div className="relative flex h-full w-full items-center justify-center">
              <Avatar
                name={fullName}
                src={person.portraitUrl}
                size={176}
                className="h-full w-full"
              />
            </div>
          </div>
        </div>

        <div className="mt-5">
          <div className="text-[2rem] font-semibold leading-tight tracking-[-0.045em] text-zinc-50">
            {fullName}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <span className="rounded-full border border-zinc-800 bg-zinc-900/85 px-3 py-1 text-[11px] font-medium text-zinc-300">
              {person.homeroom || "—"}
            </span>
            <span
              className={`rounded-full px-3 py-1 text-[11px] font-medium ${healthState.pillClass}`}
            >
              {healthState.label}
            </span>
          </div>

          {person.guild ? (
            <div className="mt-4 flex justify-center">
              <div
                className={`inline-flex min-h-[50px] items-center gap-2.5 rounded-[18px] border bg-zinc-900/90 px-4 py-2.5 ${guildTheme.softBorder} ${guildTheme.accentGlowSoft}`}
              >
                <GuildBadge guild={person.guild} size={30} />
                <span
                  className={`text-sm font-semibold leading-none tracking-[0.08em] ${guildTheme.bannerText}`}
                >
                  {person.guild}
                </span>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function StatRow({
  label,
  value,
  maxValue,
  isTop,
  guildTheme,
}: {
  label: string;
  value: number;
  maxValue: number;
  isTop: boolean;
  guildTheme: GuildTheme;
}) {
  const pct = Math.max(0, Math.min(1, value / Math.max(1, maxValue)));
  const fill = isTop ? hpBarColorFromPct(0.95) : hpBarColorFromPct(0.72);

  return (
    <div
      className={`rounded-[18px] border p-3 transition ${
        isTop
          ? `${guildTheme.accentBorder} ${guildTheme.accentBgSoft} ${guildTheme.accentGlowSoft}`
          : "border-zinc-800/70 bg-zinc-950/25"
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div
            className={`h-2 w-2 rounded-full ${
              isTop ? guildTheme.accentBgSoft : "bg-zinc-700"
            } ${isTop ? guildTheme.accentGlowSoft : ""}`}
            style={isTop ? { backgroundColor: fill } : undefined}
          />
          <span className="text-sm text-zinc-200">{label}</span>
        </div>

        <div className="flex items-center gap-2">
          {isTop ? (
            <span
              className={`text-[10px] uppercase tracking-[0.16em] ${guildTheme.accentText}`}
            >
              Peak
            </span>
          ) : null}
          <span className="text-sm font-semibold text-zinc-100">{value}</span>
        </div>
      </div>

      <div className="overflow-hidden rounded-full bg-zinc-950/80 p-[2px] shadow-[inset_0_0_8px_rgba(0,0,0,0.45)]">
        <div className="h-3 overflow-hidden rounded-full bg-zinc-900/60">
          <div
            className="h-full rounded-full transition-[width] duration-500"
            style={{
              width: `${Math.round(pct * 100)}%`,
              backgroundColor: fill,
              boxShadow: `0 0 10px ${fill}55`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

function AttributeSection({
  person,
  guildTheme,
}: {
  person: any;
  guildTheme: GuildTheme;
}) {
  const stats = [
    ["Strength", Number(person.str ?? 0)],
    ["Dexterity", Number(person.dex ?? 0)],
    ["Constitution", Number(person.con ?? 0)],
    ["Intelligence", Number(person.int ?? 0)],
    ["Wisdom", Number(person.wis ?? 0)],
    ["Charisma", Number(person.cha ?? 0)],
  ] as const;

  const highest = Math.max(...stats.map(([, v]) => v), 0);
  const cap = Math.max(highest, 5);

  return (
    <Surface className="p-4">
      <SectionHeading icon="⚔️" title="Attributes" className="mb-3" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {stats.map(([label, value]) => (
          <StatRow
            key={label}
            label={label}
            value={value}
            maxValue={cap}
            isTop={value === highest && highest > 0}
            guildTheme={guildTheme}
          />
        ))}
      </div>
    </Surface>
  );
}

function SkillsSection({ skillList }: { skillList: string[] }) {
  return (
    <Surface className="p-4 pr-20">
      <SectionHeading
        icon="✨"
        title="Skills"
        right={`${skillList.length} unlocked`}
        className="mb-3"
      />
      {skillList.length === 0 ? (
        <div className="rounded-[16px] bg-zinc-950/35 p-3 text-xs italic text-zinc-500">
          No skills unlocked yet.
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {skillList.map((skill) => (
            <span
              key={skill}
              className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-[11px] text-zinc-200 transition hover:-translate-y-[1px] hover:border-zinc-500 hover:text-white"
            >
              {skill}
            </span>
          ))}
        </div>
      )}
    </Surface>
  );
}

type ResonanceChain = "lake" | "prism" | "alchemist";

type ResonanceBanner = {
  chain: ResonanceChain;
  source: "personal" | "guild";
};

function getCohortStudents(allStudents: any[], person: any) {
  const targetHomeroom = String(person?.homeroom ?? "").trim().toLowerCase();
  const targetGuild = String(person?.guild ?? "").trim().toLowerCase();

  return allStudents.filter((student) => {
    const homeroom = String(student?.homeroom ?? "").trim().toLowerCase();
    const guild = String(student?.guild ?? "").trim().toLowerCase();

    return homeroom === targetHomeroom && guild === targetGuild;
  });
}

function getCompletedChainsFromInventories(
  inventories: ResolvedInventoryCard[][]
): Record<ResonanceChain, boolean> {
  const uniqueByChain: Record<ResonanceChain, Set<string>> = {
    lake: new Set<string>(),
    prism: new Set<string>(),
    alchemist: new Set<string>(),
  };

  for (const inventory of inventories) {
    for (const card of inventory) {
      if (!card.loreChain) continue;
      uniqueByChain[card.loreChain].add(String(card.id));
    }
  }

  return {
    lake: uniqueByChain.lake.size >= 3,
    prism: uniqueByChain.prism.size >= 3,
    alchemist: uniqueByChain.alchemist.size >= 3,
  };
}


function getResonanceMetaCompact(chain: ResonanceChain) {
  switch (chain) {
    case "lake":
      return {
        title: "Lake of Shadows",
        icon: "◈",
        shell:
          "border-sky-400/10 bg-[linear-gradient(180deg,rgba(6,16,28,0.86),rgba(4,6,12,0.92))]",
        glow:
          "bg-[radial-gradient(circle_at_20%_25%,rgba(56,189,248,0.18),transparent_62%)]",
        iconClass:
          "border-sky-300/15 bg-sky-300/[0.05] text-sky-200/70",
        textClass: "text-sky-100/85",
        tagClass:
          "border-sky-300/15 bg-sky-300/[0.06] text-sky-100/72",
      };

    case "prism":
      return {
        title: "Prism Tower",
        icon: "✧",
        shell:
          "border-violet-400/10 bg-[linear-gradient(180deg,rgba(18,10,30,0.86),rgba(6,6,14,0.92))]",
        glow:
          "bg-[radial-gradient(circle_at_20%_25%,rgba(167,139,250,0.18),transparent_62%)]",
        iconClass:
          "border-violet-300/15 bg-violet-300/[0.05] text-violet-200/70",
        textClass: "text-violet-100/85",
        tagClass:
          "border-violet-300/15 bg-violet-300/[0.06] text-violet-100/72",
      };

    case "alchemist":
      return {
        title: "Alchemist's Lair",
        icon: "⬡",
        shell:
          "border-amber-400/10 bg-[linear-gradient(180deg,rgba(28,18,6,0.86),rgba(10,8,6,0.92))]",
        glow:
          "bg-[radial-gradient(circle_at_20%_25%,rgba(251,191,36,0.18),transparent_62%)]",
        iconClass:
          "border-amber-300/15 bg-amber-300/[0.05] text-amber-200/70",
        textClass: "text-amber-100/85",
        tagClass:
          "border-amber-300/15 bg-amber-300/[0.06] text-amber-100/72",
      };
  }
}

function CompactResonanceStack({
  banners,
  hasInventory,
}: {
  banners: ResonanceBanner[];
  hasInventory: boolean;
}) {
  if (!banners.length) return null;

  function getSourceLabel(source: "personal" | "guild") {
    return source === "personal" ? "Personal Resonance" : "Guild Resonance";
  }

  function getSourceLine(
    source: "personal" | "guild",
    hasInventory: boolean
  ) {
    if (source === "personal") {
      return "Completed by this player.";
    }

    return hasInventory
      ? "Activated through shared guild ownership."
      : "This player benefits from the guild's completed resonance.";
  }

  return (
    <div className="space-y-3">
      <div className="text-center text-[10px] uppercase tracking-[0.22em] text-cyan-200/36">
        Resonances
      </div>

      {banners.map((banner) => {
        const meta = getResonanceMetaCompact(banner.chain);

        return (
          <div
            key={`${banner.chain}-${banner.source}`}
            className={`relative overflow-hidden rounded-[20px] border px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.02),0_0_18px_rgba(0,0,0,0.22),0_0_24px_rgba(255,255,255,0.03)] ${meta.shell}`}
          >
            <div
              className={`pointer-events-none absolute inset-0 rounded-[20px] ${meta.glow} opacity-75`}
            />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.14),transparent)]" />

            <div className="relative flex items-start gap-3.5">
              <div
                className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-[13px] shadow-[0_0_12px_rgba(255,255,255,0.05)] ${meta.iconClass}`}
              >
                {meta.icon}
              </div>

              <div className="min-w-0 flex-1">
                <div
                  className={`text-[16px] font-semibold leading-5 ${meta.textClass}`}
                >
                  {meta.title}
                </div>

                <div className="mt-1 text-[11px] font-medium leading-4 text-white/45">
                  {getSourceLabel(banner.source)}
                </div>

                <div className="mt-2.5 max-w-[24ch] text-[12px] leading-6 text-white/52">
                  {getSourceLine(banner.source, hasInventory)}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function CharacterProfileModal({
  person,
  open,
  onClose,
  allStudents = [],
}: Props) {
  const [visible, setVisible] = useState(false);
  const scrollYRef = useRef(0);
  const modalScrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      setVisible(false);
      return;
    }

    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    const scrollY = window.scrollY;
    scrollYRef.current = scrollY;

    const prevBodyOverflow = document.body.style.overflow;
    const prevBodyPosition = document.body.style.position;
    const prevBodyTop = document.body.style.top;
    const prevBodyWidth = document.body.style.width;
    const prevBodyTouchAction = document.body.style.touchAction;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevHtmlOverscroll =
      document.documentElement.style.overscrollBehavior;

    window.addEventListener("keydown", onKey);

    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.overscrollBehavior = "none";

    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    document.body.style.touchAction = "none";

    return () => {
      window.removeEventListener("keydown", onKey);

      document.documentElement.style.overflow = prevHtmlOverflow;
      document.documentElement.style.overscrollBehavior = prevHtmlOverscroll;

      document.body.style.overflow = prevBodyOverflow;
      document.body.style.position = prevBodyPosition;
      document.body.style.top = prevBodyTop;
      document.body.style.width = prevBodyWidth;
      document.body.style.touchAction = prevBodyTouchAction;

      window.scrollTo(0, scrollYRef.current);
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

const cohortStudents = useMemo(() => {
  if (!person) return [];
  return getCohortStudents(allStudents, person);
}, [allStudents, person]);

const cohortInventories = useMemo(() => {
  return cohortStudents.map((student) =>
    normalizeInventory(student?.inventory)
  );
}, [cohortStudents]);

const guildCompletedChains = useMemo(() => {
  return getCompletedChainsFromInventories(cohortInventories);
}, [cohortInventories]);

const personalCompletedChains = useMemo(() => {
  return getCompletedChainsFromInventories([inventory]);
}, [inventory]);


const resonanceBanners = useMemo<ResonanceBanner[]>(() => {
  const order: ResonanceChain[] = ["lake", "prism", "alchemist"];
  const banners: ResonanceBanner[] = [];

  for (const chain of order) {
    const personallyComplete = personalCompletedChains[chain];
    const guildComplete = guildCompletedChains[chain];

    if (personallyComplete) {
      banners.push({
        chain,
        source: "personal",
      });
      continue;
    }

    if (guildComplete) {
      banners.push({
        chain,
        source: "guild",
      });
    }
  }

  return banners;
}, [guildCompletedChains, personalCompletedChains]);

console.log({
  student: person?.first,
  allStudentsCount: allStudents.length,
  guildCompletedChains,
  personalCompletedChains,
  resonanceBanners,
});

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
  const healthState = hpStatus(hpCur, hpBase);

  return (
    <div className="fixed inset-0 z-[1000] bg-black/78 backdrop-blur-md">
      <style>{`
        @keyframes shimmerSweep {
          0% { transform: translateX(-130%) rotate(18deg); opacity: 0; }
          15% { opacity: 0.14; }
          50% { opacity: 0.20; }
          100% { transform: translateX(430%) rotate(18deg); opacity: 0; }
        }
        @keyframes cardLock {
          0% { transform: translateY(0) scale(0.985); }
          60% { transform: translateY(-3px) scale(1.01); }
          100% { transform: translateY(-2px) scale(1); }
        }
      `}</style>

      <button
        aria-label="Close profile"
        className={`absolute inset-0 transition-opacity duration-300 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      <div className="absolute inset-0 overflow-hidden">
        <div
          ref={modalScrollerRef}
          className="h-[100dvh] overflow-y-auto overscroll-contain"
        >
          <div className="min-h-[100dvh] px-0 py-0 sm:px-3 sm:py-3 lg:px-5 lg:py-5">
            <div
              className={`relative mx-auto min-h-[100dvh] w-full max-w-[1520px] overflow-hidden border border-zinc-800 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.03),transparent_24%),linear-gradient(180deg,#0d0d11_0%,#08080a_100%)] transition-all duration-300 sm:min-h-0 sm:rounded-[34px] sm:min-[640px]:shadow-2xl sm:min-[640px]:shadow-black/70 ${
                visible
                  ? "translate-y-0 scale-100 opacity-100"
                  : "translate-y-3 scale-[0.985] opacity-0"
              } ${guildTheme.modalGlow}`}
            >
              <button
                onClick={onClose}
                className="absolute right-4 top-4 z-30 flex h-12 w-12 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900/92 text-zinc-400 transition hover:bg-zinc-800 hover:text-white lg:right-5 lg:top-5"
                aria-label="Close"
                title="Close"
              >
                ✕
              </button>

              <div className="grid w-full gap-4 p-4 pt-16 lg:grid-cols-[300px_minmax(0,1fr)] lg:pt-4">
                <aside className="min-w-0">
                  <div className="space-y-4 lg:flex lg:h-full lg:flex-col">
                    <div
                      className={`transition-all duration-500 delay-75 ${
                        visible
                          ? "translate-y-0 opacity-100"
                          : "translate-y-2 opacity-0"
                      }`}
                    >
                      <HeroBanner
                        fullName={fullName}
                        person={person}
                        healthState={healthState}
                        guildTheme={guildTheme}
                      />
                    </div>

                    <div
                      className={`transition-all duration-500 delay-150 ${
                        visible
                          ? "translate-y-0 opacity-100"
                          : "translate-y-2 opacity-0"
                      }`}
                    >
                      <div className="rounded-[24px] border border-zinc-800/80 bg-[linear-gradient(180deg,rgba(17,17,21,0.96),rgba(8,8,10,0.96))] p-4 lg:flex-1">
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

                            <div className="mb-2">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-medium ${healthState.pillClass}`}
                              >
                                {healthState.label}
                              </span>
                            </div>

                            <div className="overflow-hidden rounded-full bg-zinc-950/80 p-[2px] shadow-[inset_0_0_8px_rgba(0,0,0,0.55)]">
                              <div className="h-3.5 overflow-hidden rounded-full bg-zinc-900/60">
                                <div
                                  className="h-full rounded-full transition-[width] duration-500"
                                  style={{
                                    width: `${Math.round(hpPct * 100)}%`,
                                    backgroundColor: hpFill,
                                    backgroundImage: isDead
                                      ? "none"
                                      : `linear-gradient(90deg, ${hpFill}, ${hpFill}cc)`,
                                    boxShadow: isDead
                                      ? "none"
                                      : `0 0 12px ${hpFill}66`,
                                  }}
                                />
                              </div>
                            </div>
                          </div>

                          {resonanceBanners.length ? (
                            <div className="mt-3">
                              <CompactResonanceStack 
                                banners={resonanceBanners} 
                                hasInventory={inventory.length > 0} 
                                />
                            </div>
                            ) : null}
                          <CompanionPanel
                            companion={companion}
                            guildTheme={guildTheme}
                          />
                          
                        </div>

                        <div className="pt-4 text-center text-[10px] uppercase tracking-[0.22em] text-zinc-600 lg:mt-auto">
                          Character Profile
                        </div>
                      </div>
                    </div>
                  </div>
                </aside>

                <main className="min-w-0">
                  <div className="space-y-3">
                    <div
                      className={`transition-all duration-500 delay-200 ${
                        visible
                          ? "translate-y-0 opacity-100"
                          : "translate-y-2 opacity-0"
                      }`}
                    >
                      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.55fr)]">
                        <AttributeSection
                          person={person}
                          guildTheme={guildTheme}
                        />
                        <SkillsSection skillList={skillList} />
                      </div>
                    </div>

                    <div
                      className={`transition-all duration-500 delay-300 ${
                        visible
                          ? "translate-y-0 opacity-100"
                          : "translate-y-2 opacity-0"
                      }`}
                    >
                      <InventorySection
                        inventory={inventory}
                        guildTheme={guildTheme}
                      />
                    </div>
                  </div>
                </main>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
