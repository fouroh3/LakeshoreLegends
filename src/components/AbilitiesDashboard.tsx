import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import AbilitiesGrid from "./AbilitiesGrid";
import AbilityCard from "./AbilityCard";
import type { Student } from "../types";

type SortKey = string;

type Props = {
  data: Student[];
  query: string;
  setQuery: (value: string) => void;
  sortKey: SortKey;
  setSortKey: (value: string) => void;
  homerooms: string[];
  selectedHRs: string[];
  setSelectedHRs: (value: string[]) => void;
  guilds: string[];
  selectedGuilds: string[];
  setSelectedGuilds: (value: string[]) => void;
  attrFilterKey: string;
  setAttrFilterKey: (value: string) => void;
  attrFilterMin: number;
  setAttrFilterMin: (value: number) => void;
  onSelectPerson: (person: Student) => void;
};

type SuggestionType = "player" | "homeroom" | "guild" | "skill";

type SearchSuggestion = {
  id: string;
  type: SuggestionType;
  label: string;
  sublabel: string;
  value: string;
  guildKey?: string;
  person?: Student;
  score: number;
};

const GUILD_STYLES: Record<
  string,
  {
    active: string;
    idle: string;
    ring: string;
    suggestion: string;
    suggestionActive: string;
    badge: string;
  }
> = {
  blades: {
    active:
      "border-rose-400/40 bg-rose-500/16 text-rose-100 shadow-[0_0_20px_rgba(244,63,94,0.16)]",
    idle: "border-rose-500/20 bg-rose-500/8 text-rose-100/80 hover:bg-rose-500/14",
    ring: "shadow-[inset_0_0_0_1px_rgba(244,63,94,0.12)]",
    suggestion:
      "border-rose-400/10 bg-rose-500/[0.06] hover:border-rose-300/20 hover:bg-rose-500/[0.11]",
    suggestionActive:
      "border-rose-300/30 bg-rose-500/[0.16] shadow-[0_0_20px_rgba(244,63,94,0.12)]",
    badge: "border-rose-300/20 bg-rose-500/10 text-rose-100/85",
  },
  diplomats: {
    active:
      "border-cyan-400/40 bg-cyan-500/16 text-cyan-100 shadow-[0_0_20px_rgba(34,211,238,0.16)]",
    idle: "border-cyan-500/20 bg-cyan-500/8 text-cyan-100/80 hover:bg-cyan-500/14",
    ring: "shadow-[inset_0_0_0_1px_rgba(34,211,238,0.12)]",
    suggestion:
      "border-cyan-400/10 bg-cyan-500/[0.06] hover:border-cyan-300/20 hover:bg-cyan-500/[0.11]",
    suggestionActive:
      "border-cyan-300/30 bg-cyan-500/[0.16] shadow-[0_0_20px_rgba(34,211,238,0.12)]",
    badge: "border-cyan-300/20 bg-cyan-500/10 text-cyan-100/85",
  },
  guardians: {
    active:
      "border-sky-400/40 bg-sky-500/16 text-sky-100 shadow-[0_0_20px_rgba(56,189,248,0.16)]",
    idle: "border-sky-500/20 bg-sky-500/8 text-sky-100/80 hover:bg-sky-500/14",
    ring: "shadow-[inset_0_0_0_1px_rgba(56,189,248,0.12)]",
    suggestion:
      "border-sky-400/10 bg-sky-500/[0.06] hover:border-sky-300/20 hover:bg-sky-500/[0.11]",
    suggestionActive:
      "border-sky-300/30 bg-sky-500/[0.16] shadow-[0_0_20px_rgba(56,189,248,0.12)]",
    badge: "border-sky-300/20 bg-sky-500/10 text-sky-100/85",
  },
  scholars: {
    active:
      "border-amber-400/40 bg-amber-500/16 text-amber-100 shadow-[0_0_20px_rgba(245,158,11,0.16)]",
    idle: "border-amber-500/20 bg-amber-500/8 text-amber-100/80 hover:bg-amber-500/14",
    ring: "shadow-[inset_0_0_0_1px_rgba(245,158,11,0.12)]",
    suggestion:
      "border-amber-400/10 bg-amber-500/[0.06] hover:border-amber-300/20 hover:bg-amber-500/[0.11]",
    suggestionActive:
      "border-amber-300/30 bg-amber-500/[0.16] shadow-[0_0_20px_rgba(245,158,11,0.12)]",
    badge: "border-amber-300/20 bg-amber-500/10 text-amber-100/85",
  },
  scouts: {
    active:
      "border-emerald-400/40 bg-emerald-500/16 text-emerald-100 shadow-[0_0_20px_rgba(16,185,129,0.16)]",
    idle: "border-emerald-500/20 bg-emerald-500/8 text-emerald-100/80 hover:bg-emerald-500/14",
    ring: "shadow-[inset_0_0_0_1px_rgba(16,185,129,0.12)]",
    suggestion:
      "border-emerald-400/10 bg-emerald-500/[0.06] hover:border-emerald-300/20 hover:bg-emerald-500/[0.11]",
    suggestionActive:
      "border-emerald-300/30 bg-emerald-500/[0.16] shadow-[0_0_20px_rgba(16,185,129,0.12)]",
    badge: "border-emerald-300/20 bg-emerald-500/10 text-emerald-100/85",
  },
  shadows: {
    active:
      "border-violet-400/40 bg-violet-500/16 text-violet-100 shadow-[0_0_20px_rgba(168,85,247,0.16)]",
    idle: "border-violet-500/20 bg-violet-500/8 text-violet-100/80 hover:bg-violet-500/14",
    ring: "shadow-[inset_0_0_0_1px_rgba(168,85,247,0.12)]",
    suggestion:
      "border-violet-400/10 bg-violet-500/[0.06] hover:border-violet-300/20 hover:bg-violet-500/[0.11]",
    suggestionActive:
      "border-violet-300/30 bg-violet-500/[0.16] shadow-[0_0_20px_rgba(168,85,247,0.12)]",
    badge: "border-violet-300/20 bg-violet-500/10 text-violet-100/85",
  },
};

