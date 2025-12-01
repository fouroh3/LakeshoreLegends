import AbilitiesGrid from "./AbilitiesGrid";
import AbilityCard from "./AbilityCard";
import type { Student } from "../types";
import { Fragment, useMemo, useState } from "react";

type Density = "comfortable" | "compact" | "ultra";
type GridMode = "auto" | "fixed";

type SuggestionType = "name" | "homeroom" | "guild" | "skill";

type SuggestionItem = {
  text: string;
  type: SuggestionType;
};

type Props = {
  data: Student[];
  density: Density;
  mode: GridMode;
  columns: number;
  autoMinWidth: number;
  query: string;
  setQuery: (q: string) => void;
  sortKey: string;
  setSortKey: (k: string) => void;
  homerooms: string[];
  selectedHRs: string[];
  setSelectedHRs: (hrs: string[]) => void;
  guilds: string[];
  selectedGuilds: string[];
  setSelectedGuilds: (g: string[]) => void;
  setDensity: (d: Density) => void;
  setMode: (m: GridMode) => void;
  setColumns: (n: number) => void;
  setAutoMinWidth: (n: number) => void;

  // Battle filter props
  attrFilterKey: string;
  setAttrFilterKey: (k: string) => void;
  attrFilterMin: number;
  setAttrFilterMin: (n: number) => void;
};

