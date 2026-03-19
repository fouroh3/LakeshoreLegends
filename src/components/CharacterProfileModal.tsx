import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Avatar from "./Avatar";
import StatBar from "./StatBar";
import { GuildBadge } from "./GuildBadge";
import { hpBarColorFromPct } from "../utils/hpColor";
import type { InventoryCard } from "../types/inventory";
import { getItemRarityClasses, groupInventory } from "../types/inventory";

type Props = {
  person: any | null;
  open: boolean;
  onClose: () => void;
  onOpenLibrary?: () => void;
};

function skillsToArray(skills: any): string[] {
  if (!skills) return [];
  if (Array.isArray(skills)) return skills.filter(Boolean).map(String);
  return String(skills)
    .split(/[,;|]/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

function sectionLabel(title: "Relics" | "Potions" | "Items" | "Other"): string {
  switch (title) {
    case "Relics":
      return "No relics discovered yet";
    case "Potions":
      return "No potions brewed yet";
    case "Items":
      return "No items collected yet";
    case "Other":
      return "Nothing found yet";
  }
}

function getGuildTitle(guild?: string, homeroom?: string) {
  const room = homeroom || "Unknown Homeroom";

  switch ((guild || "").trim()) {
    case "Scholars":
      return `Scholar of ${room}`;
    case "Shadows":
      return `Shadow Operative of ${room}`;
    case "Guardians":
      return `Guardian of ${room}`;
    case "Blades":
      return `Blade of ${room}`;
    case "Scouts":
      return `Scout of ${room}`;
    case "Diplomats":
      return `Diplomat of ${room}`;
    default:
      return `Legend of ${room}`;
  }
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
        softBorder: "border-amber-700/30",
        softGlow: "shadow-[0_0_24px_rgba(245,158,11,0.10)]",
        bannerText: "text-amber-100",
        portraitGlow:
          "bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.18),transparent_72%)]",
        accentLine: "from-amber-500/30 via-amber-300/40 to-transparent",
        modalGlow:
          "shadow-[0_0_0_1px_rgba(245,158,11,0.08),0_0_36px_rgba(245,158,11,0.08),0_30px_100px_rgba(0,0,0,0.68)]",
        sigilText: "text-amber-300/10",
      };
    case "Shadows":
      return {
        softBorder: "border-violet-700/30",
        softGlow: "shadow-[0_0_24px_rgba(168,85,247,0.12)]",
        bannerText: "text-violet-100",
        portraitGlow:
          "bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.18),transparent_72%)]",
        accentLine: "from-violet-500/30 via-violet-300/40 to-transparent",
        modalGlow:
          "shadow-[0_0_0_1px_rgba(168,85,247,0.10),0_0_36px_rgba(168,85,247,0.10),0_30px_100px_rgba(0,0,0,0.68)]",
        sigilText: "text-violet-300/10",
      };
    case "Guardians":
      return {
        softBorder: "border-sky-700/30",
        softGlow: "shadow-[0_0_24px_rgba(56,189,248,0.12)]",
        bannerText: "text-sky-100",
        portraitGlow:
          "bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.18),transparent_72%)]",
        accentLine: "from-sky-500/30 via-sky-300/40 to-transparent",
        modalGlow:
          "shadow-[0_0_0_1px_rgba(56,189,248,0.10),0_0_36px_rgba(56,189,248,0.10),0_30px_100px_rgba(0,0,0,0.68)]",
        sigilText: "text-sky-300/10",
      };
    case "Blades":
      return {
        softBorder: "border-rose-700/30",
        softGlow: "shadow-[0_0_24px_rgba(244,63,94,0.12)]",
        bannerText: "text-rose-100",
        portraitGlow:
          "bg-[radial-gradient(circle_at_center,rgba(244,63,94,0.18),transparent_72%)]",
        accentLine: "from-rose-500/30 via-rose-300/40 to-transparent",
        modalGlow:
          "shadow-[0_0_0_1px_rgba(244,63,94,0.10),0_0_36px_rgba(244,63,94,0.10),0_30px_100px_rgba(0,0,0,0.68)]",
        sigilText: "text-rose-300/10",
      };
    case "Scouts":
      return {
        softBorder: "border-emerald-700/30",
        softGlow: "shadow-[0_0_24px_rgba(16,185,129,0.12)]",
        bannerText: "text-emerald-100",
        portraitGlow:
          "bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.18),transparent_72%)]",
        accentLine: "from-emerald-500/30 via-emerald-300/40 to-transparent",
        modalGlow:
          "shadow-[0_0_0_1px_rgba(16,185,129,0.10),0_0_36px_rgba(16,185,129,0.10),0_30px_100px_rgba(0,0,0,0.68)]",
        sigilText: "text-emerald-300/10",
      };
    case "Diplomats":
      return {
        softBorder: "border-cyan-700/30",
        softGlow: "shadow-[0_0_24px_rgba(34,211,238,0.12)]",
        bannerText: "text-cyan-100",
        portraitGlow:
          "bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.18),transparent_72%)]",
        accentLine: "from-cyan-500/30 via-cyan-300/40 to-transparent",
        modalGlow:
          "shadow-[0_0_0_1px_rgba(34,211,238,0.10),0_0_36px_rgba(34,211,238,0.10),0_30px_100px_rgba(0,0,0,0.68)]",
        sigilText: "text-cyan-300/10",
      };
    default:
      return {
        softBorder: "border-zinc-700/40",
        softGlow: "",
        bannerText: "text-zinc-100",
        portraitGlow:
          "bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08),transparent_72%)]",
        accentLine: "from-zinc-500/15 via-zinc-300/15 to-transparent",
        modalGlow:
          "shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_30px_100px_rgba(0,0,0,0.68)]",
        sigilText: "text-white/10",
      };
  }
}

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
        "relative overflow-hidden rounded-[26px] border border-zinc-800/90",
        "bg-[linear-gradient(180deg,rgba(30,30,34,0.80),rgba(6,6,8,0.94))]",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_18px_45px_rgba(0,0,0,0.32)]",
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