function normalize(value: string) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function getFullName(student: Student) {
  const row = student as Record<string, unknown>;
  return `${String(row.first ?? "")} ${String(row.last ?? "")}`.trim();
}

function getLastName(student: Student) {
  const row = student as Record<string, unknown>;
  return String(row.last ?? "").trim();
}

function getFirstName(student: Student) {
  const row = student as Record<string, unknown>;
  return String(row.first ?? "").trim();
}

function getHomeroom(student: Student) {
  return String((student as Record<string, unknown>).homeroom ?? "").trim();
}

function getGuild(student: Student) {
  return String((student as Record<string, unknown>).guild ?? "").trim();
}

function getGuildKey(student: Student) {
  return normalize(getGuild(student));
}

function getStudentId(student: Student, index: number) {
  const row = student as Record<string, unknown>;
  return String(row.id ?? `${getFullName(student)}-${index}`);
}

function compareHomeroom(a: string, b: string) {
  const parseHomeroom = (value: string) => {
    const text = String(value ?? "").trim();

    const dashed = text.match(/^(\d+)\s*-\s*(\d+)$/);
    if (dashed) {
      return {
        grade: Number(dashed[1]),
        room: Number(dashed[2]),
        text,
      };
    }

    const compact = text.match(/^(\d)(\d{1,2})$/);
    if (compact) {
      return {
        grade: Number(compact[1]),
        room: Number(compact[2]),
        text,
      };
    }

    const num = Number(text);
    if (Number.isFinite(num)) {
      return {
        grade: 0,
        room: num,
        text,
      };
    }

    return {
      grade: Number.POSITIVE_INFINITY,
      room: Number.POSITIVE_INFINITY,
      text,
    };
  };

  const aParsed = parseHomeroom(a);
  const bParsed = parseHomeroom(b);

  if (aParsed.grade !== bParsed.grade) {
    return aParsed.grade - bParsed.grade;
  }

  if (aParsed.room !== bParsed.room) {
    return aParsed.room - bParsed.room;
  }

  return aParsed.text.localeCompare(bParsed.text);
}

