// src/pages/BattlePage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import type { Student, Guild } from "../types";
import { loadStudents } from "../data";
import { submitHpDelta } from "../hpApi";

type Props = { onBack: () => void };

type HpStateRow = {
  studentId: string;
  baseHP: number;
  currentHP: number;
};

type BattleControlRow = {
  homeroom: string;
  status: string;
  sessionId: string;
};

// ✅ Still fine to keep Battle_Control as published CSV (changes rarely)
const BATTLE_CONTROL_CSV =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSsHQNK1vvVY-V6nI4kOEilMlAdcnPCdM50QC3-mO4OQsoBDN0l_ROeTUoob3OhJpKD7zIZPXP1VrJw/pub?gid=653070188&single=true&output=csv";

// ✅ Apps Script Web App
const HP_API_URL =
  "https://script.google.com/macros/s/AKfycbw6gMIFYPvaljF3Ls-waojzprU6bygZZonOIJeKLopN2NSKgkDT-EsRKznxQiGpth_6/exec";

const MAX_TILES = 8;

// If API/Sheets takes a bit to “settle”, we keep a pending override.
// If it somehow never matches, we’ll give up after this many ms.
const PENDING_TTL_MS = 90_000;

// ✅ For MANY BattlePages open (one per table): do NOT poll every 3s.
// Spread load with jitter so devices don't hit the script at the same moment.
const HP_POLL_MS = 15_000;
const HP_JITTER_MS = 4_000;

function stripQuotes(s: string | undefined | null): string {
  if (!s) return "";
  const t = String(s).trim();
  return t.replace(/^["'‘’“”]+|["'‘’“”]+$/g, "");
}

function normId(id: string | undefined | null) {
  return stripQuotes(String(id ?? ""))
    .replace(/\u00A0/g, " ")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, "")
    .trim()
    .toUpperCase();
}

function toNumber(n: string | undefined | null, fallback = 0): number {
  if (n == null || n === "") return fallback;
  const cleaned = String(n).replace(/[^\d\-\.]/g, "");
  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** CSV parser (quotes + commas in quotes) */
function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const rows: string[][] = [];
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  let cur: string[] = [];
  let field = "";
  let inQuotes = false;

  const pushField = () => {
    cur.push(field);
    field = "";
  };

  const pushRow = () => {
    if (cur.some((c) => String(c ?? "").trim() !== "")) rows.push(cur);
    cur = [];
  };

  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];
    if (ch === '"') {
      if (inQuotes && normalized[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      pushField();
    } else if (ch === "\n" && !inQuotes) {
      pushField();
      pushRow();
    } else {
      field += ch;
    }
  }

  if (field !== "" || cur.length) {
    pushField();
    pushRow();
  }

  if (rows.length === 0) return { headers: [], rows: [] };

  const headers = rows[0].map((h) => stripQuotes(h));
  const dataRows = rows.slice(1);
  return { headers, rows: dataRows };
}

function idxMap(headers: string[]) {
  const m = new Map<string, number>();
  headers.forEach((h, i) => m.set(h.toLowerCase(), i));
  return m;
}

function getCell(row: string[], map: Map<string, number>, ...keys: string[]) {
  for (const k of keys) {
    const idx = map.get(k.toLowerCase());
    if (idx == null) continue;
    const v = row[idx];
    if (v != null && String(v).trim() !== "") return String(v);
  }
  return "";
}

function fullName(s: Student) {
  const last = (s.last ?? "").trim();
  const first = (s.first ?? "").trim();
  if (!last && !first) return "Unknown";
  if (!last) return first;
  if (!first) return last;
  return `${last}, ${first}`;
}

type HpStatus = {
  label: string;
  pillClass: string;
  barClass: string;
};

function hpStatus(current: number, base: number): HpStatus {
  const b = Math.max(1, base || 1);
  const pct = Math.max(0, Math.min(1, current / b));

  if (current <= 0) {
    return {
      label: "Dead",
      pillClass: "bg-zinc-800 text-zinc-200 border border-zinc-700",
      barClass: "bg-zinc-600",
    };
  }
  if (pct < 0.4) {
    return {
      label: "Critical",
      pillClass: "bg-red-950/50 text-red-200 border border-red-900/50",
      barClass: "bg-red-500",
    };
  }
  if (pct < 0.7) {
    return {
      label: "Wounded",
      pillClass: "bg-amber-950/40 text-amber-200 border border-amber-900/50",
      barClass: "bg-amber-400",
    };
  }
  return {
    label: "Healthy",
    pillClass:
      "bg-emerald-950/40 text-emerald-200 border border-emerald-900/50",
    barClass: "bg-emerald-400",
  };
}

function skillsToArray(skills: Student["skills"]): string[] {
  if (!skills) return [];
  if (Array.isArray(skills))
    return skills
      .filter(Boolean)
      .map((s) => String(s).trim())
      .filter(Boolean);

  const s = String(skills).trim();
  if (!s) return [];
  return s
    .split(/[,;|]/g)
    .map((x) => x.trim())
    .filter(Boolean);
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/35 px-2 py-1">
      <span className="text-[9px] leading-none tracking-wide text-zinc-500">
        {label}
      </span>
      <span className="text-[11px] leading-none font-semibold text-zinc-100 tabular-nums">
        {value}
      </span>
    </div>
  );
}

