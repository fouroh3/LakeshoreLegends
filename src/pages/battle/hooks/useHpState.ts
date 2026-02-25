// src/pages/battle/hooks/useHpState.ts
import { useCallback, useMemo, useRef, useState } from "react";
import type { HpStateRow, PendingHp } from "../battleTypes";
import {
  HP_API_URL,
  HP_JITTER_MS,
  HP_POLL_MS,
  MAX_HP,
  PENDING_TTL_MS,
} from "../battleConstants";
import { normId, toNumber } from "../battleUtils";
import { usePolling } from "./usePolling";

export function useHpState(pageActive: boolean) {
  const [hpRows, setHpRows] = useState<HpStateRow[]>([]);
  const pendingRef = useRef<Map<string, PendingHp>>(new Map());

  const refreshOnce = useCallback(async () => {
    const res = await fetch(`${HP_API_URL}?action=hp&_=${Date.now()}`, {
      method: "GET",
    });
    const data = await res.json();
    if (!data || !data.ok || !Array.isArray(data.hp)) return;

    const parsed: HpStateRow[] = data.hp
      .map((r: any) => {
        const id = normId(r?.studentId);
        if (!id) return null;

        const baseHP = Math.min(
          MAX_HP,
          Math.max(1, Math.round(toNumber(r?.baseHP, MAX_HP)))
        );
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
  }, []);

  usePolling(pageActive, HP_POLL_MS, refreshOnce, HP_JITTER_MS);

  const hpById = useMemo(() => {
    const m = new Map<string, HpStateRow>();
    for (const r of hpRows)
      m.set(normId(r.studentId), { ...r, studentId: normId(r.studentId) });
    return m;
  }, [hpRows]);

  const getDisplayHp = useCallback(
    (studentIdRaw: string): HpStateRow => {
      const id = normId(studentIdRaw);
      const p = pendingRef.current.get(id);
      if (p) return { studentId: id, baseHP: p.base, currentHP: p.expected };

      const fromApi = hpById.get(id);
      if (fromApi) return fromApi;

      return { studentId: id, baseHP: MAX_HP, currentHP: MAX_HP };
    },
    [hpById]
  );

  const applyOptimisticHp = useCallback(
    (studentIdRaw: string, nextHp: HpStateRow) => {
      const id = normId(studentIdRaw);
      pendingRef.current.set(id, {
        expected: nextHp.currentHP,
        base: nextHp.baseHP,
        ts: Date.now(),
      });

      setHpRows((prev) => {
        const next = prev.slice();
        const idx = next.findIndex((r) => normId(r.studentId) === id);
        if (idx >= 0) next[idx] = nextHp;
        else next.push(nextHp);
        return next;
      });
    },
    []
  );

  const clearPending = useCallback((studentIdRaw: string) => {
    pendingRef.current.delete(normId(studentIdRaw));
  }, []);

  return { hpRows, getDisplayHp, applyOptimisticHp, clearPending, refreshOnce };
}