function skillsToArray(student: Student): string[] {
  const row = student as Record<string, unknown>;

  const candidates = [
    row.skills,
    row.skill,
    row.skillList,
    row.skillNames,
    row.abilities,
    row.ability,
  ];

  const out: string[] = [];

  for (const value of candidates) {
    if (!value) continue;

    if (Array.isArray(value)) {
      for (const item of value) {
        const s = String(item ?? "").trim();
        if (s) out.push(s);
      }
      continue;
    }

    const text = String(value).trim();
    if (!text) continue;

    text
      .split(/[,;|/]/g)
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((s) => out.push(s));
  }

  return Array.from(new Set(out));
}

function matchesSearch(student: Student, rawQuery: string) {
  const q = normalize(rawQuery);
  if (!q) return true;

  const fullName = normalize(getFullName(student));
  const homeroom = normalize(getHomeroom(student));
  const guild = normalize(getGuild(student));
  const skills = skillsToArray(student).map(normalize);

  return (
    fullName.includes(q) ||
    homeroom.includes(q) ||
    guild.includes(q) ||
    skills.some((skill) => skill.includes(q))
  );
}

function matchesAttr(
  student: Student,
  attrFilterKey: string,
  attrFilterMin: number
) {
  if (!attrFilterKey || attrFilterMin <= 0) return true;

  const row = student as Record<string, unknown>;
  const value = Number(row[attrFilterKey] ?? 0);
  return value >= attrFilterMin;
}

function compareBySort(a: Student, b: Student, sortKey: string) {
  const aRow = a as Record<string, unknown>;
  const bRow = b as Record<string, unknown>;

  const aFirst = getFirstName(a).toLowerCase();
  const bFirst = getFirstName(b).toLowerCase();
  const aLast = getLastName(a).toLowerCase();
  const bLast = getLastName(b).toLowerCase();
  const aGuild = getGuild(a).toLowerCase();
  const bGuild = getGuild(b).toLowerCase();
  const aHomeroom = getHomeroom(a);
  const bHomeroom = getHomeroom(b);

  const compareName = () =>
    aLast.localeCompare(bLast) || aFirst.localeCompare(bFirst);

  const num = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  switch (sortKey) {
    case "name-az":
      return compareName();
    case "name-za":
      return bLast.localeCompare(aLast) || bFirst.localeCompare(aFirst);
    case "guild":
      return aGuild.localeCompare(bGuild) || compareName();
    case "hp-desc":
      return num(bRow.hp) - num(aRow.hp) || compareName();
    case "hp-asc":
      return num(aRow.hp) - num(bRow.hp) || compareName();
    case "strength":
    case "dexterity":
    case "constitution":
    case "intelligence":
    case "wisdom":
    case "charisma":
      return num(bRow[sortKey]) - num(aRow[sortKey]) || compareName();
    case "homeroom":
    default:
      return compareHomeroom(aHomeroom, bHomeroom) || compareName();
  }
}

