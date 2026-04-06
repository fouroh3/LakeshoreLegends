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
    <div className="min-h-0 overflow-auto pr-1">
      <div className="flex items-center gap-2 mb-2 px-1 h-[22px]">
        <div className="text-[10px] uppercase tracking-widest text-zinc-500 truncate">
          Students ({activeHomeroom || "—"}) ·{" "}
          {guildFilter === "ALL" ? "All guilds" : `Guild: ${guildFilter}`}
        </div>
        <div className="flex-1" />
      </div>

      <div className="mb-2 border-t border-zinc-900/60" />

      <div className="grid gap-2 grid-cols-2 md:grid-cols-4 auto-rows-fr">
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
    </div>
  );
}