function InventoryCardTile({
  card,
  selected,
  onSelect,
}: {
  card: InventoryCard;
  selected?: boolean;
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
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-zinc-100">
            {card.name}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
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
          </div>
        </div>

        {card.quantity && card.quantity > 1 ? (
          <span className="shrink-0 rounded-full border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 text-[9px] text-zinc-300">
            x{card.quantity}
          </span>
        ) : null}
      </div>

      <div className="mt-2.5 line-clamp-2 text-[11px] leading-relaxed text-zinc-400">
        {card.effect}
      </div>

      <div className="mt-3 flex flex-wrap gap-1">
        {card.useText ? (
          <span className="rounded-full border border-zinc-700 bg-zinc-900/80 px-1.5 py-0.5 text-[9px] text-zinc-300">
            {card.useText}
          </span>
        ) : null}

        {card.isEquipped ? (
          <span className="rounded-full border border-emerald-800 bg-emerald-950/40 px-1.5 py-0.5 text-[9px] text-emerald-200">
            Equipped
          </span>
        ) : null}

        {card.isConsumed ? (
          <span className="rounded-full border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-[9px] text-zinc-300">
            Used
          </span>
        ) : null}
      </div>
    </button>
  );
}

function InventoryPanel({
  title,
  icon,
  cards,
  selectedCardId,
  onSelectCard,
}: {
  title: "Relics" | "Potions" | "Items" | "Other";
  icon: string;
  cards: InventoryCard[];
  selectedCardId?: string | null;
  onSelectCard?: (card: InventoryCard) => void;
}) {
  return (
    <Panel className="p-4">
      <SectionHeading
        icon={icon}
        title={title}
        right={
          <span className="text-xs font-semibold text-zinc-300">
            {cards.length}
          </span>
        }
      />

      {cards.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 p-4 text-sm italic text-zinc-500">
          {sectionLabel(title)}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2.5 2xl:grid-cols-2">
          {cards.map((card) => (
            <InventoryCardTile
              key={card.id}
              card={card}
              selected={selectedCardId === card.id}
              onSelect={onSelectCard}
            />
          ))}
        </div>
      )}
    </Panel>
  );
}

