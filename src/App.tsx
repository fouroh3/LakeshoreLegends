import { useEffect, useMemo, useState } from "react";
import AbilitiesDashboard from "./components/AbilitiesDashboard";
import { loadStudents } from "./data";
import type { Student } from "./types";
import logoUrl from "./assets/Lakeshore Legends Logo.png";
import "./index.css";

type Density = "comfortable" | "compact" | "ultra";
type GridMode = "auto" | "fixed";

export default function App() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // UI state
  const [query, setQuery] = useState<string>("");
  const [density, setDensity] = useState<Density>("comfortable");
  const [mode, setMode] = useState<GridMode>("auto");
  const [columns, setColumns] = useState<number>(6);
  const [autoMinWidth, setAutoMinWidth] = useState<number>(260);
  const [selectedHRs, setSelectedHRs] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<string>("homeroom");

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

  // Normalize skills to string[]
  const normalized: Student[] = useMemo(() => {
    return students.map((s) => ({
      ...s,
      // ensure numbers are numbers at runtime, even if CSV sent strings
      str: Number(s.str ?? 0),
      dex: Number(s.dex ?? 0),
      con: Number(s.con ?? 0),
      int: Number(s.int ?? 0),
      wis: Number(s.wis ?? 0),
      cha: Number(s.cha ?? 0),
      skills: Array.isArray(s.skills)
        ? s.skills
        : (s.skills ?? "")
            .split(/[;,]/)
            .map((t) => t.trim())
            .filter(Boolean),
    }));
  }, [students]);

  // Grade 8 homerooms only
  const homerooms = useMemo(() => {
    const set = new Set<string>();
    for (const s of normalized) {
      if (s.homeroom?.startsWith("8-")) set.add(s.homeroom);
    }
    return Array.from(set).sort((a, b) =>
      a.localeCompare(b, "en", { numeric: true })
    );
  }, [normalized]);

  // Filter + search + sort
  const filtered = useMemo(() => {
    let list = normalized;

    if (selectedHRs.length > 0) {
      list = list.filter((s) => selectedHRs.includes(s.homeroom ?? ""));
    }

    const q = query.trim().toLowerCase();
    if (q) {
      const looksLikeHR = /^\d{1,2}\s*-\s*\d{1,2}$/.test(q);
      if (looksLikeHR) {
        const normHR = q.replace(/\s+/g, "");
        list = list.filter(
          (p) => (p.homeroom || "").toLowerCase().replace(/\s+/g, "") === normHR
        );
      } else {
        list = list.filter((p) => {
          const first = (p.first || "").toLowerCase();
          const last = (p.last || "").toLowerCase();
          const fullA = `${first} ${last}`;
          const fullB = `${last} ${first}`;
          const skills = (Array.isArray(p.skills) ? p.skills : [])
            .join(" ")
            .toLowerCase();
          return (
            first.includes(q) ||
            last.includes(q) ||
            fullA.includes(q) ||
            fullB.includes(q) ||
            skills.includes(q)
          );
        });
      }
    }

    // Sort (force numeric where needed)
    switch (sortKey) {
      case "name-az":
        return list
          .slice()
          .sort((a, b) =>
            `${a.first} ${a.last}`.localeCompare(`${b.first} ${b.last}`)
          );
      case "name-za":
        return list
          .slice()
          .sort((a, b) =>
            `${b.first} ${b.last}`.localeCompare(`${a.first} ${a.last}`)
          );
      case "strength":
      case "dexterity":
      case "constitution":
      case "intelligence":
      case "wisdom":
      case "charisma": {
        const map: Record<string, keyof Student> = {
          strength: "str",
          dexterity: "dex",
          constitution: "con",
          intelligence: "int",
          wisdom: "wis",
          charisma: "cha",
        };
        return list.slice().sort((a, b) => {
          const av = Number(a[map[sortKey]] ?? 0);
          const bv = Number(b[map[sortKey]] ?? 0);
          return bv - av; // high → low
        });
      }
      default:
        return list.slice().sort((a, b) =>
          (a.homeroom ?? "").localeCompare(b.homeroom ?? "", "en", {
            numeric: true,
          })
        );
    }
  }, [normalized, query, selectedHRs, sortKey]);

  return (
    <div className="min-h-screen w-full bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="sticky top-0 z-20 backdrop-blur bg-zinc-950/70 border-b border-zinc-800">
        <div className="w-full px-6 py-4 flex items-center gap-4">
          <img
            src={logoUrl}
            alt="Lakeshore Legends"
            className="h-10 w-auto select-none"
            draggable={false}
          />
          <h1 className="text-lg sm:text-xl font-bold tracking-wide text-zinc-100">
            Abilities Dashboard
          </h1>
          <div className="flex-1" />
          <div className="text-sm text-zinc-400">
            {loading
              ? "Loading…"
              : err
              ? "Error"
              : `${filtered.length}/${students.length} shown`}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="w-full max-w-none px-4 sm:px-6 lg:px-8 py-4">
        {err && (
          <div className="mb-4 rounded-xl border border-red-900/50 bg-red-950/40 px-4 py-3 text-red-200">
            {err}
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center text-zinc-400">
            Loading students…
          </div>
        ) : (
          <AbilitiesDashboard
            data={filtered}
            density={density}
            mode={mode}
            columns={columns}
            autoMinWidth={autoMinWidth}
            selectedHRs={selectedHRs}
            setSelectedHRs={setSelectedHRs}
            homerooms={homerooms}
            setSortKey={setSortKey}
            sortKey={sortKey}
            setQuery={setQuery}
            query={query}
            setDensity={setDensity}
            setMode={setMode}
            setColumns={setColumns}
            setAutoMinWidth={setAutoMinWidth}
          />
        )}
      </main>

      <footer className="h-6" />
    </div>
  );
}
