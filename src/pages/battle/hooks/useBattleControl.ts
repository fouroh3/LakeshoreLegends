// src/pages/battle/hooks/useBattleControl.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BattleControlRow } from "../battleTypes";
import {
  HP_API_URL,
  BATTLE_CONTROL_POLL_MS_STUDENT,
  BATTLE_CONTROL_POLL_MS_TEACHER,
} from "../battleConstants";

type BattleControlApiRow = {
  homeroom?: string;
  status?: string;
  quest?: string;
  round?: number;
  turn?: string;
  pairTo?: string;
  leaderHomeroom?: string;
  activeBattleSessionId?: string;
  sessionId?: string;
  bossKey?: string;
  bossInstanceId?: string;
  currentStateSummary?: string;
  lastUpdated?: string;
  guildAttacks?: string;
};

type BattleControlApiResponse = {
  ok?: boolean;
  rows?: BattleControlApiRow[];
  now?: string;
  error?: string;
};

export function useBattleControl(pageActive: boolean, isTeacher: boolean) {
  const [battleRows, setBattleRows] = useState<BattleControlRow[]>([]);
  const aliveRef = useRef(true);

  const battleControlUrl = useCallback(
    () => `${HP_API_URL}?action=battlecontrol&_=${Date.now()}`,
    []
  );

  const normalizeRows = useCallback(
    (rows: BattleControlApiRow[]): BattleControlRow[] => {
      return (rows || [])
        .map((r) => {
          const homeroom = String(r.homeroom || "").trim();
          const status = String(r.status || "").trim();
          if (!homeroom || !status) return null;

          const turn = String(r.turn || "BOSS")
            .trim()
            .toUpperCase();
          const roundNum = Number(r.round);
          const round =
            Number.isFinite(roundNum) && roundNum > 0
              ? Math.floor(roundNum)
              : 1;

          return {
            homeroom,
            status,
            quest: String(r.quest || "").trim() || undefined,
            round,
            turn,
            pairTo: String(r.pairTo || "").trim() || undefined,
            leaderHomeroom: String(r.leaderHomeroom || "").trim() || undefined,
            activeBattleSessionId:
              String(r.activeBattleSessionId || "").trim() || undefined,
            sessionId:
              String(r.sessionId || r.activeBattleSessionId || "").trim() ||
              undefined,
            bossKey: String(r.bossKey || "").trim() || undefined,
            bossInstanceId:
              String(r.bossInstanceId || "").trim() ||
              String(r.activeBattleSessionId || "").trim() ||
              undefined,
            currentStateSummary:
              String(r.currentStateSummary || "").trim() || undefined,
            lastUpdated: String(r.lastUpdated || "").trim() || undefined,
            guildAttacks:
              String(r.guildAttacks || "")
                .trim()
                .toUpperCase() === "OPEN"
                ? "OPEN"
                : turn === "GUILD"
                ? "OPEN"
                : "CLOSED",
          } as BattleControlRow;
        })
        .filter(Boolean) as BattleControlRow[];
    },
    []
  );

  const refreshOnce = useCallback(async (): Promise<BattleControlRow[]> => {
    const payload = (await fetch(battleControlUrl(), {
      cache: "no-store",
    }).then(async (r) => {
      if (!r.ok) {
        throw new Error(`Battle control fetch failed: ${r.status}`);
      }
      return (await r.json()) as BattleControlApiResponse;
    })) as BattleControlApiResponse;

    if (!payload?.ok) {
      throw new Error(payload?.error || "Battle control fetch failed.");
    }

    const parsed = normalizeRows(payload.rows || []);
    if (aliveRef.current) setBattleRows(parsed);
    return parsed;
  }, [battleControlUrl, normalizeRows]);

  useEffect(() => {
    aliveRef.current = true;
    if (!pageActive) return;

    void refreshOnce();

    const intervalMs = isTeacher
      ? BATTLE_CONTROL_POLL_MS_TEACHER
      : BATTLE_CONTROL_POLL_MS_STUDENT;

    const t = window.setInterval(() => {
      void refreshOnce();
    }, intervalMs);

    return () => {
      aliveRef.current = false;
      window.clearInterval(t);
    };
  }, [pageActive, isTeacher, refreshOnce]);

  return useMemo(
    () => ({
      battleRows,
      refreshOnce,
    }),
    [battleRows, refreshOnce]
  );
}