function HealthPanel({ current, max }: { current: number; max: number }) {
  const pct = Math.max(0, Math.min(1, current / Math.max(1, max)));
  const isDead = current <= 0;
  const fill = isDead ? "rgba(113,113,122,1)" : hpBarColorFromPct(pct);

  return (
    <Panel className="p-4">
      <SectionHeading
        icon="❤️"
        title="Health"
        right={
          <span className="text-sm font-semibold text-zinc-100">
            {current}/{max}
          </span>
        }
      />

      <div className="overflow-hidden rounded-full border border-zinc-800 bg-zinc-950/90 p-[3px] shadow-[inset_0_0_12px_rgba(0,0,0,0.6)]">
        <div className="h-4 overflow-hidden rounded-full bg-zinc-900/60">
          <div
            className="h-full rounded-full transition-[width] duration-300"
            style={{
              width: `${Math.round(pct * 100)}%`,
              backgroundColor: fill,
              boxShadow: isDead ? "none" : `0 0 14px ${fill}66`,
            }}
          />
        </div>
      </div>

      <div className="mt-2 text-[11px] text-zinc-500">
        {isDead ? "Defeated" : `${Math.round(pct * 100)}% vitality remaining`}
      </div>
    </Panel>
  );
}

function SkillsPanel({ skillList }: { skillList: string[] }) {
  return (
    <Panel className="p-4">
      <SectionHeading icon="✨" title="Skills" />

      {skillList.length === 0 ? (
        <div className="text-sm italic text-zinc-500">
          No skills unlocked yet
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {skillList.map((skill) => (
            <span
              key={skill}
              className="rounded-full border border-zinc-700 bg-zinc-900/90 px-2.5 py-1.5 text-[10px] font-medium tracking-[0.05em] text-zinc-200"
            >
              {skill}
            </span>
          ))}
        </div>
      )}
    </Panel>
  );
}

function AttributePanel({ person }: { person: any }) {
  return (
    <Panel className="p-4">
      <SectionHeading icon="⚔️" title="Attributes" />

      <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
        <StatBar label="Strength" value={person.str} />
        <StatBar label="Dexterity" value={person.dex} />
        <StatBar label="Constitution" value={person.con} />
        <StatBar label="Intelligence" value={person.int} />
        <StatBar label="Wisdom" value={person.wis} />
        <StatBar label="Charisma" value={person.cha} />
      </div>
    </Panel>
  );
}