export default function AbilitiesDashboard({
  data,
  density,
  mode,
  columns,
  autoMinWidth,
  query,
  setQuery,
  sortKey,
  setSortKey,
  homerooms,
  selectedHRs,
  setSelectedHRs,
  guilds,
  setSelectedGuilds,
  setDensity,
  setMode,
  setColumns,
  setAutoMinWidth,
  attrFilterKey,
  setAttrFilterKey,
  attrFilterMin,
  setAttrFilterMin,
}: Props) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const toggleHR = (hr: string) => {
    setSelectedHRs(
      selectedHRs.includes(hr)
        ? selectedHRs.filter((h) => h !== hr)
        : [...selectedHRs, hr]
    );
  };

  // Suggestions
  const suggestions: SuggestionItem[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const items: SuggestionItem[] = [];
    const seen = new Set<string>();

    const add = (text: string, type: SuggestionType) => {
      const key = `${type}:${text.toLowerCase()}`;
      if (seen.has(key)) return;
      if (!text.toLowerCase().includes(q)) return;
      seen.add(key);
      items.push({ text, type });
    };

    // Names
    for (const s of data) {
      const full = `${s.first ?? ""} ${s.last ?? ""}`.trim();
      if (full) add(full, "name");
    }

    // Homerooms
    for (const hr of homerooms) if (hr) add(hr, "homeroom");

    // Guilds
    for (const g of guilds) if (g) add(g, "guild");

    // Skills
    for (const s of data) {
      const skills = Array.isArray(s.skills)
        ? s.skills
        : (s.skills ?? "")
            .split(/[;,]/)
            .map((t) => t.trim())
            .filter(Boolean);

      for (const sk of skills) if (sk) add(sk, "skill");
    }

    return items.slice(0, 20);
  }, [query, data, homerooms, guilds]);

  const grouped = useMemo(() => {
    const map: Record<SuggestionType, SuggestionItem[]> = {
      name: [],
      homeroom: [],
      guild: [],
      skill: [],
    };
    for (const s of suggestions) map[s.type].push(s);
    return map;
  }, [suggestions]);

  const allSuggestions = suggestions;

  const handleSelectSuggestion = (text: string) => {
    setQuery(text);
    setShowSuggestions(false);
    setActiveIndex(-1);
  };

  const renderHighlighted = (text: string) => {
    const q = query.trim();
    if (!q) return <span>{text}</span>;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return <span>{text}</span>;

    return (
      <>
        {text.slice(0, idx)}
        <span className="text-cyan-300 font-medium">
          {text.slice(idx, idx + q.length)}
        </span>
        {text.slice(idx + q.length)}
      </>
    );
  };

  const sectionMeta = [
    { type: "name", label: "Names", icon: "🧑‍🎓" },
    { type: "homeroom", label: "Homerooms", icon: "🏫" },
    { type: "guild", label: "Guilds", icon: "🛡️" },
    { type: "skill", label: "Skills", icon: "✨" },
  ] as const;

  return (
    <Fragment>
      {/* Controls */}
      <section className="w-full max-w-none px-4 sm:px-6 lg:px-8 py-4 border-b border-zinc-900">
        <div className="flex flex-col gap-4">
          {/* Search + Sort + Battle Filter */}
          <div className="w-full flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
            {/* Search */}
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:flex-1 relative">
              <label className="text-sm text-zinc-300 sm:mr-3">Search</label>

              <div className="relative w-full sm:flex-1">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-zinc-500">
                  🔍
                </span>

                <input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setShowSuggestions(true);
                    setActiveIndex(-1);
                  }}
                  onFocus={() =>
                    allSuggestions.length && setShowSuggestions(true)
                  }
                  onBlur={() =>
                    setTimeout(() => setShowSuggestions(false), 100)
                  }
                  placeholder="Type a name, skill, guild, or homeroom (e.g., Stealth, Shadows, 8-3)"
                  className="w-full rounded-xl bg-zinc-900/70 border border-zinc-800 pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500/60"
                />

                {/* Autocomplete */}
                {showSuggestions && allSuggestions.length > 0 && (
                  <div className="absolute mt-1 w-full max-h-72 overflow-auto rounded-xl border border-zinc-800 bg-zinc-950 shadow-xl z-20">
                    {sectionMeta.map(({ type, label, icon }) => {
                      const items = grouped[type];
                      if (!items.length) return null;

                      const startIndex = allSuggestions.findIndex(
                        (s) => s.type === type && s.text === items[0].text
                      );

                      return (
                        <div key={type} className="pb-1 pt-1.5">
                          <div className="flex items-center gap-1.5 px-3 text-[0.65rem] uppercase text-zinc-500 font-semibold">
                            {icon} {label}
                          </div>

                          {items.map((item, idx) => {
                            const index = startIndex + idx;
                            const active = index === activeIndex;
                            return (
                              <button
                                key={item.text}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  handleSelectSuggestion(item.text);
                                }}
                                className={`w-full flex justify-between px-3 py-1.5 text-sm ${
                                  active
                                    ? "bg-cyan-600/20 text-cyan-50 border-l-2 border-cyan-400"
                                    : "hover:bg-zinc-800/60 text-zinc-100"
                                }`}
                              >
                                <span className="truncate">
                                  {renderHighlighted(item.text)}
                                </span>
                                <span className="ml-2 text-[0.6rem] uppercase text-zinc-500">
                                  {label.slice(0, -1)}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Sort + Clear + Battle Filter */}
            <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-center sm:justify-center sm:gap-3 lg:justify-end">
              {/* Sort + Clear */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-zinc-300">Sort</label>

                <select
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value)}
                  className="rounded-xl bg-zinc-900/70 border border-zinc-800 px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-500/40"
                >
                  <option value="homeroom">Homeroom</option>
                  <option value="name-az">Name (A–Z)</option>
                  <option value="name-za">Name (Z–A)</option>
                  <option value="strength">Strength</option>
                  <option value="dexterity">Dexterity</option>
                  <option value="constitution">Constitution</option>
                  <option value="intelligence">Intelligence</option>
                  <option value="wisdom">Wisdom</option>
                  <option value="charisma">Charisma</option>
                </select>

                <button
                  onClick={() => {
                    setQuery("");
                    setShowSuggestions(false);
                    setActiveIndex(-1);
                  }}
                  className="rounded-xl border border-zinc-800 bg-zinc-900/70 px-3 py-2 text-sm hover:bg-zinc-800/60"
                >
                  Clear
                </button>
              </div>

              {/* Battle Filter */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-zinc-300 whitespace-nowrap">
                  Battle Filter
                </label>

                <select
                  value={attrFilterKey}
                  onChange={(e) => setAttrFilterKey(e.target.value)}
                  className="rounded-xl bg-zinc-900/70 border border-zinc-800 px-2 py-2 text-sm focus:ring-2 focus:ring-cyan-500/40"
                >
                  <option value="">Any attribute</option>
                  <option value="str">Strength</option>
                  <option value="dex">Dexterity</option>
                  <option value="con">Constitution</option>
                  <option value="int">Intelligence</option>
                  <option value="wis">Wisdom</option>
                  <option value="cha">Charisma</option>
                </select>

                <span className="text-xs text-zinc-400">≥</span>

                <input
                  type="number"
                  min={0}
                  max={10}
                  value={attrFilterMin}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    setAttrFilterMin(isNaN(n) ? 0 : n);
                  }}
                  className="w-14 rounded-xl bg-zinc-900/70 border border-zinc-800 px-2 py-1.5 text-sm text-center focus:ring-2 focus:ring-cyan-500/40"
                />
              </div>
            </div>
          </div>

          {/* Density / Grid / Reset */}
          <div className="w-full flex flex-col gap-3 md:flex-row md:items-center md:justify-center">
            <div className="w-full md:w-auto flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
              {/* Density */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-300">Density</span>
                <div className="inline-flex rounded-xl border border-zinc-800 overflow-hidden">
                  {(["comfortable", "compact", "ultra"] as Density[]).map(
                    (d) => (
                      <button
                        key={d}
                        onClick={() => setDensity(d)}
                        className={`px-3 py-2 text-sm ${
                          density === d
                            ? "bg-zinc-800 text-zinc-100"
                            : "bg-zinc-900/70 text-zinc-300 hover:bg-zinc-800/60"
                        }`}
                      >
                        {d.charAt(0).toUpperCase() + d.slice(1)}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Grid mode */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-300">Grid</span>
                <div className="inline-flex rounded-xl border border-zinc-800 overflow-hidden">
                  {(["auto", "fixed"] as GridMode[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      className={`px-3 py-2 text-sm ${
                        mode === m
                          ? "bg-zinc-800 text-zinc-100"
                          : "bg-zinc-900/70 text-zinc-300 hover:bg-zinc-800/60"
                      }`}
                    >
                      {m === "auto" ? "Responsive" : "Fixed"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Card size */}
              {mode === "fixed" ? (
                <div className="flex items-center gap-2">
                  <label className="text-sm text-zinc-300">Columns</label>
                  <input
                    type="number"
                    min={2}
                    max={16}
                    value={columns}
                    onChange={(e) =>
                      setColumns(
                        Math.min(16, Math.max(2, Number(e.target.value) || 2))
                      )
                    }
                    className="w-20 rounded-xl bg-zinc-900/70 border border-zinc-800 px-2 py-2 text-sm"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <label className="text-sm text-zinc-300">Card width</label>
                  <input
                    type="range"
                    min={200}
                    max={360}
                    value={autoMinWidth}
                    onChange={(e) => setAutoMinWidth(Number(e.target.value))}
                  />
                  <span className="text-xs text-zinc-400 w-10">
                    {autoMinWidth}px
                  </span>
                </div>
              )}
            </div>

            {/* Reset */}
            <div className="w-full md:w-auto flex justify-center md:ml-4">
              <button
                onClick={() => {
                  setQuery("");
                  setShowSuggestions(false);
                  setActiveIndex(-1);
                  setDensity("comfortable");
                  setMode("auto");
                  setColumns(6);
                  setAutoMinWidth(260);
                  setSelectedHRs([]);
                  setSelectedGuilds([]);
                  setSortKey("homeroom");
                  setAttrFilterKey("");
                  setAttrFilterMin(0);
                }}
                className="rounded-xl border border-zinc-800 bg-zinc-900/70 px-3 py-2 text-sm hover:bg-zinc-800/60"
              >
                Reset View
              </button>
            </div>
          </div>

          {/* Homerooms */}
          <div className="w-full">
            <div className="flex flex-wrap gap-1.5 justify-center">
              <button
                onClick={() => setSelectedHRs([])}
                className={`rounded-full border px-3 py-1 text-sm ${
                  selectedHRs.length === 0
                    ? "bg-cyan-600/25 border-cyan-600/50 text-cyan-200"
                    : "bg-zinc-900/60 border-zinc-800 text-zinc-300 hover:bg-zinc-800/60"
                }`}
              >
                All Homerooms
              </button>

              {homerooms.map((hr) => {
                const active = selectedHRs.includes(hr);
                return (
                  <button
                    key={hr}
                    onClick={() => toggleHR(hr)}
                    className={`rounded-full border px-3 py-1 text-sm ${
                      active
                        ? "bg-cyan-600/25 border-cyan-600/50 text-cyan-200"
                        : "bg-zinc-900/60 border-zinc-800 text-zinc-300 hover:bg-zinc-800/60"
                    }`}
                  >
                    {hr}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Cards */}
      <div className="w-full max-w-none px-2 sm:px-4 lg:px-6 py-4">
        <AbilitiesGrid
          mode={mode}
          columns={columns}
          autoMinWidth={autoMinWidth}
        >
          {data.map((p, i) => (
            <AbilityCard
              key={p.id ?? `${p.first}-${p.last}-${p.homeroom}-${i}`}
              person={p}
              density={density}
            />
          ))}
        </AbilitiesGrid>
      </div>
    </Fragment>
  );
}
