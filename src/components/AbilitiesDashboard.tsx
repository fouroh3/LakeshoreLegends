import { Fragment, useMemo, useState } from "react";
import AbilitiesGrid from "./AbilitiesGrid";
import AbilityCard from "./AbilityCard";
import type { Student } from "../types";

type SortKey = string;

type Props = {
  data: Student[];
  query: string;
  setQuery: (value: string) => void;
  sortKey: SortKey;
  setSortKey: (value: string) => void;
  homerooms: string[];
  selectedHRs: string[];
  setSelectedHRs: (value: string[]) => void;
  guilds: string[];
  selectedGuilds: string[];
  setSelectedGuilds: (value: string[]) => void;
  attrFilterKey: string;
  setAttrFilterKey: (value: string) => void;
  attrFilterMin: number;
  setAttrFilterMin: (value: number) => void;
  onSelectPerson: (person: Student) => void;
};

const GUILD_STYLES: Record<
  string,
  {
    active: string;
    idle: string;
    ring: string;
  }
> = {
  blades: {
    active:
      "border-rose-400/40 bg-rose-500/16 text-rose-100 shadow-[0_0_20px_rgba(244,63,94,0.16)]",
    idle: "border-rose-500/20 bg-rose-500/8 text-rose-100/80 hover:bg-rose-500/14",
    ring: "shadow-[inset_0_0_0_1px_rgba(244,63,94,0.12)]",
  },
  diplomats: {
    active:
      "border-cyan-400/40 bg-cyan-500/16 text-cyan-100 shadow-[0_0_20px_rgba(34,211,238,0.16)]",
    idle: "border-cyan-500/20 bg-cyan-500/8 text-cyan-100/80 hover:bg-cyan-500/14",
    ring: "shadow-[inset_0_0_0_1px_rgba(34,211,238,0.12)]",
  },
  guardians: {
    active:
      "border-sky-400/40 bg-sky-500/16 text-sky-100 shadow-[0_0_20px_rgba(56,189,248,0.16)]",
    idle: "border-sky-500/20 bg-sky-500/8 text-sky-100/80 hover:bg-sky-500/14",
    ring: "shadow-[inset_0_0_0_1px_rgba(56,189,248,0.12)]",
  },
  scholars: {
    active:
      "border-amber-400/40 bg-amber-500/16 text-amber-100 shadow-[0_0_20px_rgba(245,158,11,0.16)]",
    idle: "border-amber-500/20 bg-amber-500/8 text-amber-100/80 hover:bg-amber-500/14",
    ring: "shadow-[inset_0_0_0_1px_rgba(245,158,11,0.12)]",
  },
  scouts: {
    active:
      "border-emerald-400/40 bg-emerald-500/16 text-emerald-100 shadow-[0_0_20px_rgba(16,185,129,0.16)]",
    idle: "border-emerald-500/20 bg-emerald-500/8 text-emerald-100/80 hover:bg-emerald-500/14",
    ring: "shadow-[inset_0_0_0_1px_rgba(16,185,129,0.12)]",
  },
  shadows: {
    active:
      "border-violet-400/40 bg-violet-500/16 text-violet-100 shadow-[0_0_20px_rgba(168,85,247,0.16)]",
    idle: "border-violet-500/20 bg-violet-500/8 text-violet-100/80 hover:bg-violet-500/14",
    ring: "shadow-[inset_0_0_0_1px_rgba(168,85,247,0.12)]",
  },
};

