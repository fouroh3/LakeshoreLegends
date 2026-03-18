import { useEffect, useMemo } from "react";
import Avatar from "./Avatar";
import StatBar from "./StatBar";
import { GuildBadge } from "./GuildBadge";
import { hpBarColorFromPct } from "../utils/hpColor";

type InventoryCardType = "relic" | "potion" | "item" | "pet" | "other";

type InventoryCard = {
  id: string;
  name: string;
  type: InventoryCardType;
  effect: string;
  useText?: string;
  quantity?: number;
  isConsumed?: boolean;
  isEquipped?: boolean;
  imageUrl?: string;
};

type PetCard = {
  id: string;
  name: string;
  effect?: string;
  imageUrl?: string;
};

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

function getGuildTheme(guild?: string) {
  switch ((guild || "").trim()) {
    case "Scholars":
      return {
        softBorder: "border-amber-700/30",
        softGlow: "shadow-[0_0_22px_rgba(245,158,11,0.12)]",
        bannerText: "text-amber-100",
        portraitGlow:
          "bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.18),transparent_72%)]",
        accentLine: "from-amber-500/20 via-amber-300/30 to-transparent",
      };
    case "Shadows":
      return {
        softBorder: "border-violet-700/30",
        softGlow: "shadow-[0_0_22px_rgba(168,85,247,0.14)]",
        bannerText: "text-violet-100",
        portraitGlow:
          "bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.18),transparent_72%)]",
        accentLine: "from-violet-500/20 via-violet-300/30 to-transparent",
      };
    case "Guardians":
      return {
        softBorder: "border-sky-700/30",
        softGlow: "shadow-[0_0_22px_rgba(56,189,248,0.14)]",
        bannerText: "text-sky-100",
        portraitGlow:
          "bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.18),transparent_72%)]",
        accentLine: "from-sky-500/20 via-sky-300/30 to-transparent",
      };
    case "Blades":
      return {
        softBorder: "border-rose-700/30",
        softGlow: "shadow-[0_0_22px_rgba(244,63,94,0.14)]",
        bannerText: "text-rose-100",
        portraitGlow:
          "bg-[radial-gradient(circle_at_center,rgba(244,63,94,0.18),transparent_72%)]",
        accentLine: "from-rose-500/20 via-rose-300/30 to-transparent",
      };
    case "Scouts":
      return {
        softBorder: "border-emerald-700/30",
        softGlow: "shadow-[0_0_22px_rgba(16,185,129,0.14)]",
        bannerText: "text-emerald-100",
        portraitGlow:
          "bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.18),transparent_72%)]",
        accentLine: "from-emerald-500/20 via-emerald-300/30 to-transparent",
      };
    case "Diplomats":
      return {
        softBorder: "border-cyan-700/30",
        softGlow: "shadow-[0_0_22px_rgba(34,211,238,0.14)]",
        bannerText: "text-cyan-100",
        portraitGlow:
          "bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.18),transparent_72%)]",
        accentLine: "from-cyan-500/20 via-cyan-300/30 to-transparent",
      };
    default:
      return {
        softBorder: "border-zinc-700/40",
        softGlow: "",
        bannerText: "text-zinc-100",
        portraitGlow:
          "bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08),transparent_72%)]",
        accentLine: "from-zinc-500/10 via-zinc-300/10 to-transparent",
      };
  }
}

function SectionHeading({
  icon,
  title,
  right,
}: {
  icon: string;
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-zinc-500">
        <span className="text-[11px]">{icon}</span>
        <span>{title}</span>
      </div>
      {right ? <div className="text-[10px] text-zinc-500">{right}</div> : null}
    </div>
  );
}

