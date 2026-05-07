// src/App.tsx

import { useEffect, useMemo, useState } from "react";
import AbilitiesDashboard from "./components/AbilitiesDashboard";
import AppTopBar from "./components/AppTopBar";
import CharacterProfileModal from "./components/CharacterProfileModal";
import BattlePage from "./pages/BattlePage";
import CardLibraryPage from "./pages/CardLibraryPage";
import StorePage from "./pages/store/StorePage";
import { loadStudents } from "./data";
import type { Student } from "./types";
import "./index.css";
import { fetchHpMap } from "./hpApi";
import BossDisplayPage from "./pages/battle/BossDisplayPage";

function normId(id: string | undefined | null) {
  return String(id ?? "")
    .replace(/\u00A0/g, " ")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, "")
    .trim()
    .toUpperCase();
}

type ViewMode = "" | "store" | "battle" | "cards" | "boss-display";

export default function App() {
  const view = useMemo<ViewMode>(() => {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("view") || "";
        if (
      raw === "store" ||
      raw === "battle" ||
      raw === "cards" ||
      raw === "boss-display"
    ) {
      return raw;
    }
    return "";
  }, []);

  useEffect(() => {
    if (view === "battle") {
      document.title = "Battle Mode";
      return;
    }

    if (view === "boss-display") {
      document.title = "Boss Display";
      return;
    }

    if (view === "store") {
      document.title = "Store";
      return;
    }

    if (view === "cards") {
      document.title = "Card Library";
      return;
    }

    document.title = "Game Dashboard";
  }, [view]);

  const goToView = (nextView: ViewMode) => {
    const url = new URL(window.location.href);

    if (!nextView) {
      url.searchParams.delete("view");
    } else {
      url.searchParams.set("view", nextView);
    }

    window.location.href = url.toString();
  };

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [selectedHRs, setSelectedHRs] = useState<string[]>([]);
  const [selectedGuilds, setSelectedGuilds] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState("homeroom");
  const [attrFilterKey, setAttrFilterKey] = useState("");
  const [attrFilterMin, setAttrFilterMin] = useState(0);

  const [selectedPerson, setSelectedPerson] = useState<Student | null>(null);

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

  useEffect(() => {
    if (loading) return;

    let alive = true;

    const shouldPoll = () => {
      if (typeof document !== "undefined" && document.hidden) return false;
      if (
        typeof document !== "undefined" &&
        typeof document.hasFocus === "function" &&
        !document.hasFocus()
      ) {
        return false;
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
            if (s.baseHP === hp.baseHP && s.currentHP === hp.currentHP) {
              return s;
            }
            return { ...s, baseHP: hp.baseHP, currentHP: hp.currentHP };
          })
        );
      } catch {
        // keep dashboard usable
      }
    };

    const wrappedTick = async () => {
      if (!shouldPoll()) return;
      await tick();
    };

    wrappedTick();

    const t = window.setInterval(wrappedTick, 25_000);

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

  const homerooms = useMemo(() => {
    const set = new Set<string>();
    for (const s of normalized) {
      if (s.homeroom?.startsWith("8-")) set.add(s.homeroom);
    }
    return Array.from(set).sort((a, b) =>
      a.localeCompare(b, "en", { numeric: true })
    );
  }, [normalized]);

  const guilds = useMemo(() => {
    const set = new Set<string>();
    for (const s of normalized) {
      if ((s as any).guild) set.add((s as any).guild);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "en"));
  }, [normalized]);

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
        const hr = String(p.homeroom || "").toLowerCase();

        return (
          fullA.includes(q) ||
          fullB.includes(q) ||
          skills.includes(q) ||
          guild.includes(q) ||
          hr.includes(q)
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

      case "guild":
        return list.slice().sort((a: any, b: any) =>
          String(a.guild ?? "").localeCompare(String(b.guild ?? ""), "en", {
            sensitivity: "base",
          })
        );

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

  if (view === "battle") {
    return <BattlePage onBack={() => goToView("")} />;
  }

  if (view === "boss-display") {
    return <BossDisplayPage />;
  }

  if (view === "store") {
    return <StorePage onBack={() => goToView("")} />;
  }

  if (view === "cards") {
    return <CardLibraryPage onBack={() => goToView("")} />;
  }

  return (
    <div className="min-h-screen w-full bg-[radial-gradient(circle_at_top,rgba(40,60,120,0.12),transparent_40%),#0a0a0a] text-zinc-100">
      <div className="pointer-events-none fixed inset-0 z-0 hidden lg:block">
        <div className="absolute left-1/2 top-[160px] h-[440px] w-[1100px] -translate-x-1/2 rounded-full bg-cyan-500/[0.035] blur-3xl" />
        <div className="absolute left-[22%] top-[260px] h-[320px] w-[320px] rounded-full bg-violet-500/[0.045] blur-3xl" />
        <div className="absolute right-[18%] top-[340px] h-[360px] w-[360px] rounded-full bg-emerald-500/[0.04] blur-3xl" />
      </div>

      {!selectedPerson && (
        <AppTopBar
          title="Game Dashboard"
          activeView="dashboard"
          onNavigate={(next) => {
            if (next === "dashboard") {
              goToView("");
              return;
            }
            goToView(next);
          }}
        />
      )}

      <main className="relative z-[1] mx-auto w-full max-w-[1900px] px-3 pb-6 pt-4 sm:px-4 lg:px-6">
        {err && (
          <div className="mx-auto mb-4 max-w-[1600px] rounded-xl border border-red-900/50 bg-red-950/40 px-4 py-3 text-red-200">
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
            query={query}
            setQuery={setQuery}
            sortKey={sortKey}
            setSortKey={setSortKey}
            homerooms={homerooms}
            selectedHRs={selectedHRs}
            setSelectedHRs={setSelectedHRs}
            guilds={guilds}
            selectedGuilds={selectedGuilds}
            setSelectedGuilds={setSelectedGuilds}
            attrFilterKey={attrFilterKey}
            setAttrFilterKey={setAttrFilterKey}
            attrFilterMin={attrFilterMin}
            setAttrFilterMin={setAttrFilterMin}
            onSelectPerson={setSelectedPerson}
          />
        )}
      </main>

      <CharacterProfileModal
        person={selectedPerson}
        open={Boolean(selectedPerson)}
        onClose={() => setSelectedPerson(null)}
        allStudents={students}
      />

      <footer className="h-6" />
    </div>
  );
}