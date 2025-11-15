import AbilitiesGrid from "./AbilitiesGrid";
import AbilityCard from "./AbilityCard";
import type { Student } from "../types";
import { Fragment } from "react";

type Density = "comfortable" | "compact" | "ultra";
type GridMode = "auto" | "fixed";

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
  setDensity,
  setMode,
  setColumns,
  setAutoMinWidth,
}: Props) {
  const toggleHR = (hr: string) => {
    setSelectedHRs(
      selectedHRs.includes(hr)
        ? selectedHRs.filter((h) => h !== hr)
        : [...selectedHRs, hr]
    );
  };

  return (
    <Fragment>
      {/* Controls */}
      <section className="w-full max-w-none px-4 sm:px-6 lg:px-8 py-4 border-b border-zinc-900">
        <div className="flex flex-col gap-4">
          {/* ROW 1–2: Search + Sort / Clear */}
          <div className="w-full flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            {/* Search */}
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:flex-1">
              <label className="text-sm text-zinc-300 text-center sm:text-left sm:mr-3">
                Search
              </label>
              <input
                value={query}
                onChange={(e) => setQuery((e.target as HTMLInputElement).value)}
                placeholder="Type a name, skill, or homeroom (e.g., 8-3)"
                className="w-full sm:flex-1 rounded-xl bg-zinc-900/70 border border-zinc-800 px-3 py-2 outline-none focus:ring-2 focus:ring-cyan-500/40"
              />
            </div>

            {/* Sort + Clear */}
            <div className="flex justify-center sm:justify-end items-center gap-2">
              <label className="text-sm text-zinc-300">Sort</label>
              <select
                value={sortKey}
                onChange={(e) =>
                  setSortKey((e.target as HTMLSelectElement).value)
                }
                className="rounded-xl bg-zinc-900/70 border border-zinc-800 px-3 py-2 text-sm"
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
                onClick={() => setQuery("")}
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
                  setDensity("comfortable");
                  setMode("auto");
                  setColumns(6);
                  setAutoMinWidth(260);
                  setSelectedHRs([]);
                  setSortKey("homeroom");
                }}
                className="rounded-xl border border-zinc-800 bg-zinc-900/70 px-3 py-2 text-sm hover:bg-zinc-800/60"
              >
                Reset View
              </button>
            </div>
          </div>

          {/* ROW 3: Homeroom chips */}
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
                All
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
