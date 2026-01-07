// src/pages/BattlePage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import type { Student, Guild } from "../types";
import { loadStudents } from "../data";
import { submitHpDelta } from "../hpApi";
import logoUrl from "../assets/Lakeshore Legends Logo.png";
import { hpBarColorFromPct } from "../utils/hpColor";

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

const BATTLE_CONTROL_CSV =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSsHQNK1vvVY-V6nI4kOEilMlAdcnPCdM50QC3-mO4OQsoBDN0l_ROeTUoob3OhJpKD7zIZPXP1VrJw/pub?gid=653070188&single=true&output=csv";

const HP_API_URL =
  "https://script.google.com/macros/s/AKfycbw6gMIFYPvaljF3Ls-waojzprU6bygZZonOIJeKLopN2NSKgkDT-EsRKznxQiGpth_6/exec";

const PENDING_TTL_MS = 90_000;

// ✅ For MANY BattlePages open (one per table): do NOT poll every 3s.
const HP_POLL_MS = 15_000;
const HP_JITTER_MS = 4_000;

function usePageActive() {
  const [active, setActive] = useState(() => {
    const visible = document.visibilityState === "visible";
    const focused =
      typeof document.hasFocus === "function" ? document.hasFocus() : true;
    return visible && focused;
  });

  useEffect(() => {
    const recompute = () => {
      const visible = document.visibilityState === "visible";
      const focused =
        typeof document.hasFocus === "function" ? document.hasFocus() : true;
      setActive(visible && focused);
    };

    recompute();
    window.addEventListener("focus", recompute);
    window.addEventListener("blur", recompute);
    document.addEventListener("visibilitychange", recompute);

    return () => {
      window.removeEventListener("focus", recompute);
      window.removeEventListener("blur", recompute);
      document.removeEventListener("visibilitychange", recompute);
    };
  }, []);

  return active;
}

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
};

