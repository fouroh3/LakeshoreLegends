import { Fragment, useMemo, useState } from "react";
import AbilitiesGrid from "./AbilitiesGrid";
import AbilityCard from "./AbilityCard";
import CharacterProfileModal from "./CharacterProfileModal";
import type { Student } from "../types";

type Props = {
  data: Student[];
};

type SortKey = "homeroom" | "name-az" | "name-za" | "guild";

const GUILD_STYLES: Record<
  string,
  {
    active: string;
    idle: string;
    ring: string;
  }
> = {
  red: {
    active:
      "border-red-400/40 bg-red-500/18 text-red-100 shadow-[0_0_24px_rgba(239,68,68,0.18)]",
    idle: "border-red-500/20 bg-red-500/8 text-red-100/80 hover:bg-red-500/14",
    ring: "shadow-[inset_0_0_0_1px_rgba(239,68,68,0.14)]",
  },
  blue: {
    active:
      "border-sky-400/40 bg-sky-500/18 text-sky-100 shadow-[0_0_24px_rgba(56,189,248,0.18)]",
    idle: "border-sky-500/20 bg-sky-500/8 text-sky-100/80 hover:bg-sky-500/14",
    ring: "shadow-[inset_0_0_0_1px_rgba(56,189,248,0.14)]",
  },
  green: {
    active:
      "border-emerald-400/40 bg-emerald-500/18 text-emerald-100 shadow-[0_0_24px_rgba(16,185,129,0.18)]",
    idle: "border-emerald-500/20 bg-emerald-500/8 text-emerald-100/80 hover:bg-emerald-500/14",
    ring: "shadow-[inset_0_0_0_1px_rgba(16,185,129,0.14)]",
  },
  yellow: {
    active:
      "border-amber-400/40 bg-amber-500/18 text-amber-100 shadow-[0_0_24px_rgba(245,158,11,0.18)]",
    idle: "border-amber-500/20 bg-amber-500/8 text-amber-100/80 hover:bg-amber-500/14",
    ring: "shadow-[inset_0_0_0_1px_rgba(245,158,11,0.14)]",
  },
  purple: {
    active:
      "border-violet-400/40 bg-violet-500/18 text-violet-100 shadow-[0_0_24px_rgba(139,92,246,0.18)]",
    idle: "border-violet-500/20 bg-violet-500/8 text-violet-100/80 hover:bg-violet-500/14",
    ring: "shadow-[inset_0_0_0_1px_rgba(139,92,246,0.14)]",
  },
};

function getFullName(student: Student) {
  return `${student.first ?? ""} ${student.last ?? ""}`.trim();
}

