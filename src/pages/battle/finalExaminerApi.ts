// src/pages/battle/finalExaminerApi.ts

const DEFAULT_API_URL =
  "https://script.google.com/macros/s/AKfycbw6gMIFYPvaljF3Ls-waojzprU6bygZZonOIJeKLopN2NSKgkDT-EsRKznxQiGpth_6/exec";

const API_URL =
  (import.meta as any).env?.VITE_LL_API_URL ||
  (import.meta as any).env?.VITE_HP_API_URL ||
  (import.meta as any).env?.VITE_HP_WEB_APP_URL ||
  DEFAULT_API_URL;

export type FinalExaminerClassState = {
  classKey: string;
  label: string;
  startingHP: number;
  currentHP: number;
  updatedAt?: string;
};

export type FinalExaminerBossState = {
  bossKey: string;
  bossName: string;
  maxHP: number;
  currentHP: number;
  locked: boolean;
  defeated: boolean;
  updatedAt?: string;
};

export type FinalExaminerRaidState = {
  raidId: string;
  active: boolean;
  phase: "MINIONS" | "FINAL_EXAMINER" | "VICTORY";
  classes: FinalExaminerClassState[];
  bosses: FinalExaminerBossState[];
  updatedAt?: string;
};

async function readJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const text = await res.text();
  let data: any = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`Final Examiner API returned non-JSON (HTTP ${res.status}).`);
  }

  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || data?.message || "Final Examiner API request failed.");
  }

  return data;
}

function normalizeRaidState(raw: any): FinalExaminerRaidState {
  const raid = (raw?.raid ?? raw?.state ?? raw) as FinalExaminerRaidState;

  return {
    ...raid,
    bosses: (raid.bosses || []).map((boss) => ({
      ...boss,
      defeated: Boolean(boss.defeated) || Number(boss.currentHP) <= 0,
    })),
  };
}

export async function getFinalExaminerState(raidId = "final_examiner_2026") {
  const url = `${API_URL}?action=finalexaminerstate&raidId=${encodeURIComponent(raidId)}&_=${Date.now()}`;
  const data = await readJson(url);
  return normalizeRaidState(data);
}

export async function submitFinalExaminerAction(args: {
  raidId?: string;
  classKey: string;
  action: "HEAL" | "STRIKE" | "DAMAGE";
  amount: number;
  targetBossKey?: string;
  note?: string;
  requestId: string;
}) {
  const data = await readJson(`${API_URL}?action=finalexamineraction&_=${Date.now()}`, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({
      action: "finalexamineraction",
      raidId: args.raidId ?? "final_examiner_2026",
      classKey: args.classKey,
      actionType: args.action,
      amount: Math.trunc(args.amount),
      targetBossKey: args.targetBossKey ?? "",
      note: args.note ?? "",
      requestId: args.requestId,
    }),
  });

  return data;
}

export async function startFinalExaminerRaid(args: {
  raidId?: string;
  requestId: string;
}) {
  const data = await readJson(
    `${API_URL}?action=startfinalexaminerraid&_=${Date.now()}`,
    {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "startfinalexaminerraid",
        raidId: args.raidId ?? "final_examiner_2026",
        requestId: args.requestId,
      }),
    }
  );

  return data;
}
