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

function normId(id: string | undefined | null) {
  return String(id ?? "")
    .replace(/\u00A0/g, " ")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, "")
    .trim()
    .toUpperCase();
}

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
          const hp = hpMap.get(normId(String(s.id ?? "")));
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
  // - Poll every 25s
  // - ONLY when tab is visible + focused (top window)
  // - Refresh immediately on return/focus
  // =====================
  useEffect(() => {
    if (loading) return;

    let alive = true;

    const shouldPoll = () => {
      // Tab not visible -> don't poll
      if (typeof document !== "undefined" && document.hidden) return false;

      // Not the focused window/tab -> don't poll
      if (
        typeof document !== "undefined" &&
        typeof document.hasFocus === "function"
      ) {
        if (!document.hasFocus()) return false;
      }

      return true;
    };

    const tick = async () => {
      try {
        const hpMap = await fetchHpMap();
        if (!alive) return;

        setStudents((prev) =>
          prev.map((s) => {
            const hp = hpMap.get(normId(String(s.id ?? "")));
            if (!hp) return s;

            // Avoid rerenders if unchanged
            if (s.baseHP === hp.baseHP && s.currentHP === hp.currentHP)
              return s;

            return { ...s, baseHP: hp.baseHP, currentHP: hp.currentHP };
          })
        );
      } catch {
        // silent failure — dashboard still usable
      }
    };

    const wrappedTick = async () => {
      if (!shouldPoll()) return;
      await tick();
    };

    // Do an immediate update if we're actually active
    wrappedTick();

    const INTERVAL = 25_000;
    const t = window.setInterval(wrappedTick, INTERVAL);

    const onReturn = () => {
      if (shouldPoll()) tick();
    };

    document.addEventListener("visibilitychange", onReturn);
    window.addEventListener("focus", onReturn);

    return () => {
      alive = false;
      window.clearInterval(t);
      document.removeEventListener("visibilitychange", onReturn);
      window.removeEventListener("focus", onReturn);
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
      baseHP: Number((s as any).baseHP ?? 20),
      currentHP: Number((s as any).currentHP ?? 20),
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
    for (const s of normalized) if ((s as any).guild) set.add((s as any).guild);
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
      list = list.filter((s) =>
        selectedGuilds.includes(String((s as any).guild ?? ""))
      );
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
        list = list.filter(
          (s) => Number((s as any)[key] ?? 0) >= attrFilterMin
        );
      }
    }

    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((p: any) => {
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
        const guild = String(p.guild || "").toLowerCase();
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
          .sort((a: any, b: any) =>
            `${a.first} ${a.last}`.localeCompare(`${b.first} ${b.last}`)
          );

      case "name-za":
        return list
          .slice()
          .sort((a: any, b: any) =>
            `${b.first} ${b.last}`.localeCompare(`${a.first} ${a.last}`)
          );

      // ✅ HP sorting (max HP is always 20, so "percent" == "current")
      case "hp-desc":
        return list
          .slice()
          .sort((a: any, b: any) => (b.currentHP ?? 0) - (a.currentHP ?? 0));

      case "hp-asc":
        return list
          .slice()
          .sort((a: any, b: any) => (a.currentHP ?? 0) - (b.currentHP ?? 0));

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
            (a: any, b: any) =>
              Number((b as any)[map[sortKey]] ?? 0) -
              Number((a as any)[map[sortKey]] ?? 0)
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
