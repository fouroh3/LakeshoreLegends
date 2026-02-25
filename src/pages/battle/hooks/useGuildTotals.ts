import { useEffect, useMemo, useState } from "react";
import { BATTLE_GUILD_TOTALS_CSV } from "../battleConstants";

// Minimal CSV parser (handles quotes, commas)
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (ch === '"') {
      const next = text[i + 1];
      if (inQuotes && next === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && ch === ",") {
      row.push(cur);
      cur = "";
      continue;
    }

    if (!inQuotes && (ch === "\n" || ch === "\r")) {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cur);
      cur = "";
      rows.push(row);
      row = [];
      continue;
    }

    cur += ch;
  }

  // last cell
  row.push(cur);
  rows.push(row);

  // trim empties at end
  return rows
    .map((r) => r.map((c) => c.trim()))
    .filter((r) => r.some((c) => c.length > 0));
}

type GuildTotalsRow = {
  sessionId: string;
  guild: string;
  damage: number;
  heal: number;
  net: number;
};

function toNum(x: string) {
  const n = Number(String(x ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function idx(headers: string[], ...names: string[]) {
  const lower = headers.map((h) => h.toLowerCase().trim());
  for (const n of names) {
    const j = lower.indexOf(n.toLowerCase());
    if (j >= 0) return j;
  }
  return -1;
}

export function useGuildTotals(pageActive: boolean, sessionId: string) {
  const [rows, setRows] = useState<GuildTotalsRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!pageActive) return;
    if (!sessionId) {
      setRows([]);
      return;
    }

    let cancelled = false;
    const ctrl = new AbortController();

    async function tick() {
      try {
        setErr(null);
        const res = await fetch(BATTLE_GUILD_TOTALS_CSV, {
          cache: "no-store",
          signal: ctrl.signal,
        });
        const text = await res.text();
        const grid = parseCSV(text);
        if (grid.length < 2) {
          if (!cancelled) setRows([]);
          return;
        }

        const headers = grid[0];
        const iSession = idx(headers, "sessionid", "session_id", "session");
        const iGuild = idx(headers, "guild");
        const iDamage = idx(headers, "damage", "damage_total", "dmg");
        const iHeal = idx(headers, "heal", "heals", "heal_total");
        const iNet = idx(headers, "net", "net_total");

        const out: GuildTotalsRow[] = [];

        for (let r = 1; r < grid.length; r++) {
          const line = grid[r];
          const s = (line[iSession] ?? "").trim();
          if (!s || s !== sessionId) continue;

          const g = (line[iGuild] ?? "").trim() || "—";
          const damage = iDamage >= 0 ? toNum(line[iDamage] ?? "") : 0;
          const heal = iHeal >= 0 ? toNum(line[iHeal] ?? "") : 0;
          const net =
            iNet >= 0 ? toNum(line[iNet] ?? "") : Math.max(0, damage) - heal;

          out.push({ sessionId: s, guild: g, damage, heal, net });
        }

        out.sort((a, b) => b.damage - a.damage);

        if (!cancelled) setRows(out);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || "Failed to load guild totals.");
      }
    }

    tick();
    const id = window.setInterval(tick, 3000); // match your other polling cadence
    return () => {
      cancelled = true;
      ctrl.abort();
      window.clearInterval(id);
    };
  }, [pageActive, sessionId]);

  const top = useMemo(() => rows.slice(0, 6), [rows]);
  return { rows, top, err };
}