function PillButton({
  active,
  onClick,
  children,
  className = "",
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] transition sm:text-[11px]",
        active
          ? "border-cyan-300/40 bg-cyan-400/16 text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.14)]"
          : "border-white/10 bg-white/6 text-white/72 hover:border-white/20 hover:bg-white/10 hover:text-white",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function sectionMeta(type: SuggestionType) {
  switch (type) {
    case "player":
      return { title: "Players", badge: "Player" };
    case "homeroom":
      return { title: "Homerooms", badge: "Homeroom" };
    case "guild":
      return { title: "Guilds", badge: "Guild" };
    case "skill":
      return { title: "Skills", badge: "Skill" };
  }
}

export default function AbilitiesDashboard({
  data,
  query,
  setQuery,
  sortKey,
  setSortKey,
  homerooms,
  selectedHRs,
  setSelectedHRs,
  guilds,
  selectedGuilds,
  setSelectedGuilds,
  attrFilterKey,
  setAttrFilterKey,
  attrFilterMin,
  setAttrFilterMin,
  onSelectPerson,
}: Props) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const searchWrapRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const toggleHR = (hr: string) => {
    setSelectedHRs(
      selectedHRs.includes(hr)
        ? selectedHRs.filter((h) => h !== hr)
        : [...selectedHRs, hr]
    );
  };

  const toggleGuild = (guild: string) => {
    setSelectedGuilds(
      selectedGuilds.includes(guild)
        ? selectedGuilds.filter((g) => g !== guild)
        : [...selectedGuilds, guild]
    );
  };

  const resetFilters = () => {
    setQuery("");
    setSortKey("homeroom");
    setSelectedHRs([]);
    setSelectedGuilds([]);
    setAttrFilterKey("");
    setAttrFilterMin(0);
    setAdvancedOpen(false);
    setSearchOpen(false);
    setHighlightedIndex(0);
  };

  const visibleData = useMemo(() => {
    return [...data]
      .filter((student) => {
        const hrOk =
          selectedHRs.length === 0 ||
          selectedHRs.includes(getHomeroom(student));
        const guildOk =
          selectedGuilds.length === 0 ||
          selectedGuilds.includes(getGuild(student));
        const searchOk = matchesSearch(student, query);
        const attrOk = matchesAttr(student, attrFilterKey, attrFilterMin);

        return hrOk && guildOk && searchOk && attrOk;
      })
      .sort((a, b) => compareBySort(a, b, sortKey));
  }, [
    data,
    selectedHRs,
    selectedGuilds,
    query,
    attrFilterKey,
    attrFilterMin,
    sortKey,
  ]);

  const activeFilterCount =
    selectedHRs.length +
    selectedGuilds.length +
    (query.trim() ? 1 : 0) +
    (attrFilterKey && attrFilterMin > 0 ? 1 : 0);

  const filterStats = useMemo(
    () => [
      { label: "Shown", value: visibleData.length },
      { label: "Active Filters", value: activeFilterCount },
    ],
    [visibleData.length, activeFilterCount]
  );

  const searchSuggestions = useMemo<SearchSuggestion[]>(() => {
    const q = normalize(query);
    if (!q) return [];

    const suggestions: SearchSuggestion[] = [];
    const seen = new Set<string>();

    const pushUnique = (item: SearchSuggestion) => {
      const key = `${item.type}:${normalize(item.value)}:${item.id}`;
      if (seen.has(key)) return;
      seen.add(key);
      suggestions.push(item);
    };

    data.forEach((person, index) => {
      const fullName = getFullName(person);
      if (!fullName) return;

      const homeroom = getHomeroom(person);
      const guild = getGuild(person);
      const guildKey = getGuildKey(person);

      const fullNameN = normalize(fullName);

      let score = -1;
      if (fullNameN === q) score = 120;
      else if (fullNameN.startsWith(q)) score = 110;
      else if (fullNameN.includes(q)) score = 100;

      if (score > -1) {
        pushUnique({
          id: getStudentId(person, index),
          type: "player",
          label: fullName,
          sublabel:
            [guild, homeroom].filter(Boolean).join(" • ") || "Legend Record",
          value: fullName,
          guildKey,
          person,
          score,
        });
      }
    });

    const homeroomCounts = new Map<string, number>();
    const homeroomGuildKey = new Map<string, string>();

    data.forEach((person) => {
      const hr = getHomeroom(person);
      if (!hr) return;
      homeroomCounts.set(hr, (homeroomCounts.get(hr) ?? 0) + 1);
      if (!homeroomGuildKey.has(hr))
        homeroomGuildKey.set(hr, getGuildKey(person));
    });

    homeroomCounts.forEach((count, hr) => {
      const hrN = normalize(hr);
      let score = -1;
      if (hrN === q) score = 84;
      else if (hrN.startsWith(q)) score = 76;
      else if (hrN.includes(q)) score = 68;

      if (score > -1) {
        pushUnique({
          id: `homeroom-${hr}`,
          type: "homeroom",
          label: hr,
          sublabel: `${count} legend${count === 1 ? "" : "s"}`,
          value: hr,
          guildKey: homeroomGuildKey.get(hr),
          score,
        });
      }
    });

    const guildCounts = new Map<string, number>();
    data.forEach((person) => {
      const guild = getGuild(person);
      if (!guild) return;
      guildCounts.set(guild, (guildCounts.get(guild) ?? 0) + 1);
    });

    guildCounts.forEach((count, guild) => {
      const guildN = normalize(guild);
      let score = -1;
      if (guildN === q) score = 64;
      else if (guildN.startsWith(q)) score = 58;
      else if (guildN.includes(q)) score = 52;

      if (score > -1) {
        pushUnique({
          id: `guild-${guild}`,
          type: "guild",
          label: guild,
          sublabel: `${count} legend${count === 1 ? "" : "s"}`,
          value: guild,
          guildKey: normalize(guild),
          score,
        });
      }
    });

    const skillMap = new Map<
      string,
      { count: number; guildKey?: string; exampleNames: string[] }
    >();

    data.forEach((person) => {
      const fullName = getFullName(person);
      const guildKey = getGuildKey(person);

      skillsToArray(person).forEach((skill) => {
        const current = skillMap.get(skill) ?? {
          count: 0,
          guildKey,
          exampleNames: [],
        };
        current.count += 1;
        if (current.exampleNames.length < 2 && fullName) {
          current.exampleNames.push(fullName);
        }
        if (!current.guildKey) current.guildKey = guildKey;
        skillMap.set(skill, current);
      });
    });

    skillMap.forEach((meta, skill) => {
      const skillN = normalize(skill);
      let score = -1;
      if (skillN === q) score = 48;
      else if (skillN.startsWith(q)) score = 42;
      else if (skillN.includes(q)) score = 36;

      if (score > -1) {
        pushUnique({
          id: `skill-${skill}`,
          type: "skill",
          label: skill,
          sublabel:
            meta.exampleNames.length > 0
              ? `${meta.count} legend${
                  meta.count === 1 ? "" : "s"
                } • ${meta.exampleNames.join(", ")}`
              : `${meta.count} legend${meta.count === 1 ? "" : "s"}`,
          value: skill,
          guildKey: meta.guildKey,
          score,
        });
      }
    });

    const typePriority: Record<SuggestionType, number> = {
      player: 0,
      homeroom: 1,
      guild: 2,
      skill: 3,
    };

    return suggestions
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (typePriority[a.type] !== typePriority[b.type]) {
          return typePriority[a.type] - typePriority[b.type];
        }
        return a.label.localeCompare(b.label);
      })
      .slice(0, 16);
  }, [data, query]);

  const groupedSuggestions = useMemo(() => {
    const orderedTypes: SuggestionType[] = [
      "player",
      "homeroom",
      "guild",
      "skill",
    ];

    return orderedTypes
      .map((type) => ({
        type,
        items: searchSuggestions.filter((item) => item.type === type),
      }))
      .filter((group) => group.items.length > 0);
  }, [searchSuggestions]);

  const flatSuggestions = useMemo(
    () => groupedSuggestions.flatMap((group) => group.items),
    [groupedSuggestions]
  );

  useEffect(() => {
    setHighlightedIndex(0);
  }, [query, flatSuggestions.length]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!searchWrapRef.current) return;
      if (!searchWrapRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const commitSuggestion = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.value);
    setSearchOpen(false);
    setHighlightedIndex(0);

    if (suggestion.type === "player" && suggestion.person) {
      onSelectPerson(suggestion.person);
    }
  };

  const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!flatSuggestions.length) {
      if (event.key === "Escape") setSearchOpen(false);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSearchOpen(true);
      setHighlightedIndex((prev) =>
        prev >= flatSuggestions.length - 1 ? 0 : prev + 1
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSearchOpen(true);
      setHighlightedIndex((prev) =>
        prev <= 0 ? flatSuggestions.length - 1 : prev - 1
      );
      return;
    }

    if (event.key === "Enter" && searchOpen) {
      event.preventDefault();
      const picked = flatSuggestions[highlightedIndex];
      if (picked) commitSuggestion(picked);
      return;
    }

    if (event.key === "Escape") {
      setSearchOpen(false);
    }
  };

  let runningIndex = -1;

  return (
    <Fragment>
      <div className="relative z-[200] px-3 pt-3 sm:px-4">
        <div className="relative z-[200] mx-auto max-w-[1380px]">
          <div className="overflow-visible rounded-[20px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,14,24,0.9),rgba(7,10,18,0.82))] shadow-[0_12px_34px_rgba(0,0,0,0.3)] backdrop-blur-xl">
            <div className="overflow-visible px-3 py-3 sm:px-4 sm:py-3.5">
              <div className="flex flex-col items-center gap-3">
                <div className="flex w-full flex-col items-center justify-center gap-2 overflow-visible lg:flex-row">
                  <div
                    ref={searchWrapRef}
                    className="relative z-[300] w-full max-w-[460px]"
                  >
                    <input
                      ref={inputRef}
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setSearchOpen(true);
                      }}
                      onFocus={() => {
                        if (query.trim()) setSearchOpen(true);
                      }}
                      onKeyDown={onSearchKeyDown}
                      placeholder="Search player, homeroom, guild, or skill..."
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      name="dashboard-search"
                      className="h-10 w-full rounded-full border border-white/10 bg-white/8 px-4 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-cyan-300/35 focus:bg-white/10"
                    />

                    {searchOpen && groupedSuggestions.length > 0 && (
                      <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-[400] overflow-hidden rounded-[20px] border border-cyan-300/15 bg-[linear-gradient(180deg,rgba(11,17,30,0.97),rgba(8,12,22,0.97))] shadow-[0_18px_40px_rgba(0,0,0,0.42)] backdrop-blur-xl">
                        <div className="border-b border-white/8 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-100/55">
                          Search Results
                        </div>

                        <div className="max-h-[420px] overflow-y-auto p-2">
                          {groupedSuggestions.map((group) => {
                            const meta = sectionMeta(group.type);

                            return (
                              <div key={group.type} className="mb-2 last:mb-0">
                                <div className="px-2 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
                                  {meta.title}
                                </div>

                                <div className="space-y-1.5">
                                  {group.items.map((suggestion) => {
                                    runningIndex += 1;
                                    const isActive =
                                      runningIndex === highlightedIndex;
                                    const styles = suggestion.guildKey
                                      ? GUILD_STYLES[suggestion.guildKey]
                                      : null;

                                    return (
                                      <button
                                        key={suggestion.id}
                                        type="button"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() =>
                                          commitSuggestion(suggestion)
                                        }
                                        onMouseEnter={() =>
                                          setHighlightedIndex(runningIndex)
                                        }
                                        className={[
                                          "flex w-full items-center justify-between gap-3 rounded-2xl border px-3 py-2.5 text-left transition",
                                          isActive
                                            ? styles?.suggestionActive ??
                                              "border-cyan-300/25 bg-cyan-400/12"
                                            : styles?.suggestion ??
                                              "border-transparent bg-white/[0.03] hover:border-white/10 hover:bg-white/[0.06]",
                                        ].join(" ")}
                                      >
                                        <div className="min-w-0">
                                          <div className="truncate text-sm font-semibold text-white">
                                            {suggestion.label}
                                          </div>
                                          <div className="truncate text-[11px] uppercase tracking-[0.16em] text-white/50">
                                            {suggestion.sublabel}
                                          </div>
                                        </div>

                                        <div className="flex shrink-0 items-center gap-2">
                                          <div
                                            className={[
                                              "rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]",
                                              styles?.badge ??
                                                "border-white/10 bg-white/6 text-cyan-100/75",
                                            ].join(" ")}
                                          >
                                            {meta.badge}
                                          </div>
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <select
                      value={sortKey}
                      onChange={(e) => setSortKey(e.target.value)}
                      className="h-10 rounded-full border border-white/10 bg-white/8 px-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-white outline-none transition hover:bg-white/10 sm:text-[11px]"
                    >
                      <option value="homeroom">Sort: Homeroom</option>
                      <option value="name-az">Sort: Name A–Z</option>
                      <option value="name-za">Sort: Name Z–A</option>
                      <option value="guild">Sort: Guild</option>
                      <option value="hp-desc">Sort: HP High–Low</option>
                      <option value="hp-asc">Sort: HP Low–High</option>
                      <option value="strength">Sort: Strength</option>
                      <option value="dexterity">Sort: Dexterity</option>
                      <option value="constitution">Sort: Constitution</option>
                      <option value="intelligence">Sort: Intelligence</option>
                      <option value="wisdom">Sort: Wisdom</option>
                      <option value="charisma">Sort: Charisma</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => setAdvancedOpen((prev) => !prev)}
                      className={`h-10 rounded-full border px-4 text-[10px] font-semibold uppercase tracking-[0.16em] transition sm:text-[11px] ${
                        advancedOpen
                          ? "border-cyan-300/35 bg-cyan-400/16 text-cyan-100"
                          : "border-white/10 bg-white/8 text-white/75 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      Advanced
                    </button>

                    <button
                      type="button"
                      onClick={resetFilters}
                      className="h-10 rounded-full border border-white/10 bg-white/8 px-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/75 transition hover:bg-white/10 hover:text-white sm:text-[11px]"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2">
                  {filterStats.map((stat) => (
                    <span
                      key={stat.label}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/65"
                    >
                      {stat.label}: {stat.value}
                    </span>
                  ))}
                </div>

                {advancedOpen && (
                  <div className="w-full rounded-[18px] border border-white/8 bg-black/18 px-3 py-3 sm:px-4">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <PillButton
                          active={selectedHRs.length === 0}
                          onClick={() => setSelectedHRs([])}
                        >
                          All Homerooms
                        </PillButton>

                        {homerooms.map((hr) => (
                          <PillButton
                            key={hr}
                            active={selectedHRs.includes(hr)}
                            onClick={() => toggleHR(hr)}
                          >
                            {hr}
                          </PillButton>
                        ))}
                      </div>

                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <PillButton
                          active={selectedGuilds.length === 0}
                          onClick={() => setSelectedGuilds([])}
                        >
                          All Guilds
                        </PillButton>

                        {guilds.map((guild) => {
                          const key = guild.toLowerCase();
                          const styles = GUILD_STYLES[key];

                          return (
                            <button
                              key={guild}
                              type="button"
                              onClick={() => toggleGuild(guild)}
                              className={[
                                "rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] transition sm:text-[11px]",
                                styles
                                  ? selectedGuilds.includes(guild)
                                    ? `${styles.active} ${styles.ring}`
                                    : `${styles.idle} ${styles.ring}`
                                  : selectedGuilds.includes(guild)
                                  ? "border-white/20 bg-white/16 text-white"
                                  : "border-white/10 bg-white/6 text-white/75 hover:bg-white/10 hover:text-white",
                              ].join(" ")}
                            >
                              {guild}
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                        <select
                          value={attrFilterKey}
                          onChange={(e) => setAttrFilterKey(e.target.value)}
                          className="h-10 min-w-[180px] rounded-full border border-white/10 bg-white/8 px-4 text-sm text-white outline-none"
                        >
                          <option value="">Any Attribute</option>
                          <option value="strength">Strength</option>
                          <option value="dexterity">Dexterity</option>
                          <option value="constitution">Constitution</option>
                          <option value="intelligence">Intelligence</option>
                          <option value="wisdom">Wisdom</option>
                          <option value="charisma">Charisma</option>
                        </select>

                        <input
                          type="number"
                          min={0}
                          value={attrFilterMin}
                          onChange={(e) =>
                            setAttrFilterMin(Number(e.target.value) || 0)
                          }
                          className="h-10 w-[120px] rounded-full border border-white/10 bg-white/8 px-4 text-center text-sm text-white outline-none"
                          placeholder="Min"
                        />

                        <div className="text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">
                          Minimum Attribute Score
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-0 px-3 pb-8 pt-4 sm:px-4 sm:pt-5">
        <div className="relative z-0 mx-auto max-w-[1380px]">
          <AbilitiesGrid>
            {visibleData.map((person, index) => (
              <AbilityCard
                key={`${getStudentId(person, index)}-${index}`}
                person={person}
                density="compact"
                onClick={() => onSelectPerson(person)}
              />
            ))}
          </AbilitiesGrid>
        </div>
      </div>
    </Fragment>
  );
}
