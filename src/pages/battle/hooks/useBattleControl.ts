// src/pages/battle/hooks/useBattleControl.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BattleControlRow } from "../battleTypes";
import {
  BATTLE_CONTROL_CSV,
  BATTLE_CONTROL_POLL_MS_STUDENT,
  BATTLE_CONTROL_POLL_MS_TEACHER,
} from "../battleConstants";
import { idxMap, parseCSV, stripQuotes, getCell } from "../battleUtils";

export function useBattleControl(pageActive: boolean, isTeacher: boolean) {
  const [battleRows, setBattleRows] = useState<BattleControlRow[]>([]);
  const aliveRef = useRef(true);

  const bcCsvUrlBusted = useCallback(
    () => `${BATTLE_CONTROL_CSV}&_=${Date.now()}`,
    []
  );

  const parseRows = useCallback((csvText: string): BattleControlRow[] => {
    const { headers, rows } = parseCSV(csvText);
    const map = idxMap(headers);

    const parsed: BattleControlRow[] = rows
      .map((r) => {
        const homeroom = stripQuotes(
          getCell(r, map, "Homeroom", "HomeRoom", "HR", "Class", "Section")
        ).trim();

        const status = stripQuotes(getCell(r, map, "Status")).trim();

        const quest = stripQuotes(getCell(r, map, "Quest")).trim();

        const roundRaw = stripQuotes(getCell(r, map, "Round")).trim();
        const roundNum = Number(roundRaw);
        const round =
          Number.isFinite(roundNum) && roundNum > 0 ? Math.floor(roundNum) : 1;

        const turn = stripQuotes(getCell(r, map, "Turn")).trim().toUpperCase();

        const pairTo = stripQuotes(getCell(r, map, "PairTo", "Pair To")).trim();

        const leaderHomeroom = stripQuotes(
          getCell(r, map, "LeaderHomeroom", "Leader Homeroom")
        ).trim();

        const activeBattleSessionId = stripQuotes(
          getCell(
            r,
            map,
            "ActiveBattleSessionId",
            "ActiveBattleSessionID",
            "SessionID",
            "BattleSessionID"
          )
        ).trim();

        const bossKey = stripQuotes(
          getCell(r, map, "BossKey", "Boss Key")
        ).trim();

        const bossInstanceId = stripQuotes(
          getCell(
            r,
            map,
            "BossInstanceId",
            "Boss Instance ID",
            "BossInstanceID"
          )
        ).trim();

        const currentStateSummary = stripQuotes(
          getCell(r, map, "CurrentStateSummary", "Current State Summary")
        ).trim();

        const lastUpdated = stripQuotes(
          getCell(r, map, "LastUpdated", "Last Updated")
        ).trim();

        if (!homeroom || !status) return null;

        const guildAttacks =
          String(turn).toUpperCase() === "GUILD" ? "OPEN" : "CLOSED";

        return {
          homeroom,
          status,
          quest: quest || undefined,
          round,
          turn: turn || "BOSS",
          pairTo: pairTo || undefined,
          leaderHomeroom: leaderHomeroom || undefined,
          activeBattleSessionId: activeBattleSessionId || undefined,
          sessionId: activeBattleSessionId || undefined,
          bossKey: bossKey || undefined,
          bossInstanceId: bossInstanceId || activeBattleSessionId || undefined,
          currentStateSummary: currentStateSummary || undefined,
          lastUpdated: lastUpdated || undefined,
          guildAttacks,
        } as BattleControlRow;
      })
      .filter(Boolean) as BattleControlRow[];

    return parsed;
  }, []);

  const refreshOnce = useCallback(async (): Promise<BattleControlRow[]> => {
    const text = await fetch(bcCsvUrlBusted(), { cache: "no-store" }).then(
      (r) => {
        if (!r.ok) throw new Error(`Battle control fetch failed: ${r.status}`);
        return r.text();
      }
    );

    const parsed = parseRows(text);
    if (aliveRef.current) setBattleRows(parsed);
    return parsed;
  }, [bcCsvUrlBusted, parseRows]);

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
