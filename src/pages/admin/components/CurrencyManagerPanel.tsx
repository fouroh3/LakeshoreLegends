// src/pages/admin/components/CurrencyManagerPanel.tsx

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Student } from "../../../types";
import {
  adminCurrencySnapshot,
  type AdminCurrencyAdjustmentResult,
  type AdminCurrencyRow,
} from "../adminApi";
import {
  ADMIN_GUILDS,
  type AdminCurrency,
  type AdminCurrencyMode,
} from "../adminConstants";
import {
  clean,
  fullName,
  normId,
  studentSort,
} from "../adminRosterUtils";

function FieldLabel({ children }: { children: string }) {
  return (
    <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
      {children}
    </label>
  );
}

function InfoPill({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-100/80">
      {children}
    </span>
  );
}

type Props = {
  students: Student[];
  busy: boolean;
  onAdjust: (args: {
    studentIds: string[];
    currency: AdminCurrency;
    mode: AdminCurrencyMode;
    amount: number;
    reason: string;
  }) => Promise<AdminCurrencyAdjustmentResult>;
};

function rowsToMap(rows: AdminCurrencyRow[]) {
  const map = new Map<string, AdminCurrencyRow>();

  rows.forEach((row) => {
    const studentId = normId(row.studentId);
    if (!studentId) return;

    map.set(studentId, {
      studentId,
      xp: Number(row.xp ?? 0),
      skillTokens: Number(row.skillTokens ?? 0),
    });
  });

  return map;
}