function InventoryCardTile({ card }: { card: InventoryCard }) {
  return (
    <button
      type="button"
      className="w-full rounded-2xl border border-zinc-800 bg-zinc-950/70 p-2.5 text-left transition hover:-translate-y-[1px] hover:border-cyan-700/50 hover:bg-zinc-900/80"
    >
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
          <span className="rounded-full border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 text-[9px] text-zinc-300">
            x{card.quantity}
          </span>
        ) : null}
      </div>

      <div className="mt-2 line-clamp-2 text-[11px] text-zinc-400">
        {card.effect}
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
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
}: {
  title: "Relics" | "Potions" | "Items" | "Other";
  icon: string;
  cards: InventoryCard[];
}) {
  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
      <SectionHeading icon={icon} title={title} right={cards.length} />

      {cards.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 p-3 text-xs italic text-zinc-500">
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

function PetPanel({ pet }: { pet?: PetCard | null }) {
  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
      <SectionHeading icon="🐾" title="Companion" />

      {!pet ? (
        <div className="flex min-h-[72px] items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 px-3">
          <div className="flex items-center gap-2 text-zinc-500">
            <span className="text-sm opacity-40">🐾</span>
            <span className="text-xs italic">No companion bonded yet</span>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-lg">
            {pet.imageUrl ? (
              <img
                src={pet.imageUrl}
                alt={pet.name}
                className="h-full w-full rounded-xl object-cover"
              />
            ) : (
              <span>🐾</span>
            )}
          </div>

          <div className="min-w-0">
            <div className="text-xs font-semibold text-zinc-100">
              {pet.name}
            </div>
            <div className="truncate text-[11px] text-zinc-400">
              {pet.effect || "A loyal companion joins this legend."}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HealthPanel({ current, max }: { current: number; max: number }) {
  const pct = Math.max(0, Math.min(1, current / Math.max(1, max)));
  const isDead = current <= 0;
  const fill = isDead ? "rgba(113,113,122,1)" : hpBarColorFromPct(pct);

  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
      <SectionHeading
        icon="❤️"
        title="Health"
        right={
          <span className="text-xs font-semibold text-zinc-100">
            {current}/{max}
          </span>
        }
      />

      <div className="overflow-hidden rounded-full border border-zinc-800 bg-zinc-950/80 p-[2px] shadow-[inset_0_0_8px_rgba(0,0,0,0.55)]">
        <div className="h-3 overflow-hidden rounded-full bg-zinc-900/60">
          <div
            className="h-full rounded-full transition-[width] duration-300"
            style={{
              width: `${Math.round(pct * 100)}%`,
              backgroundColor: fill,
              boxShadow: isDead ? "none" : `0 0 10px ${fill}55`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

function SkillsPanel({ skillList }: { skillList: string[] }) {
  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
      <SectionHeading icon="✨" title="Skills" />

      {skillList.length === 0 ? (
        <div className="text-xs italic text-zinc-500">
          No skills unlocked yet
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {skillList.map((skill) => (
            <span
              key={skill}
              className="rounded-full border border-zinc-700 bg-zinc-900/80 px-2 py-1 text-[10px] text-zinc-200"
            >
              {skill}
            </span>
          ))}
        </div>
      )}
    </div>
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

  const inventory: InventoryCard[] = useMemo(() => {
    return Array.isArray(person?.inventory) ? person.inventory : [];
  }, [person?.inventory]);

  const groupedInventory = useMemo(
    () => groupInventory(inventory),
    [inventory]
  );

  const pet: PetCard | null = useMemo(() => {
    if (person?.pet && typeof person.pet === "object") return person.pet;
    return null;
  }, [person?.pet]);

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
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="absolute inset-0 flex items-center justify-center p-3">
        <div className="relative flex h-[92vh] w-full max-w-7xl overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/60">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900/85 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
            aria-label="Close"
            title="Close"
          >
            ✕
          </button>

          <div className="grid h-full w-full grid-cols-1 gap-4 p-4 xl:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="flex min-h-0 flex-col gap-4">
              <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
                <div className="flex justify-center">
                  <div
                    className={`rounded-[30px] p-[4px] ${guildTheme.portraitGlow} ${guildTheme.softGlow}`}
                  >
                    <Avatar
                      name={fullName}
                      src={person.portraitUrl}
                      size={190}
                      className="mx-auto"
                    />
                  </div>
                </div>

                <div className="mt-4 text-center">
                  <div className="text-[1.75rem] font-semibold leading-tight text-zinc-50">
                    {fullName}
                  </div>

                  <div className="mt-3 flex justify-center">
                    <span className="inline-flex min-h-[36px] items-center rounded-2xl border border-zinc-800 bg-zinc-900/80 px-4 py-1.5 text-sm font-medium text-zinc-200">
                      {person.homeroom || "—"}
                    </span>
                  </div>

                  {person.guild ? (
                    <div className="mt-3 flex justify-center">
                      <div
                        className={`inline-flex min-h-[48px] items-center gap-3 rounded-2xl border bg-zinc-900/90 px-4 py-2 ${guildTheme.softBorder} ${guildTheme.softGlow}`}
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
                    className={`mx-auto mt-4 h-px w-24 bg-gradient-to-r ${guildTheme.accentLine}`}
                  />
                </div>
              </div>

              <HealthPanel current={hpCur} max={hpBase} />
              <PetPanel pet={pet} />
            </aside>

            <main className="grid min-h-0 grid-cols-1 grid-rows-[auto_auto_auto_minmax(0,1fr)] gap-3">
              <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
                <SectionHeading icon="⚔️" title="Attributes" />

                <div className="grid grid-cols-1 gap-x-3 gap-y-2 sm:grid-cols-2">
                  <StatBar label="Strength" value={person.str} />
                  <StatBar label="Dexterity" value={person.dex} />
                  <StatBar label="Constitution" value={person.con} />
                  <StatBar label="Intelligence" value={person.int} />
                  <StatBar label="Wisdom" value={person.wis} />
                  <StatBar label="Charisma" value={person.cha} />
                </div>
              </div>

              <SkillsPanel skillList={skillList} />

              <div className="min-h-0 overflow-hidden">
                <div className="grid h-full grid-cols-1 gap-3 xl:grid-cols-2">
                  <div className="min-h-0 overflow-auto pr-1">
                    <InventoryPanel
                      title="Relics"
                      icon="💠"
                      cards={groupedInventory.relic}
                    />
                  </div>
                  <div className="min-h-0 overflow-auto pr-1">
                    <InventoryPanel
                      title="Potions"
                      icon="🧪"
                      cards={groupedInventory.potion}
                    />
                  </div>
                  <div className="min-h-0 overflow-auto pr-1">
                    <InventoryPanel
                      title="Items"
                      icon="🎒"
                      cards={groupedInventory.item}
                    />
                  </div>
                  <div className="min-h-0 overflow-auto pr-1">
                    <InventoryPanel
                      title="Other"
                      icon="🗝️"
                      cards={groupedInventory.other}
                    />
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
