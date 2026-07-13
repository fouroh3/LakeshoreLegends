// src/pages/battle/components/BattleStudentGrid.tsx
import { useMemo } from "react";
import type { Student, Guild } from "../../../types";
import type { HpStateRow } from "../battleTypes";
import BattleStudentCard from "./BattleStudentCard";
import { fullName, normId } from "../battleUtils";

export type BattleStudentGridProps = {
  activeHomeroom: string;
  guildFilter: Guild | "ALL";
  students: Student[];
  selectedIds: string[];
  toggleSelect: (id: string) => void;
  getDisplayHp: (studentId: string) => HpStateRow;
  onOpenProfile: (student: Student) => void;
};

export default function BattleStudentGrid({
  activeHomeroom,
  guildFilter,
  students,
  selectedIds,
  toggleSelect,
  getDisplayHp,
  onOpenProfile,
}: BattleStudentGridProps) {
  const selectedSet = useMemo(
    () => new Set(selectedIds.map(normId)),
    [selectedIds]
  );

  const visible = useMemo(() => {
    return students
      .slice()
      .sort((a, b) => fullName(a).localeCompare(fullName(b)));
  }, [students]);

  return (
    <section className="min-h-0 overflow-auto rounded-[22px] border border-zinc-800/70 bg-zinc-950/35 p-3 shadow-[0_14px_34px_rgba(0,0,0,0.22)]">
      <div className="mb-3 flex items-center gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300/75">
            Student Roster
          </div>
          <div className="mt-0.5 truncate text-sm font-black text-white">
            {activeHomeroom || "—"} · {guildFilter === "ALL" ? "All guilds" : guildFilter}
          </div>
        </div>
        <div className="flex-1" />
        <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-black text-zinc-300">
          {visible.length} shown
        </div>
      </div>

      <div className="grid auto-rows-fr grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
        {visible.map((s) => {
          const id = normId(s.id);
          const hp = getDisplayHp(id);
          const isSelected = selectedSet.has(id);

          return (
            <BattleStudentCard
              key={id}
              student={s}
              hp={hp}
              selected={isSelected}
              onToggle={() => toggleSelect(id)}
              onOpenProfile={onOpenProfile}
            />
          );
        })}
      </div>
    </section>
  );
}