export default function CurrencyManagerPanel({
  students,
  busy,
  onAdjust,
}: Props) {
  const [balances, setBalances] = useState<Map<string, AdminCurrencyRow>>(
    new Map()
  );
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceError, setBalanceError] = useState("");

  const [homeroomFilter, setHomeroomFilter] = useState("ALL");
  const [guildFilter, setGuildFilter] = useState("ALL");
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [currency, setCurrency] = useState<AdminCurrency>("XP");
  const [mode, setMode] = useState<AdminCurrencyMode>("ADD");
  const [amountText, setAmountText] = useState("5");
  const [reason, setReason] = useState("");

  const loadBalances = async () => {
    setBalanceLoading(true);
    setBalanceError("");

    try {
      const result = await adminCurrencySnapshot();
      setBalances(rowsToMap(Array.isArray(result.rows) ? result.rows : []));
    } catch (err: any) {
      setBalanceError(err?.message || "Failed to load currency balances.");
    } finally {
      setBalanceLoading(false);
    }
  };

  useEffect(() => {
    loadBalances();
  }, []);

  const homerooms = useMemo(() => {
    const set = new Set<string>();

    students.forEach((student) => {
      const homeroom = clean(student.homeroom);
      if (homeroom) set.add(homeroom);
    });

    return Array.from(set).sort((a, b) =>
      a.localeCompare(b, "en", { numeric: true })
    );
  }, [students]);

  const visibleStudents = useMemo(() => {
    const q = query.trim().toLowerCase();

    return students
      .filter(
        (student) =>
          homeroomFilter === "ALL" ||
          clean(student.homeroom) === homeroomFilter
      )
      .filter((student) => {
        const guild = clean(student.guild);

        if (guildFilter === "ALL") return true;
        if (guildFilter === "UNASSIGNED") return !guild;
        return guild === guildFilter;
      })
      .filter((student) => {
        if (!q) return true;

        return (
          fullName(student).toLowerCase().includes(q) ||
          normId(student.id).toLowerCase().includes(q) ||
          clean(student.guild).toLowerCase().includes(q)
        );
      })
      .slice()
      .sort(studentSort);
  }, [students, homeroomFilter, guildFilter, query]);

  const selectedCount = selectedIds.length;
  const amount = Math.max(0, Math.floor(Number(amountText) || 0));
  const currencyLabel = currency === "XP" ? "XP" : "Skill Tokens";
  const modeLabel = mode === "ADD" ? "Add" : "Remove";

  const toggleStudent = (studentId: string) => {
    setSelectedIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const toggleVisibleStudents = () => {
    const visibleIds = visibleStudents
      .map((student) => normId(student.id))
      .filter(Boolean);

    const allSelected =
      visibleIds.length > 0 &&
      visibleIds.every((id) => selectedIds.includes(id));

    setSelectedIds((prev) => {
      if (allSelected) {
        return prev.filter((id) => !visibleIds.includes(id));
      }

      return Array.from(new Set([...prev, ...visibleIds]));
    });
  };

  const handleAdjust = async () => {
    if (!selectedIds.length || amount < 1 || !reason.trim()) return;

    const confirmed = window.confirm(
      `${modeLabel} ${amount} ${currencyLabel} ${
        mode === "ADD" ? "to" : "from"
      } ${selectedIds.length} student${selectedIds.length === 1 ? "" : "s"}?`
    );

    if (!confirmed) return;

    try {
      const result = await onAdjust({
        studentIds: selectedIds,
        currency,
        mode,
        amount,
        reason: reason.trim(),
      });

      if (Array.isArray(result.results)) {
        setBalances((prev) => {
          const next = new Map(prev);

          result.results?.forEach((row) => {
            const studentId = normId(row.studentId);
            const current = next.get(studentId) ?? {
              studentId,
              xp: 0,
              skillTokens: 0,
            };

            next.set(studentId, {
              ...current,
              ...(currency === "XP"
                ? { xp: Number(row.after ?? 0) }
                : { skillTokens: Number(row.after ?? 0) }),
            });
          });

          return next;
        });
      } else {
        await loadBalances();
      }

      setSelectedIds([]);
      setReason("");
    } catch {
      // Parent shows the write error. Keep selection/reason so the teacher can retry.
    }
  };

  return (
    <div className="space-y-5">
      {balanceError && (
        <div className="rounded-2xl border border-amber-300/20 bg-amber-950/25 px-4 py-3 text-sm text-amber-100">
          {balanceError}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <FieldLabel>Homeroom</FieldLabel>
          <select
            value={homeroomFilter}
            onChange={(event) => {
              setHomeroomFilter(event.target.value);
              setSelectedIds([]);
            }}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none"
          >
            <option value="ALL">All Homerooms</option>
            {homerooms.map((homeroom) => (
              <option key={homeroom} value={homeroom}>
                {homeroom}
              </option>
            ))}
          </select>
        </div>

        <div>
          <FieldLabel>Guild</FieldLabel>
          <select
            value={guildFilter}
            onChange={(event) => {
              setGuildFilter(event.target.value);
              setSelectedIds([]);
            }}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none"
          >
            <option value="ALL">All Guilds</option>
            <option value="UNASSIGNED">Unassigned</option>
            {ADMIN_GUILDS.map((guild) => (
              <option key={guild} value={guild}>
                {guild}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <FieldLabel>Search</FieldLabel>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name, student ID, or guild"
            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none placeholder:text-zinc-600"
          />
        </div>
      </div>

      <div className="rounded-[24px] border border-white/10 bg-black/25 p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_180px_2fr_auto] xl:items-end">
          <div>
            <FieldLabel>Currency</FieldLabel>
            <select
              value={currency}
              onChange={(event) =>
                setCurrency(event.target.value as AdminCurrency)
              }
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none"
            >
              <option value="XP">XP</option>
              <option value="SKILL_TOKENS">Skill Tokens</option>
            </select>
          </div>

          <div>
            <FieldLabel>Action</FieldLabel>
            <select
              value={mode}
              onChange={(event) =>
                setMode(event.target.value as AdminCurrencyMode)
              }
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none"
            >
              <option value="ADD">Add</option>
              <option value="REMOVE">Remove</option>
            </select>
          </div>

          <div>
            <FieldLabel>Amount</FieldLabel>
            <input
              type="number"
              min={1}
              step={1}
              value={amountText}
              onChange={(event) => setAmountText(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none"
            />
          </div>

          <div>
            <FieldLabel>Reason / note</FieldLabel>
            <input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Quest reward, correction, event prize..."
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none placeholder:text-zinc-600"
            />
          </div>

          <button
            type="button"
            onClick={handleAdjust}
            disabled={
              busy ||
              selectedCount === 0 ||
              amount < 1 ||
              !reason.trim()
            }
            className={[
              "rounded-2xl px-4 py-3 text-sm font-black uppercase tracking-[0.14em] transition disabled:cursor-not-allowed disabled:opacity-50",
              mode === "ADD"
                ? "bg-emerald-300 text-zinc-950 hover:bg-emerald-200"
                : "bg-amber-300 text-zinc-950 hover:bg-amber-200",
            ].join(" ")}
          >
            {busy
              ? "Working..."
              : `${modeLabel} ${currencyLabel}`}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <InfoPill>{selectedCount} selected</InfoPill>
        <InfoPill>{visibleStudents.length} shown</InfoPill>
        <button
          type="button"
          onClick={toggleVisibleStudents}
          className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-zinc-200 hover:bg-white/[0.08]"
        >
          Select / Clear Visible
        </button>
        <button
          type="button"
          onClick={loadBalances}
          disabled={balanceLoading}
          className="rounded-2xl border border-white/10 bg-black/30 px-4 py-2 text-sm font-bold text-zinc-200 hover:bg-white/[0.06] disabled:opacity-50"
        >
          {balanceLoading ? "Loading balances..." : "Refresh Balances"}
        </button>
      </div>

      <div className="max-h-[650px] overflow-auto rounded-2xl border border-white/10 bg-black/25">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="sticky top-0 bg-zinc-950 text-[11px] uppercase tracking-[0.16em] text-zinc-500">
            <tr>
              <th className="w-12 px-3 py-2">Pick</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Student ID</th>
              <th className="px-3 py-2">Homeroom</th>
              <th className="px-3 py-2">Guild</th>
              <th className="px-3 py-2 text-right">XP</th>
              <th className="px-3 py-2 text-right">Skill Tokens</th>
            </tr>
          </thead>
          <tbody>
            {visibleStudents.map((student) => {
              const studentId = normId(student.id);
              const checked = selectedIds.includes(studentId);
              const balance = balances.get(studentId);

              return (
                <tr
                  key={studentId}
                  className="border-t border-white/5 hover:bg-white/[0.03]"
                >
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleStudent(studentId)}
                      className="h-4 w-4 accent-cyan-300"
                    />
                  </td>
                  <td className="px-3 py-2 font-semibold text-white">
                    {fullName(student) || "Unnamed Legend"}
                  </td>
                  <td className="px-3 py-2 font-mono text-cyan-100/90">
                    {studentId || "—"}
                  </td>
                  <td className="px-3 py-2 text-zinc-300">
                    {clean(student.homeroom) || "—"}
                  </td>
                  <td className="px-3 py-2 text-zinc-300">
                    {clean(student.guild) || "Unassigned"}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-zinc-200">
                    {balance ? balance.xp : balanceLoading ? "…" : "0"}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-zinc-200">
                    {balance ? balance.skillTokens : balanceLoading ? "…" : "0"}
                  </td>
                </tr>
              );
            })}

            {visibleStudents.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-zinc-500">
                  No students match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
