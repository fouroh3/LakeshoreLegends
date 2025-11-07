import React, { useEffect, useMemo, useState } from "react";
import AbilitiesDashboard from "./components/AbilitiesDashboard";
import { loadStudents } from "./data";
import type { Student } from "./types";
import logoUrl from "./assets/Lakeshore Legends Logo.png";
import "./index.css";

type Density = "comfortable" | "compact" | "ultra";
type GridMode = "auto" | "fixed";
type SortKey =
  | "nameAZ"
  | "nameZA"
  | "homeroom"
  | "str"
  | "dex"
  | "con"
  | "int"
  | "wis"
  | "cha";

// Fixed Grade 8 homerooms only
const GRADE8_HRS = [
  "8-1",
  "8-2",
  "8-3",
  "8-4",
  "8-5",
  "8-6",
  "8-7",
  "8-8",
  "8-9",
  "8-10",
];

export default function App() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // UI state
  const [query, setQuery] = useState("");
  const [density, setDensity] = useState<Density>("comfortable");
  const [mode, setMode] = useState<GridMode>("auto");
  const [columns, setColumns] = useState<number>(6);
  const [autoMinWidth, setAutoMinWidth] = useState<number>(260);
  const [selectedHRs, setSelectedHRs] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("homeroom");

  useEffect(() => {
    (async () => {
      try {
        const data = await loadStudents();
        setStudents(data);
      } catch (e: any) {
        setErr(e?.message || "Failed to load students.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // normalize skills → string[]
  const normalized: Student[] = useMemo(() => {
    return students.map((s) => ({
      ...s,
      skills: Array.isArray(s.skills)
        ? s.skills
        : (s.skills ?? "")
            .split(/[;,]/)
            .map((t) => t.trim())
            .filter(Boolean),
    }));
  }, [students]);

  // filter (Grade 8 multi-select + search)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = normalized;

    if (selectedHRs.length > 0) {
      const wanted = new Set(
        selectedHRs.map((h) => h.toLowerCase().replace(/\s+/g, ""))
      );
      out = out.filter((p) =>
        wanted.has((p.homeroom || "").toLowerCase().replace(/\s+/g, ""))
      );
    }

    if (!q) return out;

    const looksLikeHomeroom = /^\d{1,2}\s*-\s*\d{1,2}$/.test(q);
    if (looksLikeHomeroom) {
      const normHR = q.replace(/\s+/g, "");
      return out.filter(
        (p) => (p.homeroom || "").toLowerCase().replace(/\s+/g, "") === normHR
      );
    }

    return out.filter((p) => {
      const first = (p.first || "").toLowerCase();
      const last = (p.last || "").toLowerCase();
      const fullA = `${first} ${last}`;
      const fullB = `${last} ${first}`;
      const hr = (p.homeroom || "").toLowerCase();
      const skills = (Array.isArray(p.skills) ? p.skills : [])
        .join(" ")
        .toLowerCase();

      return (
        first.includes(q) ||
        last.includes(q) ||
        fullA.includes(q) ||
        fullB.includes(q) ||
        hr.includes(q) ||
        skills.includes(q)
      );
    });
  }, [normalized, query, selectedHRs]);

  // sort: Name A–Z, Name Z–A, Homeroom, or Abilities (high → low)
  const sorted = useMemo(() => {
    const copy = [...filtered];

    if (sortKey === "nameAZ" || sortKey === "nameZA") {
      copy.sort((a, b) => {
        const na = `${a.first ?? ""} ${a.last ?? ""}`.trim().toLowerCase();
        const nb = `${b.first ?? ""} ${b.last ?? ""}`.trim().toLowerCase();
        const cmp = na.localeCompare(nb);
        return sortKey === "nameAZ" ? cmp : -cmp;
      });
    } else if (sortKey === "homeroom") {
      copy.sort((a, b) =>
        String(a.homeroom ?? "").localeCompare(
          String(b.homeroom ?? ""),
          undefined,
          { numeric: true }
        )
      );
    } else {
      // ability keys: high → low
      copy.sort(
        (a, b) => (b[sortKey] ?? -Infinity) - (a[sortKey] ?? -Infinity)
      );
    }

    return copy;
  }, [filtered, sortKey]);

  function toggleHR(hr: string) {
    setSelectedHRs((prev) =>
      prev.includes(hr) ? prev.filter((h) => h !== hr) : [...prev, hr]
    );
  }

  return (
    <div className="min-h-screen w-full bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="sticky top-0 z-20 backdrop-blur bg-zinc-950/70 border-b border-zinc-800">
        <div className="w-full max-w-none px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-4">
          <img
            src={logoUrl}
            alt="Lakeshore Legends"
            className="h-12 md:h-14 w-auto select-none"
            draggable={false}
          />
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-bold tracking-wide text-zinc-100">
              Abilities Dashboard
            </h1>
            <div className="text-xs md:text-sm text-zinc-400">
              {loading
                ? "Loading…"
                : err
                ? "Error"
                : `${sorted.length} students`}
            </div>
          </div>
          <div className="flex-1" />
          <div className="hidden sm:block text-sm text-zinc-400">
            {loading
              ? "Loading…"
              : err
              ? "Error"
              : `${sorted.length}/${students.length} shown`}
          </div>
        </div>
      </header>

      {/* Controls */}
      <section className="w-full max-w-none px-4 sm:px-6 lg:px-8 py-4 border-b border-zinc-900">
        <div className="flex flex-col gap-3">
          {/* Row 1: Search + Sort */}
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm text-zinc-300">Search</label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type a name, skill, or homeroom (e.g., 8-3)"
              className="flex-1 min-w-[220px] rounded-xl bg-zinc-900/70 border border-zinc-800 px-3 py-2 outline-none focus:ring-2 focus:ring-cyan-500/40"
            />

            <label className="ml-2 text-sm text-zinc-300">Sort</label>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="rounded-xl bg-zinc-900/70 border border-zinc-800 px-3 py-2 text-sm"
            >
              <option value="nameAZ">Name (A–Z)</option>
              <option value="nameZA">Name (Z–A)</option>
              <option value="homeroom">Homeroom</option>
              <option value="str">Strength</option>
              <option value="dex">Dexterity</option>
              <option value="con">Constitution</option>
              <option value="int">Intelligence</option>
              <option value="wis">Wisdom</option>
              <option value="cha">Charisma</option>
            </select>

            <button
              onClick={() => setQuery("")}
              className="ml-2 rounded-xl border border-zinc-800 bg-zinc-900/70 px-3 py-2 text-sm hover:bg-zinc-800/60"
            >
              Clear
            </button>
          </div>

          {/* Row 2: Layout controls */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-zinc-300">Density</span>
            <div className="inline-flex overflow-hidden rounded-xl border border-zinc-800">
              {(["comfortable", "compact", "ultra"] as Density[]).map((d) => (
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
                  {d}
                </button>
              ))}
            </div>

            <span className="ml-2 text-sm text-zinc-300">Grid</span>
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

            {mode === "fixed" ? (
              <div className="flex items-center gap-2 ml-2">
                <label className="text-sm text-zinc-300">Columns</label>
                <input
                  type="number"
                  min={2}
                  max={16}
                  value={columns}
                  onChange={(e) =>
                    setColumns(
                      Math.min(16, Math.max(2, Number(e.target.value) || 0))
                    )
                  }
                  className="w-20 rounded-xl bg-zinc-900/70 border border-zinc-800 px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-500/40"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2 ml-2">
                <label className="text-sm text-zinc-300">Card width</label>
                <input
                  type="range"
                  min={200}
                  max={360}
                  value={autoMinWidth}
                  onChange={(e) => setAutoMinWidth(Number(e.target.value))}
                />
                <span className="text-xs text-zinc-400 w-10 tabular-nums">
                  {autoMinWidth}px
                </span>
              </div>
            )}

            <div className="flex-1" />

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

          {/* Row 3: Grade 8 homeroom chips (multi-select) */}
          <div className="flex flex-wrap gap-1.5">
            {GRADE8_HRS.map((hr) => {
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
      </section>

      {/* Content */}
      <main className="w-full max-w-none px-2 sm:px-4 lg:px-6 py-4">
        {err && (
          <div className="mx-2 mb-4 rounded-xl border border-red-900/50 bg-red-950/40 px-4 py-3 text-red-200">
            {err}
          </div>
        )}

        {loading ? (
          <div className="px-4 py-16 text-center text-zinc-400">
            Loading students…
          </div>
        ) : (
          <AbilitiesDashboard
            data={sorted}
            density={density}
            mode={mode}
            columns={columns}
            autoMinWidth={autoMinWidth}
          />
        )}
      </main>

      <footer className="h-6" />
    </div>
  );
}
