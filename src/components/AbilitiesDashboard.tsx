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
  selectedGuilds: string[]; // ⬅️ keep this in Props
  setSelectedGuilds: (g: string[]) => void;
  setDensity: (d: Density) => void;
  setMode: (m: GridMode) => void;
  setColumns: (n: number) => void;
  setAutoMinWidth: (n: number) => void;
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
  // ❌ NOTE: we do NOT destructure selectedGuilds here anymore
  setSelectedGuilds,
  setDensity,
  setMode,
  setColumns,
  setAutoMinWidth,
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

  // Build a flat list of suggestions with type metadata
  const suggestions: SuggestionItem[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const items: SuggestionItem[] = [];
    const seen = new Set<string>(); // avoid duplicates across types

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
    for (const hr of homerooms) {
      if (hr) add(hr, "homeroom");
    }

    // Guilds
    for (const g of guilds) {
      if (g) add(g, "guild");
    }

    // Skills
    for (const s of data) {
      const rawSkills = Array.isArray(s.skills)
        ? s.skills
        : (s.skills ?? "")
            .split(/[;,]/)
            .map((t) => t.trim())
            .filter(Boolean);

      for (const sk of rawSkills) {
        if (sk) add(sk, "skill");
      }
    }

    // Soft cap for sanity
    return items.slice(0, 20);
  }, [query, data, homerooms, guilds]);

  // Group suggestions by type for pretty dropdown
  const grouped = useMemo(() => {
    const byType: Record<SuggestionType, SuggestionItem[]> = {
      name: [],
      homeroom: [],
      guild: [],
      skill: [],
    };
    for (const item of suggestions) {
      byType[item.type].push(item);
    }
    return byType;
  }, [suggestions]);

  const allSuggestions = suggestions; // for keyboard index

  const handleSelectSuggestion = (text: string) => {
    setQuery(text);
    setShowSuggestions(false);
    setActiveIndex(-1);
  };

  const renderHighlighted = (text: string) => {
    const q = query.trim();
    if (!q) return <span>{text}</span>;

    const lower = text.toLowerCase();
    const lowerQ = q.toLowerCase();
    const idx = lower.indexOf(lowerQ);
    if (idx === -1) return <span>{text}</span>;

    const before = text.slice(0, idx);
    const match = text.slice(idx, idx + q.length);
    const after = text.slice(idx + q.length);

    return (
      <span>
        {before}
        <span className="text-cyan-300 font-medium">{match}</span>
        {after}
      </span>
    );
  };

  const sectionMeta: { type: SuggestionType; label: string; icon: string }[] = [
    { type: "name", label: "Names", icon: "🧑‍🎓" },
    { type: "homeroom", label: "Homerooms", icon: "🏫" },
    { type: "guild", label: "Guilds", icon: "🛡️" },
    { type: "skill", label: "Skills", icon: "✨" },
  ];

  return (
    <Fragment>
      {/* Controls */}
      <section className="w-full max-w-none px-4 sm:px-6 lg:px-8 py-4 border-b border-zinc-900">
        <div className="flex flex-col gap-4">
          {/* ROW 1–2: Search + Sort / Clear */}
          <div className="w-full flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            {/* Search */}
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:flex-1 relative">
              <label className="text-sm text-zinc-300 text-center sm:text-left sm:mr-3">
                Search
              </label>
              <div className="relative w-full sm:flex-1">
                {/* Search icon */}
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-zinc-500 text-sm">
                  🔍
                </span>

                <input
                  value={query}
                  onChange={(e) => {
                    const v = (e.target as HTMLInputElement).value;
                    setQuery(v);
                    setShowSuggestions(true);
                    setActiveIndex(-1);
                  }}
                  onFocus={() => {
                    if (allSuggestions.length > 0) setShowSuggestions(true);
                  }}
                  onBlur={() => {
                    // Small delay so clicks on suggestions still register
                    setTimeout(() => setShowSuggestions(false), 100);
                  }}
                  onKeyDown={(e) => {
                    if (!allSuggestions.length) return;

                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setShowSuggestions(true);
                      setActiveIndex((prev) =>
                        prev < allSuggestions.length - 1 ? prev + 1 : 0
                      );
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setShowSuggestions(true);
                      setActiveIndex((prev) =>
                        prev > 0 ? prev - 1 : allSuggestions.length - 1
                      );
                    } else if (e.key === "Enter" && activeIndex >= 0) {
                      e.preventDefault();
                      handleSelectSuggestion(allSuggestions[activeIndex].text);
                    } else if (e.key === "Escape") {
                      setShowSuggestions(false);
                      setActiveIndex(-1);
                    }
                  }}
                  placeholder="Type a name, skill, guild, or homeroom (e.g., Stealth, Shadows, 8-3)"
                  className="w-full rounded-xl bg-zinc-900/70 border border-zinc-800 pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-500/60 focus:border-cyan-400/60"
                />

                {/* Autocomplete dropdown */}
                {showSuggestions && allSuggestions.length > 0 && (
                  <div className="absolute mt-1 w-full max-h-72 overflow-auto rounded-xl border border-zinc-800/80 bg-zinc-950/95 shadow-xl shadow-cyan-900/30 backdrop-blur-sm z-20">
                    {sectionMeta.map(({ type, label, icon }) => {
                      const items = grouped[type];
                      if (!items.length) return null;

                      // Compute the starting index of this section in the flat array
                      const startIndex = allSuggestions.findIndex(
                        (s) => s.type === type && s.text === items[0].text
                      );

                      return (
                        <div key={type} className="pb-1 pt-1.5 first:pt-1">
                          <div className="flex items-center gap-1.5 px-3 pb-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500">
                            <span>{icon}</span>
                            <span>{label}</span>
                          </div>
                          {items.map((item, idx) => {
                            const globalIndex =
                              startIndex === -1 ? -1 : startIndex + idx;
                            const isActive = globalIndex === activeIndex;

                            return (
                              <button
                                key={`${type}-${item.text}-${idx}`}
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault(); // prevent blur before click
                                  handleSelectSuggestion(item.text);
                                }}
                                className={[
                                  "w-full flex items-center justify-between px-3 py-1.5 text-sm transition-colors",
                                  isActive
                                    ? "bg-cyan-600/20 text-cyan-50 border-l-2 border-cyan-400/80"
                                    : "bg-transparent text-zinc-100 hover:bg-zinc-800/60 hover:text-zinc-50",
                                ].join(" ")}
                              >
                                <span className="truncate">
                                  {renderHighlighted(item.text)}
                                </span>
                                <span className="ml-2 text-[0.6rem] uppercase tracking-wide text-zinc-500">
                                  {type === "name"
                                    ? "Name"
                                    : type === "homeroom"
                                    ? "Homeroom"
                                    : type === "guild"
                                    ? "Guild"
                                    : "Skill"}
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

            {/* Sort + Clear */}
            <div className="flex justify-center sm:justify-end items-center gap-2">
              <label className="text-sm text-zinc-300">Sort</label>
              <select
                value={sortKey}
                onChange={(e) =>
                  setSortKey((e.target as HTMLSelectElement).value)
                }
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
          </div>

          {/* ROW 2: View options (Density + Grid + Card width / Columns) + Reset */}
          <div className="w-full flex flex-col gap-3 md:flex-row md:items-center md:justify-center">
            {/* View options group */}
            <div className="w-full md:w-auto flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center">
              {/* Density */}
              <div className="flex items-center gap-2 justify-center">
                <span className="text-sm text-zinc-300">Density</span>
                <div className="inline-flex overflow-hidden rounded-xl border border-zinc-800">
                  {(["comfortable", "compact", "ultra"] as Density[]).map(
                    (d) => (
                      <button
                        key={d}
                        onClick={() => setDensity(d)}
                        className={[
                          "px-3 py-2 text-sm",
                          density === d
                            ? "bg-zinc-800 text-zinc-100"
                            : "bg-zinc-900/70 text-zinc-300 hover:bg-zinc-800/60",
                        ].join(" ")}
                      >
                        {d.charAt(0).toUpperCase() + d.slice(1)}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Grid */}
              <div className="flex items-center gap-2 justify-center">
                <span className="text-sm text-zinc-300">Grid</span>
                <div className="inline-flex overflow-hidden rounded-xl border border-zinc-800">
                  {(["auto", "fixed"] as GridMode[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      className={[
                        "px-3 py-2 text-sm",
                        mode === m
                          ? "bg-zinc-800 text-zinc-100"
                          : "bg-zinc-900/70 text-zinc-300 hover:bg-zinc-800/60",
                      ].join(" ")}
                    >
                      {m === "auto" ? "Responsive" : "Fixed"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Card width / Columns */}
              {mode === "fixed" ? (
                <div className="flex items-center gap-2 justify-center whitespace-nowrap">
                  <label className="text-sm text-zinc-300">Columns</label>
                  <input
                    type="number"
                    min={2}
                    max={16}
                    value={columns}
                    onChange={(e) => {
                      const n = Number((e.target as HTMLInputElement).value);
                      setColumns(Math.min(16, Math.max(2, isNaN(n) ? 2 : n)));
                    }}
                    className="w-20 rounded-xl bg-zinc-900/70 border border-zinc-800 px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-500/40"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2 justify-center whitespace-nowrap">
                  <label className="text-sm text-zinc-300">Card width</label>
                  <input
                    type="range"
                    min={200}
                    max={360}
                    value={autoMinWidth}
                    onChange={(e) =>
                      setAutoMinWidth(
                        Number((e.target as HTMLInputElement).value)
                      )
                    }
                  />
                  <span className="text-xs text-zinc-400 w-10 tabular-nums">
                    {autoMinWidth}px
                  </span>
                </div>
              )}
            </div>

            {/* Reset view */}
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
                }}
                className="rounded-xl border border-zinc-800 bg-zinc-900/70 px-3 py-2 text-sm hover:bg-zinc-800/60"
              >
                Reset View
              </button>
            </div>
          </div>

          {/* Homeroom chips */}
          <div className="w-full">
            <div className="flex flex-wrap gap-1.5 justify-center">
              <button
                onClick={() => setSelectedHRs([])}
                className={[
                  "rounded-full border px-3 py-1 text-sm",
                  selectedHRs.length === 0
                    ? "bg-cyan-600/25 border-cyan-600/50 text-cyan-200"
                    : "bg-zinc-900/60 border-zinc-800 text-zinc-300 hover:bg-zinc-800/60",
                ].join(" ")}
              >
                All Homerooms
              </button>

              {homerooms.map((hr) => {
                const active = selectedHRs.includes(hr);
                return (
                  <button
                    key={hr}
                    onClick={() => toggleHR(hr)}
                    className={[
                      "rounded-full border px-3 py-1 text-sm",
                      active
                        ? "bg-cyan-600/25 border-cyan-600/50 text-cyan-200"
                        : "bg-zinc-900/60 border-zinc-800 text-zinc-300 hover:bg-zinc-800/60",
                    ].join(" ")}
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
              person={p as any}
              density={density}
            />
          ))}
        </AbilitiesGrid>
      </div>
    </Fragment>
  );
}
