import { useEffect, useMemo } from "react";
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

function skillsToArray(skills: any): string[] {
  if (!skills) return [];
  if (Array.isArray(skills)) return skills.filter(Boolean).map(String);
  return String(skills)
    .split(/[,;|]/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

function normalizeInventory(rawInventory: any): InventoryCard[] {
  if (!rawInventory) return [];

  const rawItems = Array.isArray(rawInventory)
    ? rawInventory
    : String(rawInventory)
        .split(/[,;|]/g)
        .map((s) => s.trim())
        .filter(Boolean);

  return rawItems
    .map((entry: any) => {
      if (typeof entry === "string") {
        const trimmed = entry.trim();
        return (
          itemLibraryById[trimmed] ||
          itemLibraryByName[trimmed.toLowerCase()] ||
          null
        );
      }

      if (entry && typeof entry === "object") {
        const rawId = String(entry.id ?? "").trim();
        const rawName = String(entry.name ?? "")
          .trim()
          .toLowerCase();

        const base =
          (rawId ? itemLibraryById[rawId] : null) ||
          (rawName ? itemLibraryByName[rawName] : null);

        if (!base) return null;

        return {
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
        };
      }

      return null;
    })
    .filter(Boolean) as InventoryCard[];
}

function groupInventory(cards: InventoryCard[]) {
  return {
    relic: cards.filter((c) => c.type === "relic"),
    potion: cards.filter((c) => c.type === "potion"),
    item: cards.filter((c) => c.type === "item"),
    other: cards.filter((c) => c.type === "other"),
  };
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
        softGlow: "shadow-[0_0_20px_rgba(245,158,11,0.10)]",
        bannerText: "text-amber-100",
        portraitGlow:
          "bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.14),transparent_72%)]",
        accentLine: "from-amber-500/20 via-amber-300/30 to-transparent",
        sigilText: "text-amber-300/5",
        modalGlow:
          "shadow-[0_0_0_1px_rgba(245,158,11,0.06),0_0_26px_rgba(245,158,11,0.08),0_30px_100px_rgba(0,0,0,0.65)]",
      };
    case "Shadows":
      return {
        softBorder: "border-violet-700/30",
        softGlow: "shadow-[0_0_20px_rgba(168,85,247,0.10)]",
        bannerText: "text-violet-100",
        portraitGlow:
          "bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.14),transparent_72%)]",
        accentLine: "from-violet-500/20 via-violet-300/30 to-transparent",
        sigilText: "text-violet-300/5",
        modalGlow:
          "shadow-[0_0_0_1px_rgba(168,85,247,0.08),0_0_26px_rgba(168,85,247,0.08),0_30px_100px_rgba(0,0,0,0.65)]",
      };
    case "Guardians":
      return {
        softBorder: "border-sky-700/30",
        softGlow: "shadow-[0_0_20px_rgba(56,189,248,0.10)]",
        bannerText: "text-sky-100",
        portraitGlow:
          "bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.14),transparent_72%)]",
        accentLine: "from-sky-500/20 via-sky-300/30 to-transparent",
        sigilText: "text-sky-300/5",
        modalGlow:
          "shadow-[0_0_0_1px_rgba(56,189,248,0.08),0_0_26px_rgba(56,189,248,0.08),0_30px_100px_rgba(0,0,0,0.65)]",
      };
    case "Blades":
      return {
        softBorder: "border-rose-700/30",
        softGlow: "shadow-[0_0_20px_rgba(244,63,94,0.10)]",
        bannerText: "text-rose-100",
        portraitGlow:
          "bg-[radial-gradient(circle_at_center,rgba(244,63,94,0.14),transparent_72%)]",
        accentLine: "from-rose-500/20 via-rose-300/30 to-transparent",
        sigilText: "text-rose-300/5",
        modalGlow:
          "shadow-[0_0_0_1px_rgba(244,63,94,0.08),0_0_26px_rgba(244,63,94,0.08),0_30px_100px_rgba(0,0,0,0.65)]",
      };
    case "Scouts":
      return {
        softBorder: "border-emerald-700/30",
        softGlow: "shadow-[0_0_20px_rgba(16,185,129,0.10)]",
        bannerText: "text-emerald-100",
        portraitGlow:
          "bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.14),transparent_72%)]",
        accentLine: "from-emerald-500/20 via-emerald-300/30 to-transparent",
        sigilText: "text-emerald-300/5",
        modalGlow:
          "shadow-[0_0_0_1px_rgba(16,185,129,0.08),0_0_26px_rgba(16,185,129,0.08),0_30px_100px_rgba(0,0,0,0.65)]",
      };
    case "Diplomats":
      return {
        softBorder: "border-cyan-700/30",
        softGlow: "shadow-[0_0_20px_rgba(34,211,238,0.10)]",
        bannerText: "text-cyan-100",
        portraitGlow:
          "bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.14),transparent_72%)]",
        accentLine: "from-cyan-500/20 via-cyan-300/30 to-transparent",
        sigilText: "text-cyan-300/5",
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
        accentLine: "from-zinc-500/10 via-zinc-300/10 to-transparent",
        sigilText: "text-white/5",
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
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-zinc-500">
        <span className="text-[11px]">{icon}</span>
        <span>{title}</span>
      </div>
      {right ? <div className="text-[10px] text-zinc-500">{right}</div> : null}
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-zinc-800/70" />;
}

function InventoryCardTile({ card }: { card: InventoryCard }) {
  return (
    <button
      type="button"
      className="w-full rounded-2xl bg-zinc-950/50 p-2.5 text-left transition hover:-translate-y-[1px] hover:bg-zinc-900/70"
    >
      {card.imageUrl ? (
        <div className="mb-2 overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-950">
          <img
            src={card.imageUrl}
            alt={card.name}
            className="h-auto w-full object-cover"
            loading="lazy"
          />
        </div>
      ) : null}

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-xs font-semibold text-zinc-100">
            {card.name}
          </div>
          <div className="mt-0.5 text-[9px] uppercase tracking-[0.16em] text-zinc-500">
            {card.type}
          </div>
        </div>

        {card.quantity && card.quantity > 1 ? (
          <span className="rounded-full bg-zinc-900 px-1.5 py-0.5 text-[9px] text-zinc-300">
            x{card.quantity}
          </span>
        ) : null}
      </div>

      <div className="mt-2 line-clamp-2 text-[11px] text-zinc-400">
        {card.effect}
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {card.useText ? (
          <span className="rounded-full bg-zinc-900/80 px-1.5 py-0.5 text-[9px] text-zinc-300">
            {card.useText}
          </span>
        ) : null}

        {card.isEquipped ? (
          <span className="rounded-full bg-emerald-950/40 px-1.5 py-0.5 text-[9px] text-emerald-200">
            Equipped
          </span>
        ) : null}

        {card.isConsumed ? (
          <span className="rounded-full bg-zinc-800 px-1.5 py-0.5 text-[9px] text-zinc-300">
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
}: {
  title: "Relics" | "Potions" | "Items" | "Other";
  icon: string;
  cards: InventoryCard[];
}) {
  return (
    <div className="rounded-3xl bg-zinc-950/16 p-3">
      <SectionHeading icon={icon} title={title} right={cards.length} />

      {cards.length === 0 ? (
        <div className="rounded-2xl bg-zinc-950/35 p-4 text-xs italic text-zinc-500">
          {sectionLabel(title)}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 2xl:grid-cols-2">
          {cards.map((card) => (
            <InventoryCardTile key={card.id} card={card} />
          ))}
        </div>
      )}
    </div>
  );
}

function AttributeSection({ person }: { person: any }) {
  return (
    <section>
      <SectionHeading icon="⚔️" title="Attributes" />
      <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
        <StatBar label="Strength" value={person.str} />
        <StatBar label="Dexterity" value={person.dex} />
        <StatBar label="Constitution" value={person.con} />
        <StatBar label="Intelligence" value={person.int} />
        <StatBar label="Wisdom" value={person.wis} />
        <StatBar label="Charisma" value={person.cha} />
      </div>
    </section>
  );
}

function SkillsSection({ skillList }: { skillList: string[] }) {
  return (
    <section>
      <SectionHeading icon="✨" title="Skills" />
      {skillList.length === 0 ? (
        <div className="rounded-2xl bg-zinc-950/20 p-3 text-xs italic text-zinc-500">
          No skills unlocked yet
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {skillList.map((skill) => (
            <span
              key={skill}
              className="rounded-full bg-zinc-900/80 px-2 py-1 text-[10px] text-zinc-200"
            >
              {skill}
            </span>
          ))}
        </div>
      )}
    </section>
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

  const groupedInventory = useMemo(
    () => groupInventory(inventory),
    [inventory]
  );

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
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="absolute inset-0 flex items-center justify-center p-3">
        <div
          className={`relative flex h-[92vh] w-full max-w-7xl overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/60 ${guildTheme.modalGlow}`}
        >
          <button
            onClick={onClose}
            className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900/85 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
            aria-label="Close"
            title="Close"
          >
            ✕
          </button>

          <div className="grid h-full w-full grid-cols-1 gap-4 overflow-auto p-4 xl:grid-cols-[300px_minmax(0,1fr)] xl:overflow-hidden">
            <aside className="min-h-0">
              <div className="rounded-3xl border border-zinc-800/85 bg-zinc-900/38 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
                <div className="relative flex justify-center">
                  <div
                    className={`pointer-events-none absolute inset-0 flex items-center justify-center text-[120px] font-black leading-none ${guildTheme.sigilText}`}
                  >
                    {getGuildSigil(person.guild)}
                  </div>

                  <div
                    className={`relative h-[186px] w-[186px] overflow-hidden rounded-[30px] bg-zinc-950/70 shadow-[0_8px_24px_rgba(0,0,0,0.35)] ${guildTheme.softGlow}`}
                  >
                    <div
                      className={`absolute inset-0 ${guildTheme.portraitGlow}`}
                    />
                    <div className="relative flex h-full w-full items-center justify-center">
                      <Avatar
                        name={fullName}
                        src={person.portraitUrl}
                        size={186}
                        className="h-full w-full"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-5 text-center">
                  <div className="text-[1.7rem] font-semibold leading-tight tracking-[-0.02em] text-zinc-50">
                    {fullName}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                    <span className="rounded-full bg-zinc-900/80 px-3 py-1 text-[11px] font-medium text-zinc-300">
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
                        className={`inline-flex min-h-[46px] items-center gap-2.5 rounded-2xl bg-zinc-900/85 px-4 py-2 ${guildTheme.softBorder}`}
                      >
                        <GuildBadge guild={person.guild} size={30} />
                        <span
                          className={`text-sm font-semibold tracking-[0.06em] leading-none ${guildTheme.bannerText}`}
                        >
                          {person.guild}
                        </span>
                      </div>
                    </div>
                  ) : null}

                  <div
                    className={`mx-auto mt-5 h-px w-24 bg-gradient-to-r ${guildTheme.accentLine}`}
                  />

                  <div className="mt-5 rounded-2xl bg-zinc-950/22 p-3 text-left">
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
                      <div className="h-3 overflow-hidden rounded-full bg-zinc-900/60">
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
                </div>
              </div>
            </aside>

            <main className="min-h-0 xl:overflow-hidden">
              <div className="h-full rounded-3xl bg-zinc-900/28 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
                <div className="flex h-full min-h-0 flex-col">
                  <AttributeSection person={person} />

                  <div className="my-5">
                    <Divider />
                  </div>

                  <SkillsSection skillList={skillList} />

                  <div className="my-5">
                    <Divider />
                  </div>

                  <div className="min-h-0 flex-1 overflow-auto pr-1">
                    <SectionHeading
                      icon="🎒"
                      title="Inventory"
                      className="mb-3 px-1"
                    />

                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                      <InventoryPanel
                        title="Relics"
                        icon="💠"
                        cards={groupedInventory.relic}
                      />
                      <InventoryPanel
                        title="Potions"
                        icon="🧪"
                        cards={groupedInventory.potion}
                      />
                      <InventoryPanel
                        title="Items"
                        icon="🎒"
                        cards={groupedInventory.item}
                      />
                      <InventoryPanel
                        title="Other"
                        icon="🗝️"
                        cards={groupedInventory.other}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
