// src/pages/battle/hooks/useGuildTotals.ts

import { useCallback, useEffect, useMemo, useState } from "react";
import { BATTLE_GUILD_TOTALS_CSV } from "../battleConstants";
import { usePolling } from "./usePolling";

function stripQuotes(s: string) {
  const t = String(s ?? "").trim();
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'"))
  ) {
    return t.slice(1, -1).trim();
  }
  return t;
}

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

  row.push(cur);
  rows.push(row);

  return rows
    .map((r) => r.map((c) => stripQuotes(c)))
    .filter((r) => r.some((c) => c.length > 0));
}

type GuildTotalsRow = {
  bossInstanceId: string;
  homeroom: string;
  guild: string;
  damage: number;
  hits: number;
  lastHitAt: string;
};

function toNum(x: string) {
  const n = Number(String(x ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function normKey(x: string) {
  return String(x ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

function normValue(x: string) {
  return stripQuotes(String(x ?? ""))
    .replace(/\u00a0/g, " ")
    .trim();
}

function idx(headers: string[], ...names: string[]) {
  const lower = headers.map((h) => normKey(h));
  for (const n of names) {
    const j = lower.indexOf(normKey(n));
    if (j >= 0) return j;
  }
  return -1;
}

export function useGuildTotals(pageActive: boolean, bossInstanceId: string) {
  const [rows, setRows] = useState<GuildTotalsRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const cleanBossInstanceId = useMemo(
    () => normValue(bossInstanceId),
    [bossInstanceId]
  );

  const tick = useCallback(async () => {
    if (!pageActive) return;

    if (!cleanBossInstanceId) {
      setRows([]);
      setErr(null);
      return;
    }

    setErr(null);

    const res = await fetch(`${BATTLE_GUILD_TOTALS_CSV}&_=${Date.now()}`, {
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Guild totals fetch failed: ${res.status}`);
    }

    const text = await res.text();
    const grid = parseCSV(text);

    if (grid.length < 2) {
      setRows([]);
      return;
    }

    const headers = grid[0];

    const iBossInstance = idx(headers, "bossinstanceid", "boss_instance_id");
    const iHomeroom = idx(headers, "homeroom");
    const iGuild = idx(headers, "guild");
    const iDamage = idx(headers, "totaldamage", "damage");
    const iHits = idx(headers, "hits");
    const iLastHit = idx(headers, "lasthitat", "last_hit_at");

    if (iBossInstance < 0 || iGuild < 0 || iDamage < 0) {
      throw new Error("Battle_GuildTotals headers do not match expected schema.");
    }

    const out: GuildTotalsRow[] = [];

    for (let r = 1; r < grid.length; r++) {
      const line = grid[r];

      const rowBossInstanceId = normValue(line[iBossInstance] ?? "");
      if (!rowBossInstanceId) continue;
      if (rowBossInstanceId !== cleanBossInstanceId) continue;

      out.push({
        bossInstanceId: rowBossInstanceId,
        homeroom: iHomeroom >= 0 ? normValue(line[iHomeroom] ?? "") : "",
        guild: normValue(line[iGuild] ?? "") || "—",
        damage: iDamage >= 0 ? toNum(line[iDamage] ?? "") : 0,
        hits: iHits >= 0 ? toNum(line[iHits] ?? "") : 0,
        lastHitAt: iLastHit >= 0 ? normValue(line[iLastHit] ?? "") : "",
      });
    }

    out.sort((a, b) => b.damage - a.damage);
    setRows(out);
  }, [pageActive, cleanBossInstanceId]);

  useEffect(() => {
    void tick();
  }, [tick]);

  usePolling(pageActive && !!cleanBossInstanceId, 10000, tick);

  const top = useMemo(() => rows.slice(0, 6), [rows]);

  return { rows, top, err };
}