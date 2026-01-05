// src/App.tsx
import { useEffect, useMemo, useState } from "react";
import AbilitiesDashboard from "./components/AbilitiesDashboard";
import BattlePage from "./pages/BattlePage";
import StorePage from "./pages/StorePage";
import { loadStudents } from "./data";
import type { Student } from "./types";
import logoUrl from "./assets/Lakeshore Legends Logo.png";
import "./index.css";
import { fetchHpMap } from "./hpApi";

type Density = "comfortable" | "compact" | "ultra";
type GridMode = "auto" | "fixed";

export default function App() {
  // ✅ Route switch (dashboard unless ?view=battle or ?view=store)
  const view = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("view") || "";
  }, []);

  // ✅ Set browser tab title ONLY on main dashboard
  useEffect(() => {
    if (!view) {
      document.title = "Game Dashboard";
    }
  }, [view]);

  const goHome = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("view");
    window.location.href = url.toString();
  };

  if (view === "battle") {
    return <BattlePage onBack={goHome} />;
  }

  if (view === "store") {
    return <StorePage onBack={goHome} />;
  }

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // UI state
  const [query, setQuery] = useState("");
  const [density, setDensity] = useState<Density>("comfortable");
  const [mode, setMode] = useState<GridMode>("auto");
  const [columns, setColumns] = useState(6);
  const [autoMinWidth, setAutoMinWidth] = useState(260);
  const [selectedHRs, setSelectedHRs] = useState<string[]>([]);
  const [selectedGuilds, setSelectedGuilds] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState("homeroom");

  // 🔥 Attribute filter
  const [attrFilterKey, setAttrFilterKey] = useState("");
  const [attrFilterMin, setAttrFilterMin] = useState(0);

  // =====================
  // Load students + initial HP
  // =====================
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const data = await loadStudents();
        const hpMap = await fetchHpMap();

        const merged = data.map((s) => {
          const hp = hpMap.get(String(s.id ?? "").toUpperCase());
          return hp
            ? { ...s, baseHP: hp.baseHP, currentHP: hp.currentHP }
            : { ...s };
        });

        if (!alive) return;
        setStudents(merged);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message || "Failed to load students.");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  // =====================
  // Keep HP in sync (dashboard only)
  // =====================
  useEffect(() => {
    if (loading) return;

    let alive = true;

    const tick = async () => {
      try {
        const hpMap = await fetchHpMap();
        if (!alive) return;

        setStudents((prev) =>
          prev.map((s) => {
            const hp = hpMap.get(String(s.id ?? "").toUpperCase());
            if (!hp) return s;
            if (s.baseHP === hp.baseHP && s.currentHP === hp.currentHP)
              return s;
            return { ...s, baseHP: hp.baseHP, currentHP: hp.currentHP };
          })
        );
      } catch {
        // silent failure — dashboard still usable
      }
    };

    tick();
    const t = window.setInterval(tick, 2500);

    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, [loading]);

  // Normalize student fields
  const normalized: Student[] = useMemo(() => {
    return students.map((s) => ({
      ...s,
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
      baseHP: Number(s.baseHP ?? 20),
      currentHP: Number(s.currentHP ?? 20),
    }));
  }, [students]);

  // Homerooms (Grade 8)
  const homerooms = useMemo(() => {
    const set = new Set<string>();
    for (const s of normalized) {
      if (s.homeroom?.startsWith("8-")) set.add(s.homeroom);
    }
    return Array.from(set).sort((a, b) =>
      a.localeCompare(b, "en", { numeric: true })
    );
  }, [normalized]);

  // Guilds
  const guilds = useMemo(() => {
    const set = new Set<string>();
    for (const s of normalized) if (s.guild) set.add(s.guild);
    return Array.from(set).sort((a, b) => a.localeCompare(b, "en"));
  }, [normalized]);

  // =====================
  // Filter + search + sort
  // =====================
  const filtered = useMemo(() => {
    let list = normalized;

    if (selectedHRs.length > 0) {
      list = list.filter((s) => selectedHRs.includes(s.homeroom ?? ""));
    }

    if (selectedGuilds.length > 0) {
      list = list.filter((s) => selectedGuilds.includes(String(s.guild ?? "")));
    }

    if (attrFilterKey) {
      const map: Record<string, keyof Student> = {
        str: "str",
        dex: "dex",
        con: "con",
        int: "int",
        wis: "wis",
        cha: "cha",
      };
      const key = map[attrFilterKey];
      if (key) {
        list = list.filter((s) => Number(s[key] ?? 0) >= attrFilterMin);
      }
    }

    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((p) => {
        const fullA = `${p.first} ${p.last}`.toLowerCase();
        const fullB = `${p.last} ${p.first}`.toLowerCase();
        const skills = (
          Array.isArray(p.skills)
            ? p.skills
            : String(p.skills ?? "")
                .split(/[;,|]/)
                .map((t) => t.trim())
                .filter(Boolean)
        )
          .join(" ")
          .toLowerCase();
        const guild = (p.guild || "").toLowerCase();
        return (
          fullA.includes(q) ||
          fullB.includes(q) ||
          skills.includes(q) ||
          guild.includes(q)
        );
      });
    }

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
        return list
          .slice()
          .sort(
            (a, b) =>
              Number(b[map[sortKey]] ?? 0) - Number(a[map[sortKey]] ?? 0)
          );
      }
      default:
        return list.slice().sort((a, b) =>
          (a.homeroom ?? "").localeCompare(b.homeroom ?? "", "en", {
            numeric: true,
          })
        );
    }
  }, [
    normalized,
    query,
    selectedHRs,
    selectedGuilds,
    sortKey,
    attrFilterKey,
    attrFilterMin,
  ]);

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

          <h1 className="text-xl sm:text-2xl font-bold text-zinc-100">
            Game Dashboard
          </h1>

          <div className="flex-1" />

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const url = new URL(window.location.href);
                url.searchParams.set("view", "store");
                window.location.href = url.toString();
              }}
              className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-900"
            >
              Store
            </button>

            <button
              onClick={() => {
                const url = new URL(window.location.href);
                url.searchParams.set("view", "battle");
                window.location.href = url.toString();
              }}
              className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-900"
            >
              Battle Mode
            </button>

            <div className="text-sm text-zinc-400">
              {loading
                ? "Loading…"
                : err
                ? "Error"
                : `${filtered.length}/${students.length} shown`}
            </div>
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
            guilds={guilds}
            selectedGuilds={selectedGuilds}
            setSelectedGuilds={setSelectedGuilds}
            setSortKey={setSortKey}
            sortKey={sortKey}
            setQuery={setQuery}
            query={query}
            setDensity={setDensity}
            setMode={setMode}
            setColumns={setColumns}
            setAutoMinWidth={setAutoMinWidth}
            attrFilterKey={attrFilterKey}
            setAttrFilterKey={setAttrFilterKey}
            attrFilterMin={attrFilterMin}
            setAttrFilterMin={setAttrFilterMin}
          />
        )}
      </main>

      <footer className="h-6" />
    </div>
  );
}
