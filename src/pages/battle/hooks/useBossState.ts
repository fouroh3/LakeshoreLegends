// src/pages/battle/hooks/useBossState.ts
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { getBossState, type BossState } from "../../../bossApi";

const BOSS_POLL_MS = 10_000;
const BOSS_PENDING_TTL_MS = 8_000;

type PendingBoss = { expected: number; max: number; ts: number };

export function useBossState(
  pageActive: boolean,
  bossKey: string,
  bossInstanceId: string
) {
  const [boss, setBoss] = useState<BossState | null>(null);
  const [bossErr, setBossErr] = useState<string | null>(null);

  const pendingRef = useRef<Map<string, PendingBoss>>(new Map());

  const clearBossPending = useCallback((id: string) => {
    pendingRef.current.delete(id);
  }, []);

  const applyOptimisticBoss = useCallback(
    (id: string, expectedHp: number, maxHp: number) => {
      pendingRef.current.set(id, {
        expected: expectedHp,
        max: maxHp,
        ts: Date.now(),
      });
    },
    []
  );

  useEffect(() => {
    if (!pageActive) return;

    if (!bossKey || !bossInstanceId) {
      setBoss(null);
      setBossErr(null);
      return;
    }

    let alive = true;

    const loadBoss = async () => {
      try {
        const next = await getBossState({ bossInstanceId, bossKey });
        if (!alive) return;

        const now = Date.now();
        const pending = pendingRef.current.get(next.bossInstanceId);

        if (pending && now - pending.ts <= BOSS_PENDING_TTL_MS) {
          if (next.currentHP === pending.expected) {
            pendingRef.current.delete(next.bossInstanceId);
            setBoss(next);
          } else {
            setBoss({
              ...next,
              currentHP: pending.expected,
              maxHP: pending.max,
            });
          }
        } else {
          pendingRef.current.delete(next.bossInstanceId);
          setBoss(next);
        }

        setBossErr(null);
      } catch {
        if (!alive) return;
        setBossErr("Could not refresh boss state.");
      }
    };

    void loadBoss();

    const t = window.setInterval(() => {
      void loadBoss();
    }, BOSS_POLL_MS);

    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, [pageActive, bossKey, bossInstanceId]);

  return useMemo(
    () => ({
      boss,
      setBoss,
      bossErr,
      applyOptimisticBoss,
      clearBossPending,
    }),
    [boss, bossErr, applyOptimisticBoss, clearBossPending]
  );
}