function getFullName(student: Student) {
  return `${student.first ?? ""} ${student.last ?? ""}`.trim();
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
      type="button"
      onClick={onClick}
      className={[
        "rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] transition sm:text-[11px]",
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

export default function AbilitiesDashboard({
  data,
  query,
  setQuery,
  sortKey,
  setSortKey,
  homerooms,
  selectedHRs,
  setSelectedHRs,
  guilds,
  selectedGuilds,
  setSelectedGuilds,
  attrFilterKey,
  setAttrFilterKey,
  attrFilterMin,
  setAttrFilterMin,
  onSelectPerson,
}: Props) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const toggleHR = (hr: string) => {
    setSelectedHRs(
      selectedHRs.includes(hr)
        ? selectedHRs.filter((h) => h !== hr)
        : [...selectedHRs, hr]
    );
  };

  const toggleGuild = (guild: string) => {
    setSelectedGuilds(
      selectedGuilds.includes(guild)
        ? selectedGuilds.filter((g) => g !== guild)
        : [...selectedGuilds, guild]
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

  const activeFilterCount =
    selectedHRs.length +
    selectedGuilds.length +
    (query.trim() ? 1 : 0) +
    (attrFilterKey && attrFilterMin > 0 ? 1 : 0);

  const filterStats = useMemo(
    () => [
      { label: "Shown", value: data.length },
      { label: "Active Filters", value: activeFilterCount },
    ],
    [data.length, activeFilterCount]
  );

  return (
    <Fragment>
      <div className="px-3 pt-3 sm:px-4">
        <div className="mx-auto max-w-[1380px]">
          <div className="rounded-[20px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,14,24,0.9),rgba(7,10,18,0.82))] shadow-[0_12px_34px_rgba(0,0,0,0.3)] backdrop-blur-xl">
            <div className="px-3 py-3 sm:px-4 sm:py-3.5">
              <div className="flex flex-col items-center gap-3">
                <div className="flex w-full flex-col items-center justify-center gap-2 lg:flex-row">
                  <div className="w-full max-w-[420px]">
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search player, homeroom, or guild..."
                      autoComplete="on"
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      name="dashboard-search"
                      className="h-10 w-full rounded-full border border-white/10 bg-white/8 px-4 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-cyan-300/35 focus:bg-white/10"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <select
                      value={sortKey}
                      onChange={(e) => setSortKey(e.target.value)}
                      className="h-10 rounded-full border border-white/10 bg-white/8 px-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-white outline-none transition hover:bg-white/10 sm:text-[11px]"
                    >
                      <option value="homeroom">Sort: Homeroom</option>
                      <option value="name-az">Sort: Name A–Z</option>
                      <option value="name-za">Sort: Name Z–A</option>
                      <option value="guild">Sort: Guild</option>
                      <option value="hp-desc">Sort: HP High–Low</option>
                      <option value="hp-asc">Sort: HP Low–High</option>
                      <option value="strength">Sort: Strength</option>
                      <option value="dexterity">Sort: Dexterity</option>
                      <option value="constitution">Sort: Constitution</option>
                      <option value="intelligence">Sort: Intelligence</option>
                      <option value="wisdom">Sort: Wisdom</option>
                      <option value="charisma">Sort: Charisma</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => setAdvancedOpen((prev) => !prev)}
                      className={`h-10 rounded-full border px-4 text-[10px] font-semibold uppercase tracking-[0.16em] transition sm:text-[11px] ${
                        advancedOpen
                          ? "border-cyan-300/35 bg-cyan-400/16 text-cyan-100"
                          : "border-white/10 bg-white/8 text-white/75 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      Advanced
                    </button>

                    <button
                      type="button"
                      onClick={resetFilters}
                      className="h-10 rounded-full border border-white/10 bg-white/8 px-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/75 transition hover:bg-white/10 hover:text-white sm:text-[11px]"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2">
                  {filterStats.map((stat) => (
                    <span
                      key={stat.label}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/65"
                    >
                      {stat.label}: {stat.value}
                    </span>
                  ))}
                </div>

                {advancedOpen && (
                  <div className="w-full rounded-[18px] border border-white/8 bg-black/18 px-3 py-3 sm:px-4">
                    <div className="flex flex-col items-center gap-3">
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
                              type="button"
                              onClick={() => toggleGuild(guild)}
                              className={[
                                "rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] transition sm:text-[11px]",
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

                      <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                        <select
                          value={attrFilterKey}
                          onChange={(e) => setAttrFilterKey(e.target.value)}
                          className="h-10 min-w-[180px] rounded-full border border-white/10 bg-white/8 px-4 text-sm text-white outline-none"
                        >
                          <option value="">Any Attribute</option>
                          <option value="str">Strength</option>
                          <option value="dex">Dexterity</option>
                          <option value="con">Constitution</option>
                          <option value="int">Intelligence</option>
                          <option value="wis">Wisdom</option>
                          <option value="cha">Charisma</option>
                        </select>

                        <input
                          type="number"
                          min={0}
                          value={attrFilterMin}
                          onChange={(e) =>
                            setAttrFilterMin(Number(e.target.value) || 0)
                          }
                          className="h-10 w-[120px] rounded-full border border-white/10 bg-white/8 px-4 text-center text-sm text-white outline-none"
                          placeholder="Min"
                        />

                        <div className="text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">
                          Minimum Attribute Score
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-3 pb-8 pt-4 sm:px-4 sm:pt-5">
        <div className="mx-auto max-w-[1380px]">
          <AbilitiesGrid>
            {data.map((person, index) => (
              <AbilityCard
                key={`${person.id ?? getFullName(person)}-${index}`}
                person={person}
                density="compact"
                onClick={() => onSelectPerson(person)}
              />
            ))}
          </AbilitiesGrid>
        </div>
      </div>
    </Fragment>
  );
}
