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

        const sessionId = stripQuotes(
          getCell(
            r,
            map,
            "ActiveBattleSessionID",
            "SessionID",
            "BattleSessionID"
          )
        ).trim();

        const pairedHomeroom = stripQuotes(
          getCell(r, map, "PairedHomeroom", "Paired HomeRoom")
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

        const guildAttacks = stripQuotes(
          getCell(r, map, "GuildAttacks", "Guild Attacks")
        ).trim();

        if (!homeroom || !status || !sessionId) return null;

        return {
          homeroom,
          status,
          sessionId,
          pairedHomeroom: pairedHomeroom || undefined,
          bossKey: bossKey || undefined,
          bossInstanceId: bossInstanceId || sessionId || undefined,
          guildAttacks: guildAttacks || undefined,
        } as BattleControlRow;
      })
      .filter(Boolean) as BattleControlRow[];

    return parsed;
  }, []);

  const refreshOnce = useCallback(async (): Promise<BattleControlRow[]> => {
    const text = await fetch(bcCsvUrlBusted()).then((r) => r.text());
    const parsed = parseRows(text);
    if (aliveRef.current) setBattleRows(parsed);
    return parsed;
  }, [bcCsvUrlBusted, parseRows]);

  useEffect(() => {
    aliveRef.current = true;
    if (!pageActive) return;

    // ✅ do not make the effect callback async
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