function normalizeText(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function compareMaybeNumberThenText(a: unknown, b: unknown) {
  const aNum = Number(a);
  const bNum = Number(b);

  const aIsNum = !Number.isNaN(aNum) && String(a ?? "").trim() !== "";
  const bIsNum = !Number.isNaN(bNum) && String(b ?? "").trim() !== "";

  if (aIsNum && bIsNum) return aNum - bNum;
  return String(a ?? "").localeCompare(String(b ?? ""), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function PillButton({
  active,
  onClick,
  children,
  className = "",
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "rounded-full border px-3 py-1.5 text-[11px] font-semibold tracking-[0.16em] uppercase transition",
        active
          ? "border-cyan-300/40 bg-cyan-400/16 text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.14)]"
          : "border-white/10 bg-white/6 text-white/72 hover:border-white/20 hover:bg-white/10 hover:text-white",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export default function AbilitiesDashboard({ data }: Props) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("homeroom");

  const [selectedHRs, setSelectedHRs] = useState<string[]>([]);
  const [selectedGuilds, setSelectedGuilds] = useState<string[]>([]);

  const [attrFilterKey, setAttrFilterKey] = useState("");
  const [attrFilterMin, setAttrFilterMin] = useState(0);

  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Student | null>(null);

  const homerooms = useMemo(() => {
    return Array.from(
      new Set(data.map((d) => String(d.homeroom ?? "").trim()).filter(Boolean))
    ).sort((a, b) => compareMaybeNumberThenText(a, b));
  }, [data]);

  const guilds = useMemo(() => {
    return Array.from(
      new Set(data.map((d) => String(d.guild ?? "").trim()).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  }, [data]);

  const toggleHR = (hr: string) => {
    setSelectedHRs((prev) =>
      prev.includes(hr) ? prev.filter((h) => h !== hr) : [...prev, hr]
    );
  };

  const toggleGuild = (guild: string) => {
    setSelectedGuilds((prev) =>
      prev.includes(guild) ? prev.filter((g) => g !== guild) : [...prev, guild]
    );
  };

  const resetFilters = () => {
    setQuery("");
    setSortKey("homeroom");
    setSelectedHRs([]);
    setSelectedGuilds([]);
    setAttrFilterKey("");
    setAttrFilterMin(0);
    setAdvancedOpen(false);
  };

  const filteredData = useMemo(() => {
    let out = [...data];

    if (query.trim()) {
      const q = normalizeText(query);
      out = out.filter((s) => {
        const fullName = getFullName(s).toLowerCase();
        const homeroom = String(s.homeroom ?? "").toLowerCase();
        const guild = String(s.guild ?? "").toLowerCase();
        return (
          fullName.includes(q) || homeroom.includes(q) || guild.includes(q)
        );
      });
    }

    if (selectedHRs.length) {
      out = out.filter((s) => selectedHRs.includes(String(s.homeroom ?? "")));
    }

    if (selectedGuilds.length) {
      out = out.filter((s) => selectedGuilds.includes(String(s.guild ?? "")));
    }

    if (attrFilterKey && attrFilterMin > 0) {
      out = out.filter(
        (s) => Number((s as any)[attrFilterKey] ?? 0) >= attrFilterMin
      );
    }

    return out;
  }, [data, query, selectedHRs, selectedGuilds, attrFilterKey, attrFilterMin]);

  const sortedData = useMemo(() => {
    const arr = [...filteredData];

    arr.sort((a, b) => {
      if (sortKey === "name-az") {
        return getFullName(a).localeCompare(getFullName(b), undefined, {
          sensitivity: "base",
        });
      }

      if (sortKey === "name-za") {
        return getFullName(b).localeCompare(getFullName(a), undefined, {
          sensitivity: "base",
        });
      }

      if (sortKey === "guild") {
        const guildCompare = String(a.guild ?? "").localeCompare(
          String(b.guild ?? ""),
          undefined,
          {
            sensitivity: "base",
          }
        );
        if (guildCompare !== 0) return guildCompare;
        return getFullName(a).localeCompare(getFullName(b), undefined, {
          sensitivity: "base",
        });
      }

      const hrCompare = compareMaybeNumberThenText(a.homeroom, b.homeroom);
      if (hrCompare !== 0) return hrCompare;

      return getFullName(a).localeCompare(getFullName(b), undefined, {
        sensitivity: "base",
      });
    });

    return arr;
  }, [filteredData, sortKey]);

  const activeFilterCount =
    selectedHRs.length +
    selectedGuilds.length +
    (query.trim() ? 1 : 0) +
    (attrFilterKey && attrFilterMin > 0 ? 1 : 0);

  return (
    <Fragment>
      <div className="sticky top-0 z-50 px-3 pt-3 sm:px-4">
        <div className="mx-auto max-w-[1380px]">
          <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,14,24,0.92),rgba(7,10,18,0.84))] shadow-[0_14px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <div className="px-3 py-3 sm:px-4 sm:py-4">
              <div className="flex flex-col items-center gap-3">
                <div className="flex w-full flex-col items-center justify-center gap-2 lg:flex-row">
                  <div className="w-full max-w-[420px]">
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search player, homeroom, or guild..."
                      className="h-11 w-full rounded-full border border-white/10 bg-white/8 px-4 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-cyan-300/35 focus:bg-white/10"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <select
                      value={sortKey}
                      onChange={(e) => setSortKey(e.target.value as SortKey)}
                      className="h-10 rounded-full border border-white/10 bg-white/8 px-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-white outline-none transition hover:bg-white/10"
                    >
                      <option value="homeroom">Sort: Homeroom</option>
                      <option value="name-az">Sort: Name A–Z</option>
                      <option value="name-za">Sort: Name Z–A</option>
                      <option value="guild">Sort: Guild</option>
                    </select>

                    <button
                      onClick={() => setAdvancedOpen((prev) => !prev)}
                      className={`h-10 rounded-full border px-4 text-[11px] font-semibold uppercase tracking-[0.16em] transition ${
                        advancedOpen
                          ? "border-cyan-300/35 bg-cyan-400/16 text-cyan-100"
                          : "border-white/10 bg-white/8 text-white/75 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      Advanced
                    </button>

                    <button
                      onClick={resetFilters}
                      className="h-10 rounded-full border border-white/10 bg-white/8 px-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/75 transition hover:bg-white/10 hover:text-white"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                <div className="flex w-full flex-col items-center gap-2">
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <PillButton
                      active={selectedHRs.length === 0}
                      onClick={() => setSelectedHRs([])}
                    >
                      All Homerooms
                    </PillButton>

                    {homerooms.map((hr) => (
                      <PillButton
                        key={hr}
                        active={selectedHRs.includes(hr)}
                        onClick={() => toggleHR(hr)}
                      >
                        {hr}
                      </PillButton>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <PillButton
                      active={selectedGuilds.length === 0}
                      onClick={() => setSelectedGuilds([])}
                    >
                      All Guilds
                    </PillButton>

                    {guilds.map((guild) => {
                      const key = guild.toLowerCase();
                      const styles = GUILD_STYLES[key];

                      return (
                        <button
                          key={guild}
                          onClick={() => toggleGuild(guild)}
                          className={[
                            "rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] transition",
                            styles
                              ? selectedGuilds.includes(guild)
                                ? `${styles.active} ${styles.ring}`
                                : `${styles.idle} ${styles.ring}`
                              : selectedGuilds.includes(guild)
                              ? "border-white/20 bg-white/16 text-white"
                              : "border-white/10 bg-white/6 text-white/75 hover:bg-white/10 hover:text-white",
                          ].join(" ")}
                        >
                          {guild}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {advancedOpen && (
                  <div className="w-full max-w-[760px] rounded-[20px] border border-white/8 bg-black/18 px-3 py-3 sm:px-4">
                    <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                      <select
                        value={attrFilterKey}
                        onChange={(e) => setAttrFilterKey(e.target.value)}
                        className="h-10 min-w-[160px] rounded-full border border-white/10 bg-white/8 px-4 text-sm text-white outline-none"
                      >
                        <option value="">Any Attribute</option>
                        <option value="str">STR</option>
                        <option value="dex">DEX</option>
                        <option value="con">CON</option>
                        <option value="int">INT</option>
                        <option value="wis">WIS</option>
                        <option value="cha">CHA</option>
                      </select>

                      <input
                        type="number"
                        min={0}
                        value={attrFilterMin}
                        onChange={(e) =>
                          setAttrFilterMin(Number(e.target.value) || 0)
                        }
                        className="h-10 w-[110px] rounded-full border border-white/10 bg-white/8 px-4 text-center text-sm text-white outline-none"
                        placeholder="Min"
                      />

                      <div className="text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">
                        Attribute minimum filter
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">
                  <span>{sortedData.length} shown</span>
                  <span>{data.length} total</span>
                  {activeFilterCount > 0 && (
                    <span>{activeFilterCount} active filters</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-3 pb-8 pt-5 sm:px-4 sm:pt-6">
        <div className="mx-auto max-w-[1380px]">
          <AbilitiesGrid>
            {sortedData.map((person, index) => (
              <AbilityCard
                key={`${person.id ?? getFullName(person)}-${index}`}
                person={person}
                density="compact"
                onClick={() => setSelectedPerson(person)}
              />
            ))}
          </AbilitiesGrid>
        </div>
      </div>

      <CharacterProfileModal
        person={selectedPerson}
        open={!!selectedPerson}
        onClose={() => setSelectedPerson(null)}
      />
    </Fragment>
  );
}
