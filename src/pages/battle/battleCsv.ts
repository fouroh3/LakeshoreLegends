// src/pages/battle/battleCsv.ts
export function stripQuotes(s: string) {
  const t = (s ?? "").trim();
  if (t.startsWith('"') && t.endsWith('"')) return t.slice(1, -1);
  return t;
}

export function parseCSV(text: string): string[][] {
  // simple CSV parser (handles quotes)
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQ = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const n = text[i + 1];

    if (c === '"' && n === '"') {
      cur += '"';
      i++;
      continue;
    }
    if (c === '"') {
      inQ = !inQ;
      continue;
    }
    if (!inQ && c === ",") {
      row.push(cur);
      cur = "";
      continue;
    }
    if (!inQ && (c === "\n" || c === "\r")) {
      if (c === "\r" && n === "\n") i++;
      row.push(cur);
      cur = "";
      rows.push(row);
      row = [];
      continue;
    }
    cur += c;
  }

  row.push(cur);
  rows.push(row);
  return rows;
}

export function idxMap(header: string[]) {
  const m = new Map<string, number>();
  header.forEach((h, i) => m.set(stripQuotes(h).trim().toLowerCase(), i));
  return m;
}

export function getCell(r: string[], m: Map<string, number>, key: string) {
  const idx = m.get(key.toLowerCase());
  return idx == null ? "" : stripQuotes(r[idx] ?? "").trim();
}

export async function fetchText(url: string, signal?: AbortSignal) {
  const res = await fetch(url, { signal, cache: "no-store" });
  if (!res.ok) throw new Error(`Fetch failed ${res.status}`);
  return await res.text();
}
