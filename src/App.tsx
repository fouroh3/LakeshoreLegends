// src/App.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { loadStudents } from "./data";
import type { Student } from "./types";
import AbilitiesDashboard from "./components/AbilitiesDashboard";
import logo from "./assets/Lakeshore Legends Logo.png";

type Density = "compact" | "ultra";
type SortKey =
  | "homeroom"
  | "name"
  | "str"
  | "dex"
  | "con"
  | "int"
  | "wis"
  | "cha";

/* ─────────────────────────────────────────────
   Lightweight Multi-Select (no dependencies)
   ───────────────────────────────────────────── */
function MultiSelect({
  label,
  options,
  selected,
  onChange,
  widthClass = "w-44",
  placeholder = "All",
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  widthClass?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const allSelected = selected.length === options.length && options.length > 0;
  const summary =
    selected.length === 0
      ? placeholder
      : selected.length === 1
      ? selected[0]
      : `${selected.length} classes`;

  const baseCtl =
    "h-9 text-sm px-3 rounded-md bg-zinc-900 border border-zinc-700";
  const item =
    "px-3 py-2 hover:bg-zinc-800 cursor-pointer flex items-center gap-2";

  const toggle = (opt: string) =>
    selected.includes(opt)
      ? onChange(selected.filter((x) => x !== opt))
      : onChange([...selected, opt]);

  return (
    <div className={`relative ${widthClass}`} ref={ref}>
      <label className="text-xs text-zinc-400 block mb-1">{label}</label>

      <button
        type="button"
        className={`w-full ${baseCtl} text-left relative`}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="block truncate text-zinc-100">{summary}</span>
        <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-zinc-500">
          ▾
        </span>
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-[18rem] rounded-md border border-zinc-700 bg-zinc-900 shadow-xl">
          <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-700">
            <span className="text-xs text-zinc-400">
              {selected.length === 0
                ? "Showing all"
                : `${selected.length} selected`}
            </span>
            <div className="space-x-3">
              <button
                className="text-xs underline text-zinc-300 hover:text-zinc-100"
                onClick={() => onChange(options.slice())}
              >
                Select all
              </button>
              <button
                className="text-xs underline text-zinc-300 hover:text-zinc-100"
                onClick={() => onChange([])}
              >
                Clear
              </button>
            </div>
          </div>

          <ul role="listbox" className="max-h-64 overflow-auto py-1">
            <li
              className={item}
              onClick={() =>
                allSelected ? onChange([]) : onChange(options.slice())
              }
            >
              <input
                type="checkbox"
                readOnly
                checked={allSelected}
                className="h-4 w-4 accent-cyan-500"
              />
              <span className="text-zinc-100">All</span>
            </li>
            {options.map((opt) => {
              const checked = selected.includes(opt);
              return (
                <li key={opt} className={item} onClick={() => toggle(opt)}>
                  <input
                    type="checkbox"
                    readOnly
                    checked={checked}
                    className="h-4 w-4 accent-cyan-500"
                  />
                  <span className="text-zinc-100">{opt}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Controls
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("homeroom");
  const [columns, setColumns] = useState<number>(4);
  const [density, setDensity] = useState<Density>("compact");
  const [selectedHomerooms, setSelectedHomerooms] = useState<string[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await loadStudents();
        setStudents(data);
      } catch (e: any) {
        setError(e?.message ?? "Failed to load students");
      } finally {
        setLoading(false);
      }
    })();
  }, [refreshKey]);

  const homerooms = useMemo(
    () => Array.from(new Set(students.map((s) => s.homeroom))).sort(),
    [students]
  );

  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    let list = students;

    if (selectedHomerooms.length > 0) {
      list = list.filter((s) => selectedHomerooms.includes(s.homeroom));
    }

    if (q) {
      list = list.filter((s) => {
        const full = `${s.first ?? ""} ${s.last ?? ""}`.toLowerCase();
        const skills = Array.isArray(s.skills)
          ? s.skills.join(" ").toLowerCase()
          : String(s.skills ?? "").toLowerCase();
        return (
          full.includes(q) ||
          skills.includes(q) ||
          s.homeroom.toLowerCase().includes(q)
        );
      });
    }

    return [...list].sort((a, b) => {
      if (sortBy === "homeroom") return a.homeroom.localeCompare(b.homeroom);
      if (sortBy === "name") {
        const an = `${a.last ?? ""}, ${a.first ?? ""}`.toLowerCase();
        const bn = `${b.last ?? ""}, ${b.first ?? ""}`.toLowerCase();
        return an.localeCompare(bn);
      }
      return ((b as any)[sortBy] ?? 0) - ((a as any)[sortBy] ?? 0);
    });
  }, [students, selectedHomerooms, q, sortBy]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 grid place-items-center">
        Loading…
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 text-red-400 grid place-items-center">
        {error}
      </div>
    );
  }

  const ctl =
    "w-full h-9 text-sm px-3 rounded-md bg-zinc-900 border border-zinc-700";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Sticky header */}
      <div className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/80 border-b border-zinc-800">
        <div className="mx-auto max-w-7xl px-4">
          {/* Title row */}
          <div className="flex items-center gap-4 py-2.5">
            <img src={logo} alt="Lakeshore Legends" className="h-8 w-auto" />
            <div className="leading-tight">
              <h1 className="text-lg md:text-xl font-semibold tracking-tight">
                Abilities Dashboard
              </h1>
              <div className="text-xs text-zinc-400">
                {filtered.length} students • auto-refreshing
              </div>
            </div>
          </div>

          {/* Controls row */}
          <div className="pb-3">
            {/* Responsive grid for controls.
               The fixed tracks keep alignment even when one control hides. */}
            <div className="grid gap-2.5 items-end grid-cols-1 md:grid-cols-[11rem_1fr_10rem_7rem_9rem_auto]">
              {/* Homeroom multi-select */}
              <MultiSelect
                label="Homeroom"
                options={homerooms}
                selected={selectedHomerooms}
                onChange={setSelectedHomerooms}
                widthClass="w-44"
              />

              {/* Search */}
              <div>
                <label className="sr-only">Search</label>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search name, skill, or homeroom"
                  className={ctl}
                />
              </div>

              {/* Sort (full labels — no abbreviations) */}
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Sort</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortKey)}
                  className={ctl}
                >
                  <option value="homeroom">Homeroom</option>
                  <option value="name">Name</option>
                  <option value="str">Strength</option>
                  <option value="dex">Dexterity</option>
                  <option value="con">Constitution</option>
                  <option value="int">Intelligence</option>
                  <option value="wis">Wisdom</option>
                  <option value="cha">Charisma</option>
                </select>
              </div>

              {/* Columns */}
              <div>
                <label className="text-xs text-zinc-400 block mb-1">
                  Columns
                </label>
                <input
                  type="number"
                  min={1}
                  value={columns}
                  onChange={(e) => setColumns(Number(e.target.value))}
                  className={ctl}
                />
              </div>

              {/* Density (Compact / Ultra) */}
              <div>
                <label className="text-xs text-zinc-400 block mb-1">
                  Density
                </label>
                <select
                  value={density}
                  onChange={(e) => setDensity(e.target.value as Density)}
                  className={ctl}
                >
                  <option value="compact">Compact</option>
                  <option value="ultra">Ultra</option>
                </select>
              </div>

              {/* Refresh */}
              <div className="self-end">
                <button
                  onClick={() => setRefreshKey((k) => k + 1)}
                  className={`${ctl} hover:bg-zinc-800`}
                >
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 pb-8 pt-4">
        <AbilitiesDashboard
          data={filtered}
          columns={columns}
          density={density}
        />
      </div>
    </div>
  );
}