function ItemDetailPanel({
  card,
  onOpenLibrary,
}: {
  card: InventoryCard | null;
  onOpenLibrary?: () => void;
}) {
  const rarity = getItemRarityClasses(card?.rarity);

  return (
    <Panel className="p-4">
      <SectionHeading
        icon="🃏"
        title="Selected Item"
        right={
          onOpenLibrary ? (
            <button
              type="button"
              onClick={onOpenLibrary}
              className="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-zinc-300 transition hover:border-cyan-700/40 hover:text-white"
            >
              Open Library
            </button>
          ) : null
        }
      />

      {!card ? (
        <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 p-6 text-center">
          <div>
            <div className="text-3xl opacity-40">🃏</div>
            <div className="mt-3 text-sm font-medium text-zinc-300">
              Select an item to inspect
            </div>
            <div className="mt-1 text-xs text-zinc-500">
              Click any owned item to view its effect and details.
            </div>
          </div>
        </div>
      ) : (
        <div
          className={`rounded-[24px] border border-zinc-800 bg-[linear-gradient(180deg,rgba(39,39,42,0.95),rgba(9,9,11,0.95))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ${rarity.glow}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">
                  {card.type}
                </div>
                {card.rarity ? (
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] ${rarity.badge}`}
                  >
                    {card.rarity}
                  </span>
                ) : null}
              </div>

              <div className="mt-1 text-xl font-semibold text-zinc-100">
                {card.name}
              </div>
            </div>

            {card.quantity && card.quantity > 1 ? (
              <div className="rounded-full border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-300">
                x{card.quantity}
              </div>
            ) : null}
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
            <div className="flex aspect-[4/5] items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950/70 text-5xl text-zinc-600">
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

            <div className="space-y-4">
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                  Effect
                </div>
                <div className="mt-1 text-sm leading-relaxed text-zinc-300">
                  {card.effect}
                </div>
              </div>

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
                  <div className="mt-1 text-sm text-zinc-300">
                    {card.source}
                  </div>
                </div>
              ) : null}

              {card.lore ? (
                <div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                    Lore
                  </div>
                  <div className="mt-1 text-sm italic leading-relaxed text-zinc-400">
                    {card.lore}
                  </div>
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
                    Used
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}

export default function CharacterProfileModal({
  person,
  open,
  onClose,
  onOpenLibrary,
}: Props) {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

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

  const inventory: InventoryCard[] = useMemo(() => {
    return Array.isArray(person?.inventory) ? person.inventory : [];
  }, [person?.inventory]);

  const groupedInventory = useMemo(
    () => groupInventory(inventory),
    [inventory]
  );
  const allCards = useMemo(() => inventory, [inventory]);

  const selectedCard = useMemo(
    () => allCards.find((c) => c.id === selectedCardId) ?? allCards[0] ?? null,
    [allCards, selectedCardId]
  );

  useEffect(() => {
    if (!open) return;

    if (!allCards.length) {
      setSelectedCardId(null);
      return;
    }

    setSelectedCardId((prev) =>
      prev && allCards.some((c) => c.id === prev) ? prev : allCards[0].id
    );
  }, [open, allCards]);

  if (!open || !person) return null;

  const fullName =
    `${person.first ?? ""} ${person.last ?? ""}`.trim() || "Unnamed Legend";

  const hpBase = Math.max(1, Number(person.baseHP ?? 20));
  const hpCur = Math.max(
    0,
    Math.min(hpBase, Number(person.currentHP ?? hpBase))
  );

  const guildTheme = getGuildTheme(person.guild);

  return (
    <div className="fixed inset-0 z-[100]">
      <button
        aria-label="Close profile"
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      />

      <div className="absolute inset-0 flex items-center justify-center p-3 md:p-5">
        <div
          className={`relative h-[94vh] w-full max-w-[1450px] overflow-hidden rounded-[32px] border border-zinc-800 bg-zinc-950 ${guildTheme.modalGlow}`}
        >
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

          <div className="grid h-full w-full grid-cols-1 gap-4 overflow-auto p-4 xl:grid-cols-[300px_minmax(0,1fr)] xl:overflow-hidden xl:p-5">
            <aside className="flex min-h-0 flex-col gap-4">
              <Panel className="p-5">
                <div className="relative flex justify-center">
                  <div
                    className={`pointer-events-none absolute inset-0 flex items-center justify-center text-[150px] font-black leading-none ${guildTheme.sigilText}`}
                  >
                    {getGuildSigil(person.guild)}
                  </div>

                  <div
                    className={`relative rounded-[30px] p-[5px] ${guildTheme.portraitGlow} ${guildTheme.softGlow}`}
                  >
                    <Avatar
                      name={fullName}
                      src={person.portraitUrl}
                      size={170}
                      className="mx-auto"
                    />
                  </div>
                </div>

                <div className="mt-4 text-center">
                  <div className="text-[1.85rem] font-semibold leading-tight text-zinc-50">
                    {fullName}
                  </div>

                  <div className="mt-3 flex justify-center">
                    <div
                      className={`rounded-full border bg-zinc-900/90 px-4 py-1.5 text-[11px] uppercase tracking-[0.18em] ${guildTheme.softBorder} ${guildTheme.bannerText}`}
                    >
                      {getGuildTitle(person.guild, person.homeroom)}
                    </div>
                  </div>

                  <div className="mt-3 flex justify-center">
                    <span className="inline-flex min-h-[38px] items-center rounded-2xl border border-zinc-800 bg-zinc-900/90 px-4 py-1.5 text-sm font-medium text-zinc-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                      {person.homeroom || "—"}
                    </span>
                  </div>

                  {person.guild ? (
                    <div className="mt-3 flex justify-center">
                      <div
                        className={`inline-flex min-h-[52px] items-center gap-3 rounded-2xl border bg-zinc-900/95 px-4 py-2 ${guildTheme.softBorder} ${guildTheme.softGlow}`}
                      >
                        <GuildBadge guild={person.guild} size={34} />
                        <span
                          className={`text-base font-semibold tracking-[0.08em] leading-none ${guildTheme.bannerText}`}
                        >
                          {person.guild}
                        </span>
                      </div>
                    </div>
                  ) : null}

                  <div
                    className={`mx-auto mt-5 h-px w-24 bg-gradient-to-r ${guildTheme.accentLine}`}
                  />
                </div>
              </Panel>

              <HealthPanel current={hpCur} max={hpBase} />
            </aside>

            <main className="grid min-h-0 grid-cols-1 grid-rows-[auto_auto_minmax(0,1fr)_auto] gap-4 xl:overflow-hidden">
              <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[1.1fr_0.9fr]">
                <AttributePanel person={person} />
                <SkillsPanel skillList={skillList} />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-zinc-800/90 bg-zinc-900/60 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">
                    Inventory
                  </div>
                  <div className="mt-1 text-lg font-semibold text-zinc-100">
                    Relics, Potions, Items, and Other Possessions
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {onOpenLibrary ? (
                    <button
                      type="button"
                      onClick={onOpenLibrary}
                      className="rounded-full border border-cyan-700/40 bg-cyan-950/20 px-3 py-1 text-xs text-cyan-200 transition hover:bg-cyan-900/30"
                    >
                      View Library
                    </button>
                  ) : null}

                  <div className="rounded-full border border-zinc-800 bg-zinc-950/80 px-3 py-1 text-xs text-zinc-300">
                    {inventory.length} total
                  </div>
                </div>
              </div>

              <div className="min-h-0">
                <div className="grid grid-cols-1 gap-4 xl:max-h-full xl:overflow-auto xl:pr-1 2xl:grid-cols-2">
                  <InventoryPanel
                    title="Relics"
                    icon="💠"
                    cards={groupedInventory.relic}
                    selectedCardId={selectedCard?.id ?? null}
                    onSelectCard={(card) => setSelectedCardId(card.id)}
                  />
                  <InventoryPanel
                    title="Potions"
                    icon="🧪"
                    cards={groupedInventory.potion}
                    selectedCardId={selectedCard?.id ?? null}
                    onSelectCard={(card) => setSelectedCardId(card.id)}
                  />
                  <InventoryPanel
                    title="Items"
                    icon="🎒"
                    cards={groupedInventory.item}
                    selectedCardId={selectedCard?.id ?? null}
                    onSelectCard={(card) => setSelectedCardId(card.id)}
                  />
                  <InventoryPanel
                    title="Other"
                    icon="🗝️"
                    cards={groupedInventory.other}
                    selectedCardId={selectedCard?.id ?? null}
                    onSelectCard={(card) => setSelectedCardId(card.id)}
                  />
                </div>
              </div>

              <ItemDetailPanel
                card={selectedCard}
                onOpenLibrary={onOpenLibrary}
              />
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
