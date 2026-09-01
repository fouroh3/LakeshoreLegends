// src/pages/admin/components/InventoryManagerPanel.tsx

import { useEffect, useMemo, useState } from "react";
import type { Student } from "../../../types";
import type { InventoryCard } from "../../../types/inventory";
import { allInventoryCards } from "../../../data/itemLibrary";
import {
  adminInventorySnapshot,
  type AdminInventoryAdjustmentResult,
  type AdminInventoryRow,
} from "../adminApi";
import {
  ADMIN_GUILDS,
  type AdminInventoryMode,
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

function storageKey(card: InventoryCard) {
  const id = String(card.id || "").trim();
  const type = String(card.type || "").trim().toLowerCase();

  if (type === "fate" && id.toLowerCase().startsWith("fate_")) {
    return id;
  }

  return type && id ? `${type}_${id}` : id;
}

function inventoryRowsToMap(rows: AdminInventoryRow[]) {
  const map = new Map<string, string[]>();

  rows.forEach((row) => {
    const studentId = normId(row.studentId);
    if (!studentId) return;

    map.set(
      studentId,
      Array.isArray(row.inventory)
        ? row.inventory.map((item) => String(item || "").trim()).filter(Boolean)
        : []
    );
  });

  return map;
}

type Props = {
  students: Student[];
  busy: boolean;
  onAdjust: (args: {
    studentIds: string[];
    mode: AdminInventoryMode;
    cardKey: string;
    cardName: string;
    quantity: number;
    reason: string;
  }) => Promise<AdminInventoryAdjustmentResult>;
};

export default function InventoryManagerPanel({
  students,
  busy,
  onAdjust,
}: Props) {
  const [inventories, setInventories] = useState<Map<string, string[]>>(new Map());
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventoryError, setInventoryError] = useState("");

  const [homeroomFilter, setHomeroomFilter] = useState("ALL");
  const [guildFilter, setGuildFilter] = useState("ALL");
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const cards = useMemo(
    () =>
      [...allInventoryCards].sort((a, b) => {
        const typeCompare = String(a.type || "").localeCompare(String(b.type || ""));
        return typeCompare || String(a.name || "").localeCompare(String(b.name || ""));
      }),
    []
  );

  const cardByKey = useMemo(() => {
    const map = new Map<string, InventoryCard>();

    cards.forEach((card) => {
      const key = storageKey(card);
      if (key) map.set(key.toLowerCase(), card);
      if (card.id) map.set(String(card.id).toLowerCase(), card);
    });

    return map;
  }, [cards]);

  const [cardKey, setCardKey] = useState(() =>
    cards.length ? storageKey(cards[0]) : ""
  );
  const [mode, setMode] = useState<AdminInventoryMode>("GIVE");
  const [quantityText, setQuantityText] = useState("1");
  const [reason, setReason] = useState("");

  const loadInventories = async () => {
    setInventoryLoading(true);
    setInventoryError("");

    try {
      const result = await adminInventorySnapshot();
      setInventories(
        inventoryRowsToMap(Array.isArray(result.rows) ? result.rows : [])
      );
    } catch (err: any) {
      setInventoryError(err?.message || "Failed to load student inventory.");
    } finally {
      setInventoryLoading(false);
    }
  };

  useEffect(() => {
    loadInventories();
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
          homeroomFilter === "ALL" || clean(student.homeroom) === homeroomFilter
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

  const selectedCard = cards.find((card) => storageKey(card) === cardKey) || null;
  const quantity = Math.max(0, Math.floor(Number(quantityText) || 0));

  const toggleStudent = (studentId: string) => {
    setSelectedIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const toggleVisible = () => {
    const visibleIds = visibleStudents.map((student) => normId(student.id)).filter(Boolean);
    const allSelected =
      visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));

    setSelectedIds((prev) =>
      allSelected
        ? prev.filter((id) => !visibleIds.includes(id))
        : Array.from(new Set([...prev, ...visibleIds]))
    );
  };

  const handleAdjust = async () => {
    if (
      !selectedIds.length ||
      !selectedCard ||
      !cardKey ||
      quantity < 1 ||
      !reason.trim()
    ) {
      return;
    }

    const verb = mode === "GIVE" ? "Give" : "Remove";
    const confirmed = window.confirm(
      `${verb} ${quantity} × ${selectedCard.name} ${
        mode === "GIVE" ? "to" : "from"
      } ${selectedIds.length} student${selectedIds.length === 1 ? "" : "s"}?`
    );

    if (!confirmed) return;

    try {
      await onAdjust({
        studentIds: selectedIds,
        mode,
        cardKey,
        cardName: selectedCard.name,
        quantity,
        reason: reason.trim(),
      });

      await loadInventories();

      setSelectedIds([]);
      setReason("");
    } catch {
      // Parent displays the write error; retain the teacher's selection for retry.
    }
  };

  const inventoryLabel = (studentId: string) => {
    const raw = inventories.get(studentId) || [];
    if (!raw.length) return "Empty";

    const names = raw.map((key) => {
      const card = cardByKey.get(String(key).toLowerCase());
      return card?.name || key;
    });

    if (names.length <= 3) return names.join(", ");
    return `${names.slice(0, 3).join(", ")} +${names.length - 3}`;
  };

  return (
    <div className="space-y-5">
      {inventoryError && (
        <div className="rounded-2xl border border-amber-300/20 bg-amber-950/25 px-4 py-3 text-sm text-amber-100">
          {inventoryError}
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
              <option key={homeroom} value={homeroom}>{homeroom}</option>
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
              <option key={guild} value={guild}>{guild}</option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <FieldLabel>Search students</FieldLabel>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name, student ID, or guild"
            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none placeholder:text-zinc-600"
          />
        </div>
      </div>

      <div className="rounded-[24px] border border-white/10 bg-black/25 p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[2fr_1fr_120px_2fr_auto] xl:items-end">
          <div>
            <FieldLabel>Card</FieldLabel>
            <select
              value={cardKey}
              onChange={(event) => setCardKey(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none"
            >
              {cards.map((card) => {
                const key = storageKey(card);
                return (
                  <option key={key} value={key}>
                    {card.name} — {String(card.type || "card")}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <FieldLabel>Action</FieldLabel>
            <select
              value={mode}
              onChange={(event) => setMode(event.target.value as AdminInventoryMode)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none"
            >
              <option value="GIVE">Give</option>
              <option value="REMOVE">Remove</option>
            </select>
          </div>

          <div>
            <FieldLabel>Qty</FieldLabel>
            <input
              type="number"
              min={1}
              step={1}
              value={quantityText}
              onChange={(event) => setQuantityText(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none"
            />
          </div>

          <div>
            <FieldLabel>Reason / note</FieldLabel>
            <input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Quest reward, correction, consumed card..."
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none placeholder:text-zinc-600"
            />
          </div>

          <button
            type="button"
            onClick={handleAdjust}
            disabled={
              busy ||
              selectedIds.length === 0 ||
              !selectedCard ||
              quantity < 1 ||
              !reason.trim()
            }
            className={[
              "rounded-2xl px-4 py-3 text-sm font-black uppercase tracking-[0.14em] transition disabled:cursor-not-allowed disabled:opacity-50",
              mode === "GIVE"
                ? "bg-emerald-300 text-zinc-950 hover:bg-emerald-200"
                : "bg-red-300 text-zinc-950 hover:bg-red-200",
            ].join(" ")}
          >
            {mode === "GIVE" ? "Give Card" : "Remove Card"}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={toggleVisible}
          className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-zinc-200 hover:bg-white/[0.08]"
        >
          Select / Clear Visible
        </button>
        <button
          type="button"
          onClick={loadInventories}
          disabled={inventoryLoading}
          className="rounded-2xl border border-white/10 bg-black/30 px-4 py-2 text-sm font-bold text-zinc-200 hover:bg-white/[0.06] disabled:opacity-50"
        >
          {inventoryLoading ? "Refreshing..." : "Refresh Inventory"}
        </button>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-cyan-100/80">
          {selectedIds.length} selected
        </span>
      </div>

      <div className="max-h-[650px] overflow-auto rounded-2xl border border-white/10 bg-black/25">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="sticky top-0 bg-zinc-950 text-[11px] uppercase tracking-[0.16em] text-zinc-500">
            <tr>
              <th className="w-12 px-3 py-2">Pick</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Homeroom</th>
              <th className="px-3 py-2">Guild</th>
              <th className="px-3 py-2">Cards</th>
              <th className="px-3 py-2">Inventory</th>
            </tr>
          </thead>
          <tbody>
            {visibleStudents.map((student) => {
              const studentId = normId(student.id);
              const inventory = inventories.get(studentId) || [];
              return (
                <tr key={studentId} className="border-t border-white/5 hover:bg-white/[0.03]">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(studentId)}
                      onChange={() => toggleStudent(studentId)}
                      className="h-4 w-4 accent-cyan-300"
                    />
                  </td>
                  <td className="px-3 py-2 font-semibold text-white">{fullName(student)}</td>
                  <td className="px-3 py-2 text-zinc-300">{clean(student.homeroom)}</td>
                  <td className="px-3 py-2 text-zinc-300">{clean(student.guild) || "Unassigned"}</td>
                  <td className="px-3 py-2 font-mono text-cyan-100">{inventory.length}</td>
                  <td className="max-w-[520px] truncate px-3 py-2 text-zinc-400" title={inventoryLabel(studentId)}>
                    {inventoryLabel(studentId)}
                  </td>
                </tr>
              );
            })}
            {visibleStudents.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-zinc-500">
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