function hpStatus(current: number, base: number): HpStatus {
  const b = Math.max(1, base || 1);
  const pct = Math.max(0, Math.min(1, current / b));

  if (current <= 0) {
    return {
      label: "Dead",
      pillClass: "bg-zinc-800 text-zinc-200 border border-zinc-700",
    };
  }
  if (pct < 0.4) {
    return {
      label: "Critical",
      pillClass: "bg-red-950/50 text-red-200 border border-red-900/50",
    };
  }
  if (pct < 0.7) {
    return {
      label: "Wounded",
      pillClass: "bg-amber-950/40 text-amber-200 border border-amber-900/50",
    };
  }
  return {
    label: "Healthy",
    pillClass:
      "bg-emerald-950/40 text-emerald-200 border border-emerald-900/50",
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

function StatPill({
  label,
  value,
  muted,
}: {
  label: string;
  value: number;
  muted?: boolean;
}) {
  return (
    <div
      className={[
        "flex items-center justify-between rounded-lg px-2 py-1 border",
        muted
          ? "border-zinc-900 bg-zinc-950/15"
          : "border-zinc-800/70 bg-zinc-950/30",
      ].join(" ")}
    >
      <span
        className={[
          "text-[9px] leading-none tracking-wide",
          muted ? "text-zinc-600" : "text-zinc-500",
        ].join(" ")}
      >
        {label}
      </span>
      <span
        className={[
          "text-[11px] leading-none font-semibold tabular-nums",
          muted ? "text-zinc-600" : "text-zinc-100",
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  );
}

export default function BattlePage({ onBack }: Props) {
  const pageActive = usePageActive();

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

  // Battle_Control refresh (only when page is active)
  useEffect(() => {
    if (!pageActive) return;

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
    const t = window.setInterval(loadBattleControl, 10_000);

    return () => {
      alive = false;
      window.clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageActive, activeHomeroom]);

  // ✅ HP refresh from API (only when page is active)
  useEffect(() => {
    if (!pageActive) return;

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
    const t = window.setInterval(loadHpFromApi, HP_POLL_MS + jitter);

    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, [pageActive]);

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
    for (const s of studentsInActiveHomeroom)
      if ((s as any).guild) set.add((s as any).guild);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [studentsInActiveHomeroom]);

  const visibleTiles = useMemo(() => {
    const list = studentsInActiveHomeroom;
    if (guildFilter === "ALL") return list;
    return list.filter((s: any) => s.guild === guildFilter);
  }, [studentsInActiveHomeroom, guildFilter]);

  const visibleListForGrid = useMemo(() => visibleTiles, [visibleTiles]);

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
    // ✅ extra hard guard against double-submit / double-tap
    if (submitting) return;

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

  const tileSkillChips = (s: Student, muted?: boolean) => {
    const skills = skillsToArray(s.skills);
    if (skills.length === 0) return null;

    const top = skills.slice(0, 3);
    const extra = skills.length - top.length;

    return (
      <div className="mt-2 flex flex-nowrap gap-1 overflow-hidden h-[20px]">
        {top.map((sk) => (
          <span
            key={sk}
            className={[
              "rounded-full border px-2 py-0.5 text-[10px]",
              muted
                ? "border-zinc-900 bg-zinc-950/10 text-zinc-600"
                : "border-zinc-800/70 bg-zinc-950/35 text-zinc-200",
            ].join(" ")}
            title={sk}
          >
            {sk}
          </span>
        ))}
        {extra > 0 && (
          <span
            className={[
              "rounded-full border px-2 py-0.5 text-[10px]",
              muted
                ? "border-zinc-900 bg-zinc-950/10 text-zinc-700"
                : "border-zinc-800/70 bg-zinc-950/35 text-zinc-400",
            ].join(" ")}
          >
            +{extra}
          </span>
        )}
      </div>
    );
  };

  // =======================
  // ✅ STYLE: MATCH DASHBOARD
  // =======================
  const panel =
    "rounded-2xl border border-zinc-800/60 bg-zinc-950/30 p-2 shadow-[0_8px_30px_rgb(0,0,0,0.35)]";
  const innerPanel = "rounded-xl border border-zinc-800/55 bg-zinc-950/25 p-2";
  const label = "text-[10px] uppercase tracking-widest text-zinc-500";
  const selectClass =
    "w-full rounded-xl border border-zinc-800/70 bg-zinc-950/45 px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-2 focus:ring-cyan-500/30";

  const tileBase =
    "relative text-left rounded-2xl transition p-2.5 h-full flex flex-col overflow-hidden bg-zinc-950/25 shadow-[0_10px_40px_rgb(0,0,0,0.45)]";
  const tileHover =
    "hover:border hover:border-zinc-800/70 hover:bg-zinc-950/30";
  const tileSelected =
    "ring-2 ring-cyan-300/35 bg-cyan-400/5 border border-cyan-300/70";
  const tileUnselected = "border border-transparent";

  const damageOptions = [-1, -2, -3, -4, -5];
  const healOptions = [1, 2, 3, 4, 5];

  return (
    <div className="w-full h-[100dvh] overflow-hidden">
      <div className="h-[100dvh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="shrink-0 px-3 sm:px-4 lg:px-6 py-2 border-b border-zinc-800 bg-black/50">
          <div className="flex items-center gap-3">
            <img
              src={logoUrl}
              alt="Lakeshore Legends"
              className="h-9 w-auto select-none"
              draggable={false}
            />

            <div className="min-w-0">
              <div className="text-[14px] sm:text-[15px] font-semibold text-zinc-100">
                Battle Mode
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
                  ? "border-cyan-400/60 bg-cyan-400/10 text-cyan-100"
                  : "border-zinc-800/70 bg-zinc-950/40 text-zinc-200 hover:bg-zinc-900/60",
              ].join(" ")}
              aria-label="Toggle session info"
              title="Toggle session info"
            >
              i
            </button>

            <button
              type="button"
              onClick={onBack}
              className="rounded-xl border border-zinc-800/70 bg-zinc-950/50 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-900/60"
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
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-auto">
          <div className="w-full max-w-none px-3 sm:px-4 lg:px-6 py-2">
            {err && (
              <div className="mb-2 rounded-xl border border-red-900/50 bg-red-950/40 px-3 py-2 text-red-200 text-sm">
                {err}
              </div>
            )}

            {/* Top controls */}
            <div className={panel}>
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
                    <option value="ALL">All guilds</option>
                    {guildOptions.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
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
                            ? "border-cyan-400/60 bg-cyan-400/10 text-cyan-100"
                            : "border-zinc-800/70 bg-zinc-950/40 text-zinc-200 hover:bg-zinc-900/60",
                        ].join(" ")}
                      >
                        {multiSelect ? "Multi" : "Single"}
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedIds([])}
                        className="rounded-xl border border-zinc-800/70 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900/60"
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

            {/* Main area */}
            <div className="mt-2 rounded-2xl border border-zinc-900/60 bg-zinc-950/15 p-2">
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-2">
                {/* Students */}
                <div className="min-h-0 overflow-auto pr-1">
                  <div className="flex items-center gap-2 mb-2 px-1 h-[22px]">
                    <div className="text-[10px] uppercase tracking-widest text-zinc-500 truncate">
                      Students ({activeHomeroom || "—"}) ·{" "}
                      {guildFilter === "ALL"
                        ? "All guilds"
                        : `Guild: ${guildFilter}`}
                    </div>
                    <div className="flex-1" />
                  </div>

                  <div className="mb-2 border-t border-zinc-900/60" />

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

                      const isDead = hp.currentHP <= 0;
                      const muted = isDead;

                      const barColor = hpBarColorFromPct(pct);
                      const lowHpPulse = !isDead && pct > 0 && pct <= 0.25;

                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => toggleSelect(id)}
                          className={[
                            tileBase,
                            tileHover,
                            isSelected ? tileSelected : tileUnselected,
                          ].join(" ")}
                        >
                          {/* ✅ dashboard-like gradient layers (behind content) */}
                          <div className="pointer-events-none absolute inset-0 z-0">
                            <div className="absolute -inset-10 opacity-70 bg-[radial-gradient(60%_60%_at_20%_10%,rgba(255,255,255,0.10),rgba(0,0,0,0)_60%)]" />
                            <div className="absolute inset-0 opacity-90 bg-gradient-to-br from-zinc-900/35 via-zinc-950/10 to-black/0" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
                          </div>

                          {isDead && (
                            <div className="pointer-events-none absolute inset-0 z-50 rounded-2xl bg-zinc-950/60 flex flex-col items-center justify-center">
                              <div className="text-4xl leading-none">💀</div>
                              <div className="mt-1 text-base font-extrabold tracking-widest text-zinc-100">
                                DEAD
                              </div>
                            </div>
                          )}

                          <div className="relative z-10 flex items-start gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="h-[16px] text-[12px] leading-[16px] font-semibold text-zinc-100 truncate">
                                {fullName(s)}
                              </div>

                              <div
                                className={[
                                  "h-[12px] mt-0.5 text-[10px] leading-[12px] truncate",
                                  muted ? "text-zinc-700" : "text-zinc-400",
                                ].join(" ")}
                              >
                                {(s as any).guild ?? "—"}
                              </div>
                            </div>

                            <span
                              className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] leading-[12px] ${status.pillClass}`}
                            >
                              {status.label}
                            </span>
                          </div>

                          <div className="relative z-10 mt-1.5">
                            <div
                              className={[
                                "flex items-center justify-between text-[10px] mb-1",
                                muted ? "text-zinc-700" : "text-zinc-500",
                              ].join(" ")}
                            >
                              <span>HP</span>
                              <span
                                className={[
                                  "tabular-nums",
                                  muted ? "text-zinc-700" : "text-zinc-200",
                                ].join(" ")}
                              >
                                {hp.currentHP}/{hp.baseHP}
                              </span>
                            </div>

                            <div className="h-2 w-full rounded-full bg-zinc-900/70 border border-zinc-800/65 overflow-hidden">
                              <div
                                className={[
                                  "h-full transition-[width] duration-300",
                                  lowHpPulse ? "animate-pulse" : "",
                                ].join(" ")}
                                style={{
                                  width: `${Math.round(pct * 100)}%`,
                                  backgroundColor: isDead
                                    ? "rgba(113,113,122,1)"
                                    : barColor,
                                }}
                              />
                            </div>
                          </div>

                          <div className="relative z-10 mt-2 grid grid-cols-2 gap-1">
                            <StatPill
                              label="Strength"
                              value={(s as any).str}
                              muted={muted}
                            />
                            <StatPill
                              label="Dexterity"
                              value={(s as any).dex}
                              muted={muted}
                            />
                            <StatPill
                              label="Constitution"
                              value={(s as any).con}
                              muted={muted}
                            />
                            <StatPill
                              label="Intelligence"
                              value={(s as any).int}
                              muted={muted}
                            />
                            <StatPill
                              label="Wisdom"
                              value={(s as any).wis}
                              muted={muted}
                            />
                            <StatPill
                              label="Charisma"
                              value={(s as any).cha}
                              muted={muted}
                            />
                          </div>

                          <div className="relative z-10">
                            {tileSkillChips(s, muted)}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {!loading && activeOptions.length === 0 && (
                    <div className="mt-2 text-[11px] text-zinc-500 px-1">
                      Tip: set the homeroom(s) currently battling to{" "}
                      <b>ACTIVE</b> in Battle_Control.
                    </div>
                  )}
                </div>

                {/* Console */}
                <div className="min-h-0">
                  <div className="h-[22px] mb-2" />

                  <div className={[panel, "flex flex-col"].join(" ")}>
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

                    <div className="mt-2">
                      <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">
                        Damage
                      </div>
                      <div className="grid grid-cols-5 gap-2">
                        {damageOptions.map((d) => {
                          const active = delta === d;
                          return (
                            <button
                              key={d}
                              type="button"
                              onClick={() => setDelta(d)}
                              className={[
                                "rounded-xl py-2 text-sm font-semibold border transition",
                                active
                                  ? "border-red-400 bg-red-500/10 text-red-100 ring-2 ring-red-400/25"
                                  : "border-zinc-800/70 bg-zinc-950/40 text-zinc-200 hover:bg-zinc-900/60",
                              ].join(" ")}
                            >
                              {d}
                            </button>
                          );
                        })}
                      </div>

                      <div className="mt-2 text-[10px] uppercase tracking-widest text-zinc-500 mb-1">
                        Heal
                      </div>
                      <div className="grid grid-cols-5 gap-2">
                        {healOptions.map((d) => {
                          const active = delta === d;
                          return (
                            <button
                              key={d}
                              type="button"
                              onClick={() => setDelta(d)}
                              className={[
                                "rounded-xl py-2 text-sm font-semibold border transition",
                                active
                                  ? "border-emerald-400 bg-emerald-500/10 text-emerald-100 ring-2 ring-emerald-400/25"
                                  : "border-zinc-800/70 bg-zinc-950/40 text-zinc-200 hover:bg-zinc-900/60",
                              ].join(" ")}
                            >
                              +{d}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="mt-3 border-t border-zinc-900/60" />

                    <div className="mt-3">
                      <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">
                        Note
                      </div>
                      <input
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Optional (what happened)"
                        className={selectClass}
                      />
                    </div>

                    {selectedStudents.length === 1 && (
                      <div className="mt-2">
                        <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">
                          Full Skills
                        </div>
                        <div className={innerPanel}>
                          {selectedSkills.length === 0 ? (
                            <div className="text-[11px] text-zinc-500">
                              No skills listed.
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {selectedSkills.map((sk) => (
                                <span
                                  key={sk}
                                  className="rounded-full border border-zinc-800/70 bg-zinc-950/35 px-2 py-0.5 text-[11px] text-zinc-200"
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
                          ? "border-zinc-800/70 bg-zinc-900/60 text-zinc-400 cursor-not-allowed"
                          : "border-cyan-300/60 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/15 ring-1 ring-cyan-300/15",
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
    </div>
  );
}