export default function BattlePage({ onBack }: Props) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [battleRows, setBattleRows] = useState<BattleControlRow[]>([]);
  const [hpRows, setHpRows] = useState<HpStateRow[]>([]);

  const [activeHomeroom, setActiveHomeroom] = useState<string>("");
  const [activeSessionId, setActiveSessionId] = useState<string>("");

  const [guildFilter, setGuildFilter] = useState<Guild | "ALL">("ALL");

  const [multiSelect, setMultiSelect] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [delta, setDelta] = useState<number>(-1);
  const [note, setNote] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState<{
    type: "ok" | "err";
    msg: string;
  } | null>(null);

  const [showSessionInfo, setShowSessionInfo] = useState(false);

  // ✅ Key fix: pending overrides stop “snap back” flicker
  const pendingRef = useRef<
    Map<string, { expected: number; base: number; ts: number }>
  >(new Map());

  const bcCsvUrlBusted = () => `${BATTLE_CONTROL_CSV}&_=${Date.now()}`;

  const allowScroll = guildFilter === "ALL";

  // Load students once
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

  // Battle_Control refresh
  useEffect(() => {
    let alive = true;

    const loadBattleControl = async () => {
      try {
        const text = await fetch(bcCsvUrlBusted()).then((r) => r.text());
        const { headers, rows } = parseCSV(text);
        const map = idxMap(headers);

        const parsed: BattleControlRow[] = rows
          .map((r) => {
            const homeroom = stripQuotes(
              getCell(r, map, "Homeroom", "HomeRoom", "HR", "Class", "Section")
            ).trim();
            const status = stripQuotes(getCell(r, map, "Status")).trim();
            const sessionId = stripQuotes(
              getCell(
                r,
                map,
                "ActiveBattleSessionID",
                "SessionID",
                "BattleSessionID"
              )
            ).trim();
            if (!homeroom || !status || !sessionId) return null;
            return { homeroom, status, sessionId };
          })
          .filter(Boolean) as BattleControlRow[];

        if (!alive) return;

        setBattleRows(parsed);

        const actives = parsed.filter(
          (r) => String(r.status).toUpperCase() === "ACTIVE"
        );
        if (actives.length > 0) {
          const keep = actives.find((r) => r.homeroom === activeHomeroom);
          const pick = keep ?? actives[0];
          setActiveHomeroom(pick.homeroom);
          setActiveSessionId(pick.sessionId);
        } else {
          setActiveHomeroom("");
          setActiveSessionId("");
        }
      } catch {
        // ignore
      }
    };

    loadBattleControl();
    const t = setInterval(loadBattleControl, 10000);

    return () => {
      alive = false;
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeHomeroom]);

  // ✅ HP refresh from API (use 15–19s with jitter, not 3s)
  useEffect(() => {
    let alive = true;

    const loadHpFromApi = async () => {
      try {
        const res = await fetch(`${HP_API_URL}?action=hp&_=${Date.now()}`, {
          method: "GET",
        });
        const data = await res.json();

        if (!alive) return;
        if (!data || !data.ok || !Array.isArray(data.hp)) return;

        const parsed: HpStateRow[] = data.hp
          .map((r: any) => {
            const id = normId(r?.studentId);
            if (!id) return null;
            const baseHP = Math.max(1, Math.round(toNumber(r?.baseHP, 20)));
            const currentHP = Math.max(
              0,
              Math.min(baseHP, Math.round(toNumber(r?.currentHP, baseHP)))
            );
            return { studentId: id, baseHP, currentHP } as HpStateRow;
          })
          .filter(Boolean);

        const now = Date.now();
        const pending = pendingRef.current;

        const finalRows: HpStateRow[] = parsed.map((row) => {
          const id = normId(row.studentId);
          const p = pending.get(id);

          if (!p) return row;

          if (now - p.ts > PENDING_TTL_MS) {
            pending.delete(id);
            return row;
          }

          if (row.currentHP === p.expected) {
            pending.delete(id);
            return row;
          }

          return { studentId: id, baseHP: p.base, currentHP: p.expected };
        });

        setHpRows(finalRows);
      } catch {
        // ignore
      }
    };

    loadHpFromApi();

    const jitter = Math.floor(Math.random() * HP_JITTER_MS);
    const t = setInterval(loadHpFromApi, HP_POLL_MS + jitter);

    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const activeOptions = useMemo(() => {
    return battleRows
      .filter((r) => String(r.status).toUpperCase() === "ACTIVE")
      .slice()
      .sort((a, b) =>
        a.homeroom.localeCompare(b.homeroom, "en", { numeric: true })
      );
  }, [battleRows]);

  const hpById = useMemo(() => {
    const m = new Map<string, HpStateRow>();
    for (const r of hpRows) {
      const id = normId(r.studentId);
      m.set(id, { ...r, studentId: id });
    }
    return m;
  }, [hpRows]);

  const getDisplayHp = (studentIdRaw: string) => {
    const id = normId(studentIdRaw);

    const p = pendingRef.current.get(id);
    if (p) return { studentId: id, baseHP: p.base, currentHP: p.expected };

    const fromApi = hpById.get(id);
    if (fromApi) return fromApi;

    return { studentId: id, baseHP: 20, currentHP: 20 };
  };

  const studentsInActiveHomeroom = useMemo(() => {
    if (!activeHomeroom) return [];
    return students
      .filter((s) => (s.homeroom ?? "").trim() === activeHomeroom)
      .slice()
      .sort((a, b) => fullName(a).localeCompare(fullName(b)));
  }, [students, activeHomeroom]);

  const guildOptions = useMemo(() => {
    const set = new Set<Guild>();
    for (const s of studentsInActiveHomeroom) if (s.guild) set.add(s.guild);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [studentsInActiveHomeroom]);

  const visibleTiles = useMemo(() => {
    const list = studentsInActiveHomeroom;
    if (guildFilter === "ALL") return list;
    return list.filter((s) => s.guild === guildFilter);
  }, [studentsInActiveHomeroom, guildFilter]);

  const visibleListForGrid = useMemo(() => {
    return allowScroll ? visibleTiles : visibleTiles.slice(0, MAX_TILES);
  }, [allowScroll, visibleTiles]);

  const selectedStudents = useMemo(() => {
    if (selectedIds.length === 0) return [];
    const set = new Set(selectedIds.map(normId));
    return studentsInActiveHomeroom.filter((s) => set.has(normId(s.id)));
  }, [studentsInActiveHomeroom, selectedIds]);

  const selectedSkills = useMemo(() => {
    if (selectedStudents.length !== 1) return [];
    return skillsToArray(selectedStudents[0].skills);
  }, [selectedStudents]);

  useEffect(() => {
    setSelectedIds([]);
    setBanner(null);
    setNote("");
    setDelta(-1);
    setShowSessionInfo(false);
  }, [activeHomeroom]);

  useEffect(() => {
    const setVisible = new Set(visibleTiles.map((s) => normId(s.id)));
    setSelectedIds((prev) => prev.filter((id) => setVisible.has(normId(id))));
  }, [visibleTiles]);

  const toggleSelect = (idRaw: string) => {
    const id = normId(idRaw);

    if (!multiSelect) {
      setSelectedIds([id]);
      return;
    }

    setSelectedIds((prev) => {
      const has = prev.some((x) => normId(x) === id);
      if (has) return prev.filter((x) => normId(x) !== id);
      return [...prev, id];
    });
  };

  async function onSubmit() {
    setBanner(null);

    if (!activeHomeroom || !activeSessionId) {
      setBanner({ type: "err", msg: "Pick an ACTIVE homeroom." });
      return;
    }
    if (selectedIds.length === 0) {
      setBanner({ type: "err", msg: "Select at least 1 student." });
      return;
    }
    if (!Number.isFinite(delta) || delta === 0) {
      setBanner({ type: "err", msg: "Pick a damage/heal amount." });
      return;
    }

    const ids = selectedIds.map(normId);
    setSubmitting(true);

    let ok = 0;
    let fail = 0;

    try {
      for (const id of ids) {
        const hp = getDisplayHp(id);
        const before = hp.currentHP;
        const base = Math.max(1, hp.baseHP || 20);
        const after = Math.max(0, Math.min(base, before + delta));

        pendingRef.current.set(id, { expected: after, base, ts: Date.now() });

        setHpRows((prev) => {
          const next = prev.slice();
          const idx = next.findIndex((r) => normId(r.studentId) === id);
          const row: HpStateRow = {
            studentId: id,
            baseHP: base,
            currentHP: after,
          };
          if (idx >= 0) next[idx] = row;
          else next.push(row);
          return next;
        });

        try {
          const cleanSessionId = String(activeSessionId)
            .replace(/^["'‘’“”]+|["'‘’“”]+$/g, "")
            .trim();

          await submitHpDelta({
            studentId: id,
            delta,
            note: note.trim(),
            sessionId: cleanSessionId,
          });

          ok++;
        } catch {
          pendingRef.current.delete(id);
          setHpRows((prev) => {
            const next = prev.slice();
            const idx = next.findIndex((r) => normId(r.studentId) === id);
            if (idx >= 0)
              next[idx] = { studentId: id, baseHP: base, currentHP: before };
            return next;
          });
          fail++;
        }
      }

      if (fail === 0) {
        setBanner({
          type: "ok",
          msg: `Submitted ✅ (${ok} target${ok === 1 ? "" : "s"})`,
        });
      } else {
        setBanner({ type: "err", msg: `Partial: ${ok} ok, ${fail} failed.` });
      }

      setSelectedIds([]);
    } finally {
      setNote("");
      setSubmitting(false);
    }
  }

  const tileSkillChips = (s: Student) => {
    const skills = skillsToArray(s.skills);
    if (skills.length === 0) return null;

    const top = skills.slice(0, 3);
    const extra = skills.length - top.length;

    return (
      <div className="mt-2 flex flex-nowrap gap-1 overflow-hidden h-[20px]">
        {top.map((sk) => (
          <span
            key={sk}
            className="rounded-full border border-zinc-800 bg-zinc-950/40 px-2 py-0.5 text-[10px] text-zinc-200"
            title={sk}
          >
            {sk}
          </span>
        ))}
        {extra > 0 && (
          <span className="rounded-full border border-zinc-800 bg-zinc-950/40 px-2 py-0.5 text-[10px] text-zinc-400">
            +{extra}
          </span>
        )}
      </div>
    );
  };

  const bar = "rounded-2xl border border-zinc-800 bg-zinc-950/30 p-2";
  const label = "text-[10px] uppercase tracking-widest text-zinc-500";
  const selectClass =
    "w-full rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500/30";

  // ✅ 10 buttons total: -5..-1 and +1..+5 (includes ±4)
  const damageOptions = [-5, -4, -3, -2, -1];
  const healOptions = [+1, +2, +3, +4, +5];

  return (
    <div className="w-full h-[100dvh]">
      <div
        className={
          allowScroll
            ? "w-full h-[100dvh] overflow-auto"
            : "w-full h-[100dvh] overflow-hidden"
        }
      >
        <div className="w-full max-w-none px-3 sm:px-4 lg:px-6 py-2">
          {err && (
            <div className="mb-2 rounded-xl border border-red-900/50 bg-red-950/40 px-3 py-2 text-red-200 text-sm">
              {err}
            </div>
          )}

          <div className={bar}>
            <div className="flex items-center gap-2">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-zinc-100">
                  Battle Console
                </div>
                <div className="text-[11px] text-zinc-400">
                  Select targets → pick damage/heal → submit.
                </div>
              </div>

              <div className="flex-1" />

              <button
                type="button"
                onClick={() => setShowSessionInfo((v) => !v)}
                className={[
                  "rounded-xl border px-3 py-2 text-sm font-semibold transition",
                  showSessionInfo
                    ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-100"
                    : "border-zinc-800 bg-zinc-950/40 text-zinc-200 hover:bg-zinc-900/60",
                ].join(" ")}
                aria-label="Toggle session info"
                title="Toggle session info"
              >
                i
              </button>

              <button
                type="button"
                onClick={onBack}
                className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-900"
              >
                Back
              </button>
            </div>

            {showSessionInfo && (
              <div className="mt-2 text-[11px] text-zinc-500">
                {activeSessionId ? (
                  <span className="truncate">Session: {activeSessionId}</span>
                ) : (
                  "No active session."
                )}
              </div>
            )}

            <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2">
              <div>
                <div className={label}>Active Homeroom</div>
                <select
                  className={selectClass}
                  value={activeHomeroom}
                  onChange={(e) => {
                    const hr = e.target.value;
                    const row = activeOptions.find((r) => r.homeroom === hr);
                    setActiveHomeroom(hr);
                    setActiveSessionId(row?.sessionId ?? "");
                  }}
                >
                  {activeOptions.length === 0 ? (
                    <option value="">No ACTIVE homerooms</option>
                  ) : (
                    activeOptions.map((r) => (
                      <option key={r.homeroom} value={r.homeroom}>
                        {r.homeroom} · ACTIVE
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <div className={label}>Guild</div>
                <select
                  className={selectClass}
                  value={guildFilter}
                  onChange={(e) => setGuildFilter(e.target.value as any)}
                >
                  <option value="ALL">All guilds (scroll)</option>
                  {guildOptions.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
                <div className="mt-1 text-[11px] text-zinc-500 truncate">
                  {allowScroll ? "Scroll enabled" : `Max ${MAX_TILES} shown`}
                </div>
              </div>

              <div>
                <div className={label}>Targets</div>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-zinc-100">
                    {selectedIds.length} selected
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMultiSelect((v) => !v)}
                      className={[
                        "rounded-xl border px-3 py-2 text-sm font-semibold transition",
                        multiSelect
                          ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-100"
                          : "border-zinc-800 bg-zinc-950/40 text-zinc-200 hover:bg-zinc-900/60",
                      ].join(" ")}
                    >
                      {multiSelect ? "Multi" : "Single"}
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedIds([])}
                      className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900/60"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                {selectedIds.length === 0 && (
                  <div className="mt-1 text-[11px] text-zinc-500">
                    Tap tiles to select.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-2 rounded-2xl border border-zinc-800 bg-zinc-950/35 p-2">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-2">
              <div
                className={
                  allowScroll
                    ? "min-h-0 overflow-auto pr-1"
                    : "min-h-0 overflow-hidden"
                }
              >
                <div className="flex items-center gap-2 mb-2 px-1 h-[22px]">
                  <div className="text-[10px] uppercase tracking-widest text-zinc-500 truncate">
                    Students ({activeHomeroom || "—"}) ·{" "}
                    {guildFilter === "ALL"
                      ? "All guilds"
                      : `Guild: ${guildFilter}`}
                  </div>
                  <div className="flex-1" />
                  {!allowScroll && (
                    <div className="text-[10px] text-zinc-500">
                      Showing {Math.min(MAX_TILES, visibleTiles.length)} /{" "}
                      {visibleTiles.length}
                    </div>
                  )}
                </div>

                <div className="grid gap-2 grid-cols-2 md:grid-cols-4 auto-rows-fr">
                  {visibleListForGrid.map((s) => {
                    const id = normId(s.id);
                    const hp = getDisplayHp(id);
                    const status = hpStatus(hp.currentHP, hp.baseHP);
                    const isSelected = selectedIds.some(
                      (x) => normId(x) === id
                    );
                    const pct = Math.max(
                      0,
                      Math.min(1, hp.currentHP / Math.max(1, hp.baseHP))
                    );

                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => toggleSelect(id)}
                        className={[
                          "text-left rounded-2xl border bg-zinc-950/30 transition p-2.5 h-full flex flex-col",
                          isSelected
                            ? "border-cyan-400 ring-2 ring-cyan-400/25"
                            : "border-zinc-800 hover:border-zinc-700",
                        ].join(" ")}
                      >
                        <div className="flex items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="h-[16px] text-[12px] leading-[16px] font-semibold text-zinc-100 truncate">
                              {fullName(s)}
                            </div>
                            <div className="h-[12px] mt-0.5 text-[10px] leading-[12px] text-zinc-400 truncate">
                              {s.guild ?? "—"}
                            </div>
                          </div>

                          <span
                            className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] leading-[12px] ${status.pillClass}`}
                          >
                            {status.label}
                          </span>
                        </div>

                        <div className="mt-1.5">
                          <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-1">
                            <span>HP</span>
                            <span className="text-zinc-200 tabular-nums">
                              {hp.currentHP}/{hp.baseHP}
                            </span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-zinc-900/70 border border-zinc-800 overflow-hidden">
                            <div
                              className={`h-full ${status.barClass}`}
                              style={{ width: `${Math.round(pct * 100)}%` }}
                            />
                          </div>
                        </div>

                        <div className="mt-2 grid grid-cols-2 gap-1">
                          <StatPill label="Strength" value={s.str} />
                          <StatPill label="Dexterity" value={s.dex} />
                          <StatPill label="Constitution" value={s.con} />
                          <StatPill label="Intelligence" value={s.int} />
                          <StatPill label="Wisdom" value={s.wis} />
                          <StatPill label="Charisma" value={s.cha} />
                        </div>

                        {tileSkillChips(s)}
                      </button>
                    );
                  })}
                </div>

                {!loading && activeOptions.length === 0 && (
                  <div className="mt-2 text-[11px] text-zinc-500 px-1">
                    Tip: set the homeroom(s) currently battling to <b>ACTIVE</b>{" "}
                    in Battle_Control.
                  </div>
                )}
              </div>

              <div className="min-h-0">
                <div className="h-[22px] mb-2" />

                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/30 p-2 flex flex-col">
                  <div className="flex items-center gap-2">
                    <div className="text-[10px] uppercase tracking-widest text-zinc-500">
                      Damage / Heal
                    </div>
                    <div className="flex-1" />
                    <div className="text-[11px] text-zinc-400">
                      Targets:{" "}
                      <span className="text-zinc-200">
                        {selectedIds.length}
                      </span>
                    </div>
                  </div>

                  {/* ✅ TWO ROWS: damage on top, heal on bottom (5 + 5) */}
                  <div className="mt-2 space-y-2">
                    {/* Damage */}
                    <div className="grid grid-cols-5 gap-2">
                      {damageOptions.map((d) => {
                        const active = delta === d;
                        return (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setDelta(d)}
                            className={[
                              "h-10 rounded-xl text-sm font-semibold border transition flex items-center justify-center",
                              active
                                ? "border-red-400 bg-red-500/15 text-red-100 ring-1 ring-red-400/40"
                                : "border-red-800/70 bg-zinc-950/40 text-zinc-200 hover:bg-red-950/40",
                            ].join(" ")}
                          >
                            {d}
                          </button>
                        );
                      })}
                    </div>

                    {/* Heal */}
                    <div className="grid grid-cols-5 gap-2">
                      {healOptions.map((d) => {
                        const active = delta === d;
                        return (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setDelta(d)}
                            className={[
                              "h-10 rounded-xl text-sm font-semibold border transition flex items-center justify-center",
                              active
                                ? "border-emerald-300 bg-emerald-500/20 text-emerald-100 ring-1 ring-emerald-300/50"
                                : "border-emerald-600/80 bg-zinc-950/40 text-zinc-200 hover:bg-emerald-950/35",
                            ].join(" ")}
                          >
                            +{d}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-2">
                    <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">
                      Note
                    </div>
                    <input
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Optional (what happened)"
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500/30"
                    />
                  </div>

                  {selectedStudents.length === 1 && (
                    <div className="mt-2">
                      <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">
                        Full Skills
                      </div>
                      <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-2">
                        {selectedSkills.length === 0 ? (
                          <div className="text-[11px] text-zinc-500">
                            No skills listed.
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {selectedSkills.map((sk) => (
                              <span
                                key={sk}
                                className="rounded-full border border-zinc-800 bg-zinc-950/40 px-2 py-0.5 text-[11px] text-zinc-200"
                              >
                                {sk}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedStudents.length > 1 && (
                    <div className="mt-2 text-[11px] text-zinc-500">
                      Full skills hidden in multi-target mode.
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={onSubmit}
                    disabled={submitting}
                    className={[
                      "mt-2 rounded-2xl px-6 py-3 text-sm font-semibold transition border w-full",
                      submitting
                        ? "border-zinc-800 bg-zinc-900/60 text-zinc-400 cursor-not-allowed"
                        : "border-cyan-500/30 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/15",
                    ].join(" ")}
                  >
                    {submitting ? "Submitting…" : "Submit"}
                  </button>

                  {banner && (
                    <div
                      className={[
                        "mt-2 rounded-xl px-3 py-2 text-sm border",
                        banner.type === "ok"
                          ? "border-emerald-900/50 bg-emerald-950/30 text-emerald-200"
                          : "border-red-900/50 bg-red-950/30 text-red-200",
                      ].join(" ")}
                    >
                      {banner.msg}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {!loading && !err && students.length === 0 && (
            <div className="mt-2 text-xs text-zinc-500">
              No students loaded.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
