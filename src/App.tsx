import React, { useEffect, useMemo, useState } from "react";
import AbilitiesDashboard from "./components/AbilitiesDashboard";
import type { Student } from "./types";
import { loadStudents, SHEET_CSV_URL } from "./data";

// NOTE: path includes spaces, which Vite supports
import logoUrl from "./assets/Lakeshore Legends Logo.png";

export default function App() {
  // UI state
  const [query, setQuery] = useState("");
  const [homeroom, setHomeroom] = useState<string | "All">("All");
  const [columns, setColumns] = useState(4);
  const [density, setDensity] = useState<"Comfort" | "Compact" | "Ultra">(
    "Comfort"
  );
  const [sortKey, setSortKey] = useState<"homeroom" | "name">("homeroom");

  // data state
  const [raw, setRaw] = useState<Student[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // load from data.ts (which fetches your published CSV)
  useEffect(() => {
    let alive = true;
    const fetchNow = async () => {
      try {
        const rows = await loadStudents();
        if (!alive) return;
        setRaw(rows || []);
        setError(null);
      } catch (e) {
        console.error(e);
        if (!alive) return;
        setRaw([]);
        setError("Could not load data.");
      }
    };
    fetchNow();
    const id = setInterval(fetchNow, 60_000); // auto-refresh every 60s
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  // derive lists
  const students = useMemo<Student[]>(() => {
    const src = raw || [];
    const cleaned = src.map((s) => ({
      ...s,
      skills: (Array.isArray(s.skills) ? s.skills : `${s.skills || ""}`)
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
    }));

    let out = cleaned;

    if (homeroom !== "All") {
      out = out.filter(
        (s) => (s.homeroom || "").toLowerCase() === homeroom.toLowerCase()
      );
    }

    if (query.trim()) {
      const q = query.toLowerCase();
      out = out.filter((s) => {
        const name = `${s.first} ${s.last}`.toLowerCase();
        const skills = (s.skills as string[]).join(" ").toLowerCase();
        const room = (s.homeroom || "").toLowerCase();
        return name.includes(q) || skills.includes(q) || room.includes(q);
      });
    }

    const collator = new Intl.Collator("en", {
      numeric: true,
      sensitivity: "base",
    });
    out.sort((a, b) => {
      if (sortKey === "homeroom") {
        const hr = collator.compare(a.homeroom || "", b.homeroom || "");
        if (hr !== 0) return hr;
      }
      // name sort fallback
      return collator.compare(`${a.last}, ${a.first}`, `${b.last}, ${b.first}`);
    });

    return out;
  }, [raw, query, homeroom, sortKey]);

  const homerooms = useMemo(() => {
    const set = new Set<string>();
    (raw || []).forEach((s) => s.homeroom && set.add(s.homeroom));
    return Array.from(set).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true })
    );
  }, [raw]);

  // loading / error guards (prevents blank page)
  if (raw === null) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-zinc-300">Loading data…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-zinc-950/80 backdrop-blur border-b border-white/5">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center gap-4">
            <img
              src={logoUrl}
              alt="Lakeshore Legends"
              className="h-10 w-auto select-none"
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
            <div>
              <h1 className="text-2xl font-extrabold">Abilities Dashboard</h1>
              <p className="text-zinc-400 text-sm">
                {students.length} students • auto-refreshing
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {/* Homeroom */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-300">Homeroom</span>
              <select
                className="rounded-lg bg-zinc-900 border border-white/10 px-3 py-2 text-sm"
                value={homeroom}
                onChange={(e) => setHomeroom(e.target.value as any)}
              >
                <option>All</option>
                {homerooms.map((hr) => (
                  <option key={hr}>{hr}</option>
                ))}
              </select>
            </div>

            {/* Search */}
            <input
              className="min-w-[260px] flex-1 rounded-lg bg-zinc-900 border border-white/10 px-3 py-2 text-sm"
              placeholder="Search name, skill, or homeroom"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />

            {/* Sort */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-300">Sort</span>
              <select
                className="rounded-lg bg-zinc-900 border border-white/10 px-3 py-2 text-sm"
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as any)}
              >
                <option value="homeroom">Homeroom</option>
                <option value="name">Name</option>
              </select>
            </div>

            {/* Columns */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-300">Columns</span>
              <input
                type="number"
                min={1}
                max={12}
                className="w-16 rounded-lg bg-zinc-900 border border-white/10 px-3 py-2 text-sm"
                value={columns}
                onChange={(e) =>
                  setColumns(
                    Math.max(1, Math.min(12, Number(e.target.value) || 1))
                  )
                }
              />
            </div>

            {/* Density */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-300">Density</span>
              <select
                className="rounded-lg bg-zinc-900 border border-white/10 px-3 py-2 text-sm"
                value={density}
                onChange={(e) => setDensity(e.target.value as any)}
              >
                <option>Comfort</option>
                <option>Compact</option>
                <option>Ultra</option>
              </select>
            </div>

            <button
              onClick={() => window.location.reload()}
              className="ml-auto rounded bg-zinc-800 px-3 py-2 text-sm hover:bg-zinc-700 transition"
              title={`Reload from ${SHEET_CSV_URL}`}
            >
              Refresh
            </button>
          </div>

          {/* Helpful message if something failed */}
          {error && (
            <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-amber-200 text-sm">
              {error}
              <div className="opacity-80 mt-1">Source: {SHEET_CSV_URL}</div>
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="w-full py-6">
        <div className="bg-zinc-950 w-full overflow-x-auto">
          <div className="px-4">
            {students.length === 0 ? (
              <div className="text-zinc-400 text-sm py-20 text-center">
                No students found. Check filters or sheet content.
              </div>
            ) : (
              <AbilitiesDashboard
                data={students}
                columns={columns}
                density={density}
                // small counts fill the width; large counts scroll
                mode={columns <= 6 ? "auto" : "fixed"}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
